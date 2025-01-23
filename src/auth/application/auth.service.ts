import { UserRepo } from "../domain/user.repo";
import { User } from "../domain/user";
import * as bcrypt from "bcrypt";

export class AuthService {
  constructor(
    private readonly userRepo: UserRepo,
  ) {}

  async validateUser(
    document: string,
    password: string
  ): Promise<User | null> {
    const user = await this.userRepo.findByDocument(document);

    if (!user) return null;
    if (!user.active) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    return user;
  }
}