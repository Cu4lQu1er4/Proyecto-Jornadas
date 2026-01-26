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
} from "@nestjs/common";
import { Login } from "./application/login";
import { Public } from "./public.decorator";
import { JwtService } from "@nestjs/jwt";
import { Roles } from "./roles.decorator";
import { Role } from "./roles.enum";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RolesGuard } from "./roles.guard";
import { ListEmployees } from "./application/list.employees";
import { DeactivateEmployee } from "./application/deactivate-employee";

@Controller('auth')
export class AuthController {
  constructor(
    private readonly login: Login,
    private readonly jwtService: JwtService,
    private readonly listEmployees: ListEmployees,
    private readonly deactivateEmployee: DeactivateEmployee,
  ) {}

  @Public()
  @Post('login')
  async loginHandler(
    @Body() body: { document: string; password: string }
  ) {
    try {
      const user = await this.login.execute({
        document: body.document,
        password: body.password,
      });

      const payload = {
        sub: user.id,
        role: user.role,
      };

      const accessToken = this.jwtService.sign(payload);

      return {
        accessToken,
      };
    } catch (e) {
      throw new HttpException(
        "Credenciales invalidas",
        HttpStatus.UNAUTHORIZED
      );
    }
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
}