export interface PasswordResetTokenData {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export abstract class IPasswordResetTokenRepository {
  abstract create(params: {
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<PasswordResetTokenData>;

  abstract findByToken(token: string): Promise<PasswordResetTokenData | null>;

  abstract markUsed(id: string): Promise<void>;

  abstract deleteByUserId(userId: string): Promise<void>;
}
