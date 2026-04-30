export class UserEntity {
  constructor(
    readonly id: string,
    readonly email: string,
    readonly passwordHash: string,
    readonly fullName: string,
    readonly createdAt: Date,
    readonly failedLoginAttempts: number = 0,
    readonly lockedUntil: Date | null = null,
  ) {}

  get isLocked(): boolean {
    return this.lockedUntil !== null && this.lockedUntil > new Date();
  }

  static create(params: {
    id: string;
    email: string;
    passwordHash: string;
    fullName: string;
    createdAt: Date;
    failedLoginAttempts?: number;
    lockedUntil?: Date | null;
  }): UserEntity {
    return new UserEntity(
      params.id,
      params.email,
      params.passwordHash,
      params.fullName,
      params.createdAt,
      params.failedLoginAttempts ?? 0,
      params.lockedUntil ?? null,
    );
  }
}
