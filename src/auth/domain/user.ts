import { Role } from "../roles.enum";

export interface User {
  id: string;
  document: string;
  passwordHash: string;
  role: Role;
  active: boolean;
  createdAt: Date;
  firstName: string | null;
  lastName: string | null;
  pinHash: string | null;
  failedPinAttempts: number;
  pinLockedUntil: Date | null;
}
