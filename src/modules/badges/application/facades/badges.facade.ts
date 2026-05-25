import { Injectable } from '@nestjs/common';
import { IBadgeRepository } from '../../domain/ports/badge.repository';

/**
 * Public, cross-context contract for the Badges module.
 *
 * Other bounded contexts (transactions, goals, budgets, education,
 * predictions, challenges) need to award badges as side effects of
 * their own use cases. Before B19 they reached into
 * `IBadgeRepository` — Badges' internal domain port — which leaked
 * implementation details across module boundaries (ARCH-17).
 *
 * They now depend on this facade instead. The surface is intentionally
 * narrow: only the verbs callers actually use. Anything Badges-internal
 * stays inside the module.
 */
export abstract class BadgesFacade {
  abstract awardIfNotEarned(userId: string, badgeName: string): Promise<void>;
}

@Injectable()
export class BadgesFacadeImpl extends BadgesFacade {
  constructor(private readonly repository: IBadgeRepository) {
    super();
  }

  awardIfNotEarned(userId: string, badgeName: string): Promise<void> {
    return this.repository.awardIfNotEarned(userId, badgeName);
  }
}
