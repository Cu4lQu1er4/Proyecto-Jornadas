import { AuthService } from "./auth.service";
import { JwtService } from "@nestjs/jwt";
import { Role } from "../roles.enum";

export interface LoginResult {
  accessToken: string;
  user: {
    id: string;
    document: string;
    role: Role;
  };
}

export class LoginService {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  async execute(
    document: string,
    password: string,
  ): Promise<LoginResult | null> {
    const user = await this.authService.validateUser(document, password);
    if (!user) return null;

    const payload = {
      sub: user.id,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        document: user.document,
        role: user.role,
      },
    };
  }
}