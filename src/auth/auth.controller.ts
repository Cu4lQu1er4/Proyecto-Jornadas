import { Controller, Post, Body, HttpException, HttpStatus } from "@nestjs/common";
import { Login } from "./application/login";
import { Public } from "./public.decorator";
import { JwtService } from "@nestjs/jwt";

@Controller('auth')
export class AuthController {
  constructor(
    private readonly login: Login,
    private readonly jwtService: JwtService,
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
}