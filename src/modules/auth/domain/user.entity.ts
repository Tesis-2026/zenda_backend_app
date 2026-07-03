export class UserEntity {
  constructor(
    readonly id: string,
    readonly email: string,
    readonly passwordHash: string,
    readonly fullName: string,
    readonly createdAt: Date,
    readonly emailVerifiedAt: Date | null = null,
    readonly failedLoginAttempts: number = 0,
    readonly lockedUntil: Date | null = null,
    readonly tokenVersion: number = 0,
    readonly consentGiven: boolean = false,
    readonly deletedAt: Date | null = null,
  ) {}

  get isLocked(): boolean {
    return this.lockedUntil !== null && this.lockedUntil > new Date();
  }

  get isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  get isEmailVerified(): boolean {
    return this.emailVerifiedAt !== null;
  }

  static create(params: {
    id: string;
    email: string;
    passwordHash: string;
    fullName: string;
    createdAt: Date;
    emailVerifiedAt?: Date | null;
    failedLoginAttempts?: number;
    lockedUntil?: Date | null;
    tokenVersion?: number;
    consentGiven?: boolean;
    deletedAt?: Date | null;
  }): UserEntity {
    return new UserEntity(
      params.id,
      params.email,
      params.passwordHash,
      params.fullName,
      params.createdAt,
      params.emailVerifiedAt ?? null,
      params.failedLoginAttempts ?? 0,
      params.lockedUntil ?? null,
      params.tokenVersion ?? 0,
      params.consentGiven ?? false,
      params.deletedAt ?? null,
    );
  }
}
