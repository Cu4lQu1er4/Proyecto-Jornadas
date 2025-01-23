import { Inject } from "@nestjs/common";
import type { UserRepo } from "../domain/user.repo";
import { USER_REPO } from "../domain/user.repo";
import type { PasswordHasher } from "../domain/password";
import { PASSWORD_HASHER } from "../domain/password";
import {
  InvalidCredentialsError,
  UserInactiveError,
} from "../../work/domain/errors";
import { User } from "../domain/user";

export interface LoginCmd {
  document: string;
  password: string;
}

export class Login {
  constructor(
    @Inject(USER_REPO)
    private readonly repo: UserRepo,

    @Inject(PASSWORD_HASHER)
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(cmd: LoginCmd): Promise<User> {
    console.log('LOGIN CMD DOCUMENT:', cmd.document);

    const user = await this.repo.findByDocument(cmd.document);
    console.log('USER FROM DB:', user);

    if (!user) {
      console.log('USER NOT FOUND');
      throw new InvalidCredentialsError();
    }

    const valid = await this.hasher.compare(cmd.password, user.passwordHash);

    if (!valid) {
      console.log('PASSWORD INVALID');
      throw new InvalidCredentialsError();
    }

    console.log('LOGIN OK');
    return user;
  }
}