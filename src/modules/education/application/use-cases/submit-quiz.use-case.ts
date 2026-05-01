import { Injectable, NotFoundException } from '@nestjs/common';
import { IEducationRepository } from '../../domain/ports/education.repository';

export interface SubmitQuizCommand {
  topicId: string;
  answers: Record<string, string>;
}

export interface QuizSubmitResult {
  score: number;
  correctCount: number;
  totalCount: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  feedback: Array<{ questionId: string; correct: boolean; correctAnswer: string }>;
}

@Injectable()
export class SubmitQuizUseCase {
  constructor(private readonly repo: IEducationRepository) {}

  async execute(cmd: SubmitQuizCommand): Promise<QuizSubmitResult> {
    const questionIds = Object.keys(cmd.answers);
    if (questionIds.length === 0) {
      throw new NotFoundException('No answers provided');
    }

    const questions = await this.repo.getQuizQuestionsByIds(questionIds);

    const feedback = questions.map((q) => ({
      questionId: q.id,
      correct: cmd.answers[q.id] === q.correctAnswer,
      correctAnswer: q.correctAnswer,
    }));

    const correctCount = feedback.filter((f) => f.correct).length;
    const total = questions.length;
    const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const level: QuizSubmitResult['level'] = score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW';

    return { score, correctCount, totalCount: total, level, feedback };
  }
}
