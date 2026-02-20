import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          if (req.cookies?.access_token) {
            return req.cookies.access_token;
          }

          const auth = req.headers.authorization;
          if (auth && auth.startsWith('Bearer ')) {
            return auth.substring(7);
          }

          return null;
        },
      ]),
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException("Usuario no existe");
    }

    if (!user.active) {
      throw new ForbiddenException({
        code: "USER_DISABLED",
        message: "Usuario desactivado por administrador",
      });
    }

    return {
      userId: user.id,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };
  }
}