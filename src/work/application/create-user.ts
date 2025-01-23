import { UserRepo } from '../../auth/domain/user.repo';
import { PasswordHasher } from '../../auth/domain/password';
import { Role } from '../domain/role';
import { User } from '../../auth/domain/user';

export interface CreateUserCmd {
  document: string;
  password: string;
  role: Role;
}

export class CreateUser {
  constructor(
    private readonly repo: UserRepo,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(cmd: CreateUserCmd): Promise<User> {
    const passwordHash = await this.hasher.hash(cmd.password);

    return this.repo.create({
      document: cmd.document,
      passwordHash,
      role: cmd.role,
    });
  }
}
