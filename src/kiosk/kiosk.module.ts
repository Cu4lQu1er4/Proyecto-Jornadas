import { Module } from "@nestjs/common";
import { KioskController } from "./kiosk.controller";
import { AuthModule } from "src/auth/auth.module";
import { WorkModule } from "src/work/work.module";

@Module({
  imports: [
    AuthModule,
    WorkModule,
  ],
  controllers: [KioskController],
})

export class KioskModule {}