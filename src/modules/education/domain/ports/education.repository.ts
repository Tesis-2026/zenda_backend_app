import { EducationTopicEntity } from '../education-topic.entity';
import { QuizQuestionEntity } from '../quiz-question.entity';

export abstract class IEducationRepository {
  abstract listTopics(userId: string): Promise<EducationTopicEntity[]>;
  abstract getTopicById(id: string, userId: string): Promise<EducationTopicEntity | null>;
  abstract markComplete(topicId: string, userId: string): Promise<void>;
  abstract countAll(): Promise<number>;
  abstract countCompleted(userId: string): Promise<number>;
  abstract getQuizPool(topicId: string, language: string): Promise<QuizQuestionEntity[]>;
  abstract getQuizQuestionsByIds(ids: string[]): Promise<QuizQuestionEntity[]>;
}
