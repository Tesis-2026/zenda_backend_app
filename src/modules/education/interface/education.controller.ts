import { Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { ListTopicsUseCase } from '../application/use-cases/list-topics.use-case';
import { GetTopicUseCase } from '../application/use-cases/get-topic.use-case';
import { CompleteTopicUseCase } from '../application/use-cases/complete-topic.use-case';
import { TopicResponseDto } from './dto/topic.response.dto';

@ApiTags('Education')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('education/topics')
export class EducationController {
  constructor(
    private readonly listTopics: ListTopicsUseCase,
    private readonly getTopic: GetTopicUseCase,
    private readonly completeTopic: CompleteTopicUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all educational topics with user progress (US-1001)' })
  async list(@UserId() userId: string): Promise<TopicResponseDto[]> {
    const topics = await this.listTopics.execute(userId);
    return topics.map(TopicResponseDto.from);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get topic detail with full content (US-1001)' })
  async detail(@Param('id', ParseUUIDPipe) id: string, @UserId() userId: string): Promise<TopicResponseDto> {
    const topic = await this.getTopic.execute(id, userId);
    if (!topic) throw new NotFoundException('Topic not found');
    return TopicResponseDto.from(topic);
  }

  @Patch(':id/complete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark topic as completed (US-1001)' })
  async complete(@Param('id', ParseUUIDPipe) id: string, @UserId() userId: string): Promise<void> {
    await this.completeTopic.execute(id, userId);
  }
}
