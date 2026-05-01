import { Injectable, NotFoundException } from '@nestjs/common';
import { IEducationRepository } from '../../domain/ports/education.repository';
import { QuizQuestionEntity, QuizDifficulty } from '../../domain/quiz-question.entity';

export interface GetQuizCommand {
  topicId: string;
  language: string;
}

export interface QuizQuestion {
  id: string;
  difficulty: QuizDifficulty;
  text: string;
  options: string[];
}

export interface QuizResult {
  topicId: string;
  language: string;
  questions: QuizQuestion[];
}

const POOL_SIZES: Record<QuizDifficulty, number> = {
  BEGINNER: 2,
  INTERMEDIATE: 2,
  ADVANCED: 1,
};

@Injectable()
export class GetQuizUseCase {
  constructor(private readonly repo: IEducationRepository) {}

  async execute(cmd: GetQuizCommand): Promise<QuizResult> {
    const lang = cmd.language === 'es' ? 'es' : 'en';
    const pool = await this.repo.getQuizPool(cmd.topicId, lang);

    if (pool.length === 0) {
      throw new NotFoundException('No quiz questions available for this topic');
    }

    const selected = this._selectQuestions(pool);

    return {
      topicId: cmd.topicId,
      language: lang,
      questions: selected.map((q) => ({
        id: q.id,
        difficulty: q.difficulty,
        text: q.text,
        options: q.options,
      })),
    };
  }

  private _selectQuestions(pool: QuizQuestionEntity[]): QuizQuestionEntity[] {
    const byDifficulty = new Map<QuizDifficulty, QuizQuestionEntity[]>();
    for (const q of pool) {
      const bucket = byDifficulty.get(q.difficulty) ?? [];
      bucket.push(q);
      byDifficulty.set(q.difficulty, bucket);
    }

    const selected: QuizQuestionEntity[] = [];
    const difficulties: QuizDifficulty[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

    for (const diff of difficulties) {
      const bucket = byDifficulty.get(diff) ?? [];
      const shuffled = [...bucket].sort(() => Math.random() - 0.5);
      selected.push(...shuffled.slice(0, POOL_SIZES[diff]));
    }

    return selected.sort(() => Math.random() - 0.5);
  }
}
