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

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET!,
      signOptions: { expiresIn: "10h" },
    }),
  ],
  controllers: [AuthController],
  providers: [
    Login,
    PrismaService,
    JwtStrategy,

    {
      provide: USER_REPO,
      useClass: UserRepoDb,
    },

    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher,
    },
  ],
})
export class AuthModule {}
