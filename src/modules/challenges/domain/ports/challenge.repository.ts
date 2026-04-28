import { ChallengeEntity } from '../challenge.entity';

export abstract class IChallengeRepository {
  abstract list(userId: string): Promise<ChallengeEntity[]>;
  abstract accept(challengeId: string, userId: string): Promise<ChallengeEntity>;
}
