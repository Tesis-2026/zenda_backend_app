import { Injectable } from '@nestjs/common';
import { IEducationRepository } from '../../domain/ports/education.repository';

/**
 * Marks a topic as READ — distinct from completing it. Completion (the literacy
 * metric + "Financial Sage" badge) is only earned by passing the topic quiz,
 * so reading deliberately does NOT touch completedAt or award badges.
 */
@Injectable()
export class MarkReadTopicUseCase {
  constructor(private readonly repo: IEducationRepository) {}

  execute(topicId: string, userId: string): Promise<void> {
    return this.repo.markRead(topicId, userId);
  }
}
