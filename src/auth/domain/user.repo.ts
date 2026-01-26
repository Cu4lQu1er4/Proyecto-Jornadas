import { User } from "./user";

export const USER_REPO = Symbol('USER_REPO');

export interface UserRepo {
  findByDocument(document: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  create(data: {
    document: string;
    passwordHash: string;
    role: string;
  }): Promise<User>;
  deactivate(id: string): Promise<void>;
}