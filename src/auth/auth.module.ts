import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { Login } from "./application/login";
import { JwtModule } from "@nestjs/jwt";
import { PrismaService } from "src/prisma/prisma.service";
import { JwtStrategy } from "./jwt.strategy";
import { USER_REPO } from "./domain/user.repo";
import { UserRepoDb } from "./infrastructure/user.repo.db";
import { PASSWORD_HASHER } from "./domain/password";
import { BcryptPasswordHasher } from "./infrastructure/bcrypt.hasher";
import { DeactivateEmployee } from "./application/deactivate-employee";
import { ListEmployees } from "./application/list.employees";
import { WorkModule } from "src/work/work.module";
import { AuthService } from "./application/auth.service";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        global: true,
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: "10h" },
      }),
    }),
    WorkModule,
  ],
  controllers: [AuthController],
  providers: [
    Login,
    PrismaService,
    JwtStrategy,
    ListEmployees,
    DeactivateEmployee,
    AuthService,
    {
      provide: USER_REPO,
      useClass: UserRepoDb,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher,
    },
  ],
  exports: [AuthService],
})
export class AuthMocule {}