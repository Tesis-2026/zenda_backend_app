import { Injectable } from '@nestjs/common';
import { IBadgeRepository } from '../../../badges/domain/ports/badge.repository';
import { IEducationRepository } from '../../domain/ports/education.repository';

@Injectable()
export class CompleteTopicUseCase {
  constructor(
    private readonly repo: IEducationRepository,
    private readonly badgeRepo: IBadgeRepository,
  ) {}

  async execute(topicId: string, userId: string): Promise<void> {
    await this.repo.markComplete(topicId, userId);

    const [total, completed] = await Promise.all([
      this.repo.countAll(),
      this.repo.countCompleted(userId),
    ]);
    if (total > 0 && completed >= total) {
      await this.badgeRepo.awardIfNotEarned(userId, 'Financial Sage');
    }
  }
}
