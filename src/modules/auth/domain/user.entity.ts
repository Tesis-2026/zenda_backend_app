export class UserEntity {
  constructor(
    readonly id: string,
    readonly email: string,
    readonly passwordHash: string,
    readonly fullName: string,
    readonly createdAt: Date,
  ) {}

  static create(params: {
    id: string;
    email: string;
    passwordHash: string;
    fullName: string;
    createdAt: Date;
  }): UserEntity {
    return new UserEntity(
      params.id,
      params.email,
      params.passwordHash,
      params.fullName,
      params.createdAt,
    );
  }
}
