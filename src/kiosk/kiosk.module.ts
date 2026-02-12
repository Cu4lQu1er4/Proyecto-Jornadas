import { Module } from "@nestjs/common";
import { KioskController } from "./kiosk.controller";
import { AuthModule } from "src/auth/auth.module";
import { WorkModule } from "src/work/work.module";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    AuthModule,
    WorkModule,
    JwtModule,
  ],
  controllers: [KioskController],
})

export class KioskModule {}