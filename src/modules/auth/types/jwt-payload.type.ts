export type JwtPayload = {
  sub: string;
  email: string;
  /**
   * Monotonic per-user counter. Embedded so the strategy can reject
   * tokens minted before a global revoke (password reset, security
   * incident). Bumped via `IUserRepository.bumpTokenVersion(userId)`.
   */
  tokenVersion: number;
  /**
   * Snapshot of `user.consentGiven` at the time of signing. Lets
   * consent-aware endpoints skip a per-request DB hit. The strategy
   * also injects the live value so consumers can compare if they need
   * the freshest view.
   */
  consentGiven: boolean;
};

/**
 * Augmented request user — the strategy returns this from `validate()`
 * after re-loading the User row. Endpoints / `@UserId()` see this shape.
 */
export type AuthenticatedUser = JwtPayload;
