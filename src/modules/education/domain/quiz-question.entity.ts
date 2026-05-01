export type QuizDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export class QuizQuestionEntity {
  constructor(
    public readonly id: string,
    public readonly topicId: string | null,
    public readonly questionGroupKey: string,
    public readonly language: string,
    public readonly difficulty: QuizDifficulty,
    public readonly text: string,
    public readonly options: string[],
    public readonly correctAnswer: string,
  ) {}
}
