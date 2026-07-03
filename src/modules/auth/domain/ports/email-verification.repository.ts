export interface EmailVerificationChallenge {
  id: string;
  userId: string;
  email: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export abstract class IEmailVerificationRepository {
  abstract create(params: {
    userId: string;
    email: string;
    code: string;
    expiresAt: Date;
  }): Promise<EmailVerificationChallenge>;

  abstract findValid(
    email: string,
    code: string,
  ): Promise<EmailVerificationChallenge | null>;

  abstract markUsed(id: string): Promise<void>;
  abstract deleteByUserId(userId: string): Promise<void>;
}
