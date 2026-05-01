import { UserEntity } from '../user.entity';

export abstract class IUserRepository {
  abstract findByEmail(email: string): Promise<UserEntity | null>;
  abstract findById(id: string): Promise<UserEntity | null>;
  abstract create(params: {
    email: string;
    passwordHash: string;
    fullName: string;
  }): Promise<UserEntity>;
  abstract updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
  abstract incrementFailedLogin(userId: string): Promise<void>;
  abstract clearFailedLogin(userId: string): Promise<void>;
  abstract lockAccount(userId: string, until: Date): Promise<void>;
}
