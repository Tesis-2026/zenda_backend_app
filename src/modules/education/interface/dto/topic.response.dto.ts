import { ApiProperty } from '@nestjs/swagger';
import { EducationTopicEntity } from '../../domain/education-topic.entity';

export class TopicResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() content!: string;
  @ApiProperty({ enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] }) difficulty!: string;
  @ApiProperty() order!: number;
  @ApiProperty() isCompleted!: boolean;
  @ApiProperty({ nullable: true }) completedAt!: Date | null;

  static from(e: EducationTopicEntity): TopicResponseDto {
    const dto = new TopicResponseDto();
    dto.id = e.id;
    dto.title = e.title;
    dto.content = e.content;
    dto.difficulty = e.difficulty;
    dto.order = e.order;
    dto.isCompleted = e.isCompleted;
    dto.completedAt = e.completedAt;
    return dto;
  }
}
