import { ApiProperty } from '@nestjs/swagger';
import {
  LearningPathQuizMode,
  LearningPathSource,
  LearningPathStepKind,
  LearningPathStepStatus,
  PersonalizedLearningPathResult,
  PersonalizedLearningPathStep,
} from '../../application/use-cases/get-personalized-learning-path.use-case';

export class LearningPathStepDto {
  @ApiProperty({ example: 'topic_9f4a...' })
  id!: string;

  @ApiProperty({ enum: ['topic', 'personalized_quiz'] })
  kind!: LearningPathStepKind;

  @ApiProperty({ nullable: true, example: '9f4a2b7a-6e5f-4f4f-a935-cba7a3b1e20c' })
  topicId!: string | null;

  @ApiProperty({ example: 'Presupuesto 50/30/20' })
  title!: string;

  @ApiProperty({ example: 'Te ayuda a ordenar gastos y tomar mejores decisiones mensuales.' })
  reason!: string;

  @ApiProperty({ example: 'Presupuesto, control de gastos y prioridades.' })
  focus!: string;

  @ApiProperty({ enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] })
  difficulty!: string;

  @ApiProperty({ enum: ['pending', 'read', 'completed'] })
  status!: LearningPathStepStatus;

  @ApiProperty({ example: 1 })
  order!: number;

  @ApiProperty({ example: 8 })
  estimatedMinutes!: number;

  @ApiProperty({ enum: ['app_topic_quiz', 'ai_personalized_quiz'] })
  quizMode!: LearningPathQuizMode;

  static from(step: PersonalizedLearningPathStep): LearningPathStepDto {
    const dto = new LearningPathStepDto();
    dto.id = step.id;
    dto.kind = step.kind;
    dto.topicId = step.topicId;
    dto.title = step.title;
    dto.reason = step.reason;
    dto.focus = step.focus;
    dto.difficulty = step.difficulty;
    dto.status = step.status;
    dto.order = step.order;
    dto.estimatedMinutes = step.estimatedMinutes;
    dto.quizMode = step.quizMode;
    return dto;
  }
}

export class PersonalizedLearningPathResponseDto {
  @ApiProperty({ example: '2026-06-25T02:00:00.000Z' })
  generatedAt!: string;

  @ApiProperty({ enum: ['agent', 'fallback'] })
  source!: LearningPathSource;

  @ApiProperty({ example: 'Ruta personalizada con tus temas pendientes y tu contexto financiero reciente.' })
  summary!: string;

  @ApiProperty({ type: [LearningPathStepDto] })
  steps!: LearningPathStepDto[];

  static from(result: PersonalizedLearningPathResult): PersonalizedLearningPathResponseDto {
    const dto = new PersonalizedLearningPathResponseDto();
    dto.generatedAt = result.generatedAt;
    dto.source = result.source;
    dto.summary = result.summary;
    dto.steps = result.steps.map(LearningPathStepDto.from);
    return dto;
  }
}
