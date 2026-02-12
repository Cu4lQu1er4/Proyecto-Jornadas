import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
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
    return {
      userId: payload.sub,
      role: payload.role,
    };
  }
}