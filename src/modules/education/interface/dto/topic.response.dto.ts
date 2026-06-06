import { ApiProperty } from '@nestjs/swagger';
import { EducationTopicEntity } from '../../domain/education-topic.entity';

export class TopicResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() content!: string;
  @ApiProperty({ enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] }) difficulty!: string;
  @ApiProperty() order!: number;
  @ApiProperty({ description: "Theme group for client iconography: 'budgeting' | 'saving' | 'investing'." }) category!: string;
  @ApiProperty({ description: 'Number of quiz questions available for this topic (per language).' }) questionCount!: number;
  @ApiProperty({ description: 'Completed = passed the quiz (>=70%).' }) isCompleted!: boolean;
  @ApiProperty({ description: 'Read = user marked it read (not the same as completed).' }) isRead!: boolean;
  @ApiProperty({ nullable: true }) completedAt!: Date | null;

  static from(e: EducationTopicEntity): TopicResponseDto {
    const dto = new TopicResponseDto();
    dto.id = e.id;
    dto.title = e.title;
    dto.content = e.content;
    dto.difficulty = e.difficulty;
    dto.order = e.order;
    dto.category = e.category;
    dto.questionCount = e.questionCount;
    dto.isCompleted = e.isCompleted;
    dto.isRead = e.isRead;
    dto.completedAt = e.completedAt;
    return dto;
  }
}
