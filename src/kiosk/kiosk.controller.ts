import { 
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "src/prisma/prisma.service";
import { WorkService } from "src/work/work.service";
import { KioskAuthGuard } from "./kiosk-auth.guard";
import * as bcrypt from "bcrypt";
import { Public } from "src/auth/public.decorator";
import { PunchDto } from "./dto/punch.dto";
import { MarkType } from "src/work/domain/rules";

const MAX_PIN_ATTEMPS = 5;
const LOCK_MINUTES = 10;

@Controller("kiosk")
export class KioskController {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly workService: WorkService,
  ) {}

  @Public()
  @Post("auth")
  async auth(
    @Body() body: { document: string; pin: string }
  ) {
    const document = body.document?.trim();
    const pin = body.pin?.trim();

    if (!document || !pin) {
      throw new HttpException(
        { code: "MISSING_CREDENTIALS" },
        HttpStatus.BAD_REQUEST
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { document },
      select: {
        id: true,
        role: true,
        active: true,
        pinHash: true,
        pinLockedUntil: true,
        failedPinAttempts: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user || !["EMPLOYEE", "ADMIN"].includes(user.role)) {
      throw new HttpException(
        { code: "INVALID_CREDENTIALS" },
        HttpStatus.UNAUTHORIZED
      );
    }

    if (!user.active) {
      throw new HttpException(
        { code: "USER_INACTIVE" },
        HttpStatus.FORBIDDEN
      );
    }

    if (user.pinLockedUntil && user.pinLockedUntil.getTime() > Date.now()) {
      throw new HttpException(
        {
          code: "PIN_LOCKED",
          lockedUntil: user.pinLockedUntil.toISOString(),
        },
        HttpStatus.FORBIDDEN
      );
    }

    if (!user.pinHash) {
      throw new HttpException(
        { code: "PIN_NOT_SET" },
        HttpStatus.FORBIDDEN
      );
    }

    const ok = await bcrypt.compare(pin, user.pinHash);

    if (!ok) {
      const nextAttempts = (user.failedPinAttempts ?? 0) + 1;

      if (nextAttempts >= MAX_PIN_ATTEMPS) {
        const lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);

        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedPinAttempts: nextAttempts,
            pinLockedUntil: lockedUntil,
          },
        });

        throw new HttpException(
          {
            code: "PIN_LOCKED",
            lockedUntil: lockedUntil.toISOString(),
          },
          HttpStatus.FORBIDDEN
        );
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedPinAttempts: nextAttempts },
      });

      throw new HttpException(
        {
          code: "INVALID_CREDENTIALS",
          remainingAttempts: MAX_PIN_ATTEMPS - nextAttempts,
        },
        HttpStatus.UNAUTHORIZED
      );
    }

    if ((user.failedPinAttempts ?? 0) > 0 || user.pinLockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedPinAttempts: 0, pinLockedUntil: null },
      });
    }

    const kioskToken = this.jwt.sign(
      { scope: "KIOSK" },
      {
        subject: user.id,
        expiresIn: "5m",
      }
    );

    return {
      kioskToken,
      employee: {
        id: user.id,
        name:
          `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || document,
      },
      expiresInSeconds: 300,
    };
  }

  @UseGuards(KioskAuthGuard)
  @Get("status")
  async status(@Req() req: any) {
    const employeeId = req.kiosk.employeeId;
    return this.workService.workdayStatus(employeeId);
  }

  @UseGuards(KioskAuthGuard)
  @Post("start")
  async start(
    @Req() req: any,
    @Body() body: { timestamp?: string }
  ) {
    const employeeId = req.kiosk.employeeId;
    
    const now = body?.timestamp
      ? new Date(body.timestamp)
      : new Date();

    await this.workService.start(employeeId, now);
    return { status: "OK" };
  }

  @UseGuards(KioskAuthGuard)
  @Post("end")
  async end(
    @Req() req: any,
    @Body() body: { timestamp?: string }
  ) {
    const employeeId = req.kiosk.employeeId;

    const now = body?.timestamp 
      ? new Date(body.timestamp)
      : new Date();

    const result = await this.workService.end(employeeId, now);

    return {
      status: "OK",
      workedMinutes: result.workedMinutes,
      expectedMinutes: result.expectedMinutes,
      deltaMinutes: result.deltaMinutes,
    };
  }

  @Public()
  @Get("employees")
  async employees() {
    const employees = await this.prisma.user.findMany({
      where: {
        role: { in: ["EMPLOYEE", "ADMIN"] },
        active: true,
      },
      select: {
        id: true,
        document: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    return employees.map(u => ({
      id: u.id,
      document: u.document,
      name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
      role: u.role,
    }));
  }

  @Public()
  @Post("punch")
  async punch(@Body() body: PunchDto) {
    const { employeeId, type, timestamp } = body;

    const date = new Date(timestamp);

    const employee = await this.prisma.user.findUnique({
      where: { id: employeeId },
      select: { id: true, active: true }
    });

    if (!employee || !employee.active) {
      throw new HttpException(
        { code: "EMPLOYEE_INVALID" },
        HttpStatus.BAD_REQUEST
      );
    }

    if (type === "start") {
      await this.workService.start(employeeId, date);
    }

    if (type === "end") {
      await this.workService.end(employeeId, date);
    }

    return { status: "OK" };
  }

  @UseGuards(KioskAuthGuard)
  @Post("mark")
  async mark(
    @Req() req: any,
    @Body() body: { type: string }
  ) {

    console.log("HEADERS:", req.headers);
    const client = req.headers['x-client'];

    if (client !== 'kiosk') {
      throw new HttpException(
        { code: 'KIOSK_ONLY' },
        HttpStatus.FORBIDDEN
      );
    }

    const employeeId = req.kiosk.employeeId;

    try {
      await this.workService.mark(employeeId, body.type as MarkType);

      return { status: "OK" };
    } catch (e) {
      throw new HttpException(
        { message: e.message },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @UseGuards(KioskAuthGuard)
  @Get("next-actions")
  async nextActions(@Req() req: any) {
    const employeeId = req.kiosk.employeeId;

    return this.workService.getNextActions(employeeId);
  }
}