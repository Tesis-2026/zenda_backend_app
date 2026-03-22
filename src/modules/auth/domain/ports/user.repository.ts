import { UserEntity } from '../user.entity';

export abstract class IUserRepository {
  abstract findByEmail(email: string): Promise<UserEntity | null>;
  abstract create(params: {
    email: string;
    passwordHash: string;
    fullName: string;
  }): Promise<UserEntity>;
}
