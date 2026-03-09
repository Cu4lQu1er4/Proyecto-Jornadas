import { 
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

type KioskPayload = {
  scope: "KIOSK";
  sub: string;
};

@Injectable()
export class KioskAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();

    const auth = req.headers["authorization"];
    if (!auth || typeof auth !== "string" || !auth.startsWith("Bearer ")) {
      throw new UnauthorizedException({ code: "KIOSK_TOKEN_REQUIRED" });
    }

    const token = auth.slice("Bearer ".length).trim();
    if (!token) throw new UnauthorizedException({ code: "KIOSK_TOKEN_REQUIRED" });

    try {
      const payload = this.jwt.verify<KioskPayload>(token);

      if (payload.scope !== "KIOSK" || !payload.sub) {
        throw new UnauthorizedException({ code: "KIOSK_TOKEN_INVALID" });
      }

      req.kiosk = { employeeId: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException({ code: "KIOSK_TOKEN_INVALID" });
    }
  }
}