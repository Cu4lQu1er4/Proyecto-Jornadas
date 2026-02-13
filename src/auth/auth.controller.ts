import { 
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Get,
  UseGuards,
  Patch,
  Param,
  Res,
  Req,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import type { Response, Request } from "express";
import { Login } from "./application/login";
import { Public } from "./public.decorator";
import { JwtService } from "@nestjs/jwt";
import { Roles } from "./roles.decorator";
import { Role } from "./roles.enum";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RolesGuard } from "./roles.guard";
import { ListEmployees } from "./application/list.employees";
import { DeactivateEmployee } from "./application/deactivate-employee";
import { PrismaService } from "src/prisma/prisma.service";
import * as bcrypt from "bcrypt";

@Controller('auth')
export class AuthController {
  constructor(
    private readonly login: Login,
    private readonly jwtService: JwtService,
    private readonly listEmployees: ListEmployees,
    private readonly deactivateEmployee: DeactivateEmployee,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('login')
  async loginHandler(
    @Body() body: { document: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const user = await this.login.execute(body);

      const payload = {
        sub: user.id,
        role: user.role,
      };

      const accessToken = this.jwtService.sign(payload);

      res.cookie('access_token', accessToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 1000 * 60 * 60 * 10,
      });

      return {
        accessToken,
        employee: {
          id: user.id,
          document: user.document,
          role: user.role,
        },
      };
    } catch {
      throw new HttpException(
        'Credenciales invalidas',
        HttpStatus.UNAUTHORIZED
      );
    }
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request) {
    const user = req.user!;

    return {
      id: user['sub'],
      role: user['role'],
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get("employees")
  async listEmployeesHandler() {
    return this.listEmployees.execute()
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch("employees/:id/deactivate")
  async deactivateEmployeeHabdler(@Param("id") id: string) {
    await this.deactivateEmployee.execute(id);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post("set-pin")
  async setPin(
    @Req() req: any,
    @Body() body: { pin: string }
  ) {
    const userId = req.user.sub;

    if (!/^\d{4}$/.test(body.pin)) {
      throw new BadRequestException("PIN debe ser de 4 digitos");
    }

    const hash = await bcrypt.hash(body.pin, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { pinHash: hash },
    });

    return { success: true };
  }

  @Post("kiosk-login")
  async kioskLogin(
    @Body() body: { document: string; pin: string },
    @Res({ passthrough: true }) res: Response
  ) {
    const user = await this.prisma.user.findUnique({
      where: { document: body.document },
    });

    if (!user || !user.pinHash) {
      throw new UnauthorizedException("Credenciales invalidas");
    }

    const valid = await bcrypt.compare(body.pin, user.pinHash);

    if (!valid) {
      throw new UnauthorizedException("Credenciales invalidas");
    }

    const token = this.jwtService.sign({
      sub: user.id,
      role: user.role,
    });

    res.cookie("access_token", token, {
      httpOnly: true,
    });

    return { success: true };
  }
}