import { Injectable } from '@nestjs/common';
import { VerifyChallengesUseCase } from '../use-cases/verify-challenges.use-case';

/**
 * Public, cross-context contract for the Challenges module.
 *
 * Transactions and Goals trigger challenge verification as a side
 * effect of their own commands. Before B19 they imported
 * `VerifyChallengesUseCase` directly, which leaked the application
 * layer of Challenges into other bounded contexts (ARCH-17).
 *
 * They now depend on this facade. Returns the list of newly-completed
 * challenge titles so callers can surface them in their response.
 */
export abstract class ChallengesFacade {
  abstract verifyForUser(userId: string): Promise<string[]>;
}

@Injectable()
export class ChallengesFacadeImpl extends ChallengesFacade {
  constructor(private readonly verify: VerifyChallengesUseCase) {
    super();
  }

  verifyForUser(userId: string): Promise<string[]> {
    return this.verify.execute(userId);
  }
}
