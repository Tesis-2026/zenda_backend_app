import { EducationTopicEntity } from '../education-topic.entity';

export abstract class IEducationRepository {
  abstract listTopics(userId: string): Promise<EducationTopicEntity[]>;
  abstract getTopicById(id: string, userId: string): Promise<EducationTopicEntity | null>;
  abstract markComplete(topicId: string, userId: string): Promise<void>;
}
