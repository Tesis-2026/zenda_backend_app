import { Injectable } from '@nestjs/common';
import { BadgesFacade } from '../../../badges/application/facades/badges.facade';
import { IEducationRepository } from '../../domain/ports/education.repository';

@Injectable()
export class CompleteTopicUseCase {
  constructor(
    private readonly repo: IEducationRepository,
    private readonly badges: BadgesFacade,
  ) {}

  async execute(topicId: string, userId: string): Promise<void> {
    await this.repo.markComplete(topicId, userId);

    const [total, completed] = await Promise.all([
      this.repo.countAll(),
      this.repo.countCompleted(userId),
    ]);
    if (total > 0 && completed >= total) {
      await this.badges.awardIfNotEarned(userId, 'Financial Sage');
    }
  }
}
