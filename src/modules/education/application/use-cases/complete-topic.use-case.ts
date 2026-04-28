import { Injectable } from '@nestjs/common';
import { IEducationRepository } from '../../domain/ports/education.repository';

@Injectable()
export class CompleteTopicUseCase {
  constructor(private readonly repo: IEducationRepository) {}
  execute(topicId: string, userId: string): Promise<void> {
    return this.repo.markComplete(topicId, userId);
  }
}
