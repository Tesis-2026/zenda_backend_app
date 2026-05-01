export class QuizQuestionDto {
  id!: string;
  difficulty!: string;
  text!: string;
  options!: string[];
}

export class QuizResponseDto {
  topicId!: string;
  language!: string;
  questions!: QuizQuestionDto[];
}

export class QuizFeedbackItemDto {
  questionId!: string;
  correct!: boolean;
  correctAnswer!: string;
}

export class QuizSubmitResponseDto {
  score!: number;
  correctCount!: number;
  totalCount!: number;
  level!: string;
  feedback!: QuizFeedbackItemDto[];
}
