export interface RefreshTokenData {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export abstract class IRefreshTokenRepository {
  abstract create(params: {
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<void>;

  abstract findByToken(token: string): Promise<RefreshTokenData | null>;

  /** Rotate: delete the consumed token. */
  abstract deleteByToken(token: string): Promise<void>;

  /** Called on logout — invalidates all sessions for this user. */
  abstract deleteByUserId(userId: string): Promise<void>;
}
