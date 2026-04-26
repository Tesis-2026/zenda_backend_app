import { Injectable } from '@nestjs/common';
import { IEducationRepository } from '../../domain/ports/education.repository';
import { EducationTopicEntity } from '../../domain/education-topic.entity';

@Injectable()
export class ListTopicsUseCase {
  constructor(private readonly repo: IEducationRepository) {}
  execute(userId: string): Promise<EducationTopicEntity[]> {
    return this.repo.listTopics(userId);
  }
}
