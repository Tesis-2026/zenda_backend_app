import { BadgeEntity } from '../badge.entity';

export abstract class IBadgeRepository {
  abstract list(userId: string): Promise<BadgeEntity[]>;
  abstract awardIfNotEarned(userId: string, badgeName: string): Promise<void>;
}
