import { EducationTopicEntity } from '../education-topic.entity';
import { QuizDifficulty, QuizQuestionEntity } from '../quiz-question.entity';

export interface PersonalizedQuestionInput {
  text: string;
  options: string[];
  correctAnswer: string;
  difficulty: QuizDifficulty;
}

export abstract class IEducationRepository {
  abstract listTopics(userId: string): Promise<EducationTopicEntity[]>;
  abstract getTopicById(id: string, userId: string): Promise<EducationTopicEntity | null>;
  abstract markComplete(topicId: string, userId: string): Promise<void>;
  abstract countAll(): Promise<number>;
  abstract countCompleted(userId: string): Promise<number>;
  abstract getQuizPool(topicId: string, language: string): Promise<QuizQuestionEntity[]>;
  abstract getQuizQuestionsByIds(ids: string[]): Promise<QuizQuestionEntity[]>;
  abstract savePersonalizedQuestions(questions: PersonalizedQuestionInput[], language: string): Promise<QuizQuestionEntity[]>;
}
