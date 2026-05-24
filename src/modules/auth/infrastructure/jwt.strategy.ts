import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IUserRepository } from '../domain/ports/user.repository';
import { AuthenticatedUser, JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly userRepository: IUserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('auth.jwtSecret'),
    });
  }

  /**
   * Runs on every authenticated request after JWT signature + expiry
   * checks pass. Adds two checks Passport doesn't do on its own:
   *
   *   1. Reject tokens whose `tokenVersion` is older than the user's
   *      current value (B25 / ARCH-24). Bumped on password reset, so a
   *      reset implicitly logs out every existing session.
   *
   *   2. Reject tokens for soft-deleted users (ARCH-20). S-02 only
   *      patched the login path (`findByEmail` filters deletedAt);
   *      already-issued JWTs would otherwise stay valid until expiry.
   *
   * The returned object becomes `req.user` (and what `@UserId()` reads).
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (typeof payload.tokenVersion !== 'number') {
      throw new UnauthorizedException('Token is missing required claims');
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user || user.isDeleted) {
      throw new UnauthorizedException('Account is no longer active');
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Session has been revoked, please sign in again');
    }

    // Return the JWT payload augmented with the freshest consentGiven
    // value (the claim may be stale if consent was revoked since signing).
    return {
      sub: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion,
      consentGiven: user.consentGiven,
    };
  }
}
