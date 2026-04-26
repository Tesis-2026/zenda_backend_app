import { Injectable, NotFoundException } from '@nestjs/common';
import { IEducationRepository } from '../../domain/ports/education.repository';
import { EducationTopicEntity } from '../../domain/education-topic.entity';

@Injectable()
export class GetTopicUseCase {
  constructor(private readonly repo: IEducationRepository) {}
  async execute(id: string, userId: string): Promise<EducationTopicEntity> {
    const topic = await this.repo.getTopicById(id, userId);
    if (!topic) throw new NotFoundException('Topic not found');
    return topic;
  }
}
