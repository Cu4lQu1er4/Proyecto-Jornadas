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
import { ChangePasswordDto, ChangePinDto, UpdateProfileDto } from "./dto/uodate-profile.dto";
import { AuthService } from "./application/auth.service";

@Controller('auth')
export class AuthController {
  constructor(
    private readonly login: Login,
    private readonly jwtService: JwtService,
    private readonly listEmployees: ListEmployees,
    private readonly deactivateEmployee: DeactivateEmployee,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
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

      const accessToken = this.jwtService.sign(payload, {
        expiresIn; "15m",
      });

      const refreshToken = this.jwtService.sign(
        { sub: user.id },
        { expiresIn: "30d" }
      );

      const needsOnboarding =
        !user.firstName ||
        !user.lastName ||
        !user.pinHash;

      const isProd = process.env.NODE_ENV === "production";

      res.cookie('access_token', accessToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProd,
        domain: isProd ? '.nerpelsas.com' : 'localhost',
        path: '/',
        maxAge: 1000 * 60 * 15,
      });

      res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: isProd,
        domain: isProd ? ".nerpelsas.com" : "localhost",
        path: "/",
        maxAge: 1000 * 60 * 60 * 24 * 30,
      });

      return {
        accessToken,
        employee: {
          id: user.id,
          document: user.document,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        needsOnboarding,
      };
    } catch (error) {
        console.error(error);
        throw new HttpException(
          'Credenciales invalidas',
          HttpStatus.UNAUTHORIZED
        );
    }
  }

  @Post("refresh")
  @Public()
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies["refresh_token"];

    if (!refreshToken) {
      throw new UnauthorizedException("No refresh token");
    }

    const payload = await this.jwtService.verifyAsync(refreshToken);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true }
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const accessToken = this.jwtService.sign(
      { sub: user.id, role: user.role },
      { expiresIn: "15m" }
    );

    res.cookie("access_token", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      domain: ".nerpelsas.com",
      path: "/",
      maxAge: 1000 * 60 * 15,
    });

    return { ok: true };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    const isProd = process.env.NODE_ENV === "production";

    res.clearCookie('access_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      domain: isProd ? '.nerpelsas.com' : 'localhost',
      path: '/',
    });

    res.clearCookie("refresh_token", {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      domain: isProd ? ".nerpelsas.com" : "localhost",
      path: "/",
    });

    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request) {
    if (!req.user || !(req.user as any).userId) {
      throw new UnauthorizedException("Usuario no autenticado");
    }

    const userId = (req.user as any).userId;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        document: true,
        role: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        pinHash: true,
      },
    });

    if (!user) throw new UnauthorizedException("Usuario no autenticado");

    const { pinHash, ...safe } = user;
    return {
      ...safe,
      hasPin: !!pinHash,
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
    const userId = req.user.userId;

    if (!/^\d{4}$/.test(body.pin)) {
      throw new BadRequestException("PIN debe ser de 4 digitos");
    }

    if (["0000", "1111", "1234", "2222", "3333"].includes(body.pin)) {
      throw new BadRequestException("PIN demasiado inseguro");
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

    if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
      throw new UnauthorizedException("PIN temporalmente bloqueado");
    }

    const valid = await bcrypt.compare(body.pin, user.pinHash);

    if (!valid) {
      const attempts = user.failedPinAttempts + 1;

      const updateData: any = {
        failedPinAttempts: attempts,
      };

      if (attempts >= 3) {
        updateData.pinLockedUntil = new Date(Date.now() + 5 * 60 * 1000);
        updateData.failedPinAttempts = 0;
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      throw new UnauthorizedException("Credenciales invalidas");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedPinAttempts: 0,
        pinLockedUntil: null,
      },
    });

    const token = this.jwtService.sign({
      sub: user.id,
      role: user.role,
    });

    res.cookie("access_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 10
    });

    return { success: true };
  }

  @Patch("profile")
  @UseGuards(JwtAuthGuard)
  updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.userId, dto);
  }

  @Patch("change-password")
  @UseGuards(JwtAuthGuard)
  changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.userId, dto);
  }

  @Patch("change-pin")
  @UseGuards(JwtAuthGuard) 
  changePin(@Req() req: any, @Body() dto: ChangePinDto){
    return this.authService.changePin(req.user.userId, dto);
  }

  @Patch("admin/:id/reset-password")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async adminResetPassword(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    return this.authService.adminResetPassword(
      id,
      req.user.userId,
    );
  }

  @Patch("admin/:id/reset-pin")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async adminResetPin(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    return this.authService.adminResetPin(
      id,
      req.user.userId,
    );
  }
}