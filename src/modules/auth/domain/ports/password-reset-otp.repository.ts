export interface OtpRecord {
  id: string;
  userId: string;
  email: string;
  code: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export abstract class IPasswordResetOtpRepository {
  abstract create(params: { userId: string; email: string; code: string; expiresAt: Date }): Promise<OtpRecord>;
  abstract findValid(email: string, code: string): Promise<OtpRecord | null>;
  abstract markUsed(id: string): Promise<void>;
  abstract deleteByUserId(userId: string): Promise<void>;
}
