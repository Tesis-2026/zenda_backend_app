import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { GetSurveyUseCase, SurveyView } from '../application/use-cases/get-survey.use-case';
import { SubmitPreSurveyUseCase } from '../application/use-cases/submit-pre-survey.use-case';
import { SubmitPostSurveyUseCase } from '../application/use-cases/submit-post-survey.use-case';
import { SubmitSusSurveyUseCase } from '../application/use-cases/submit-sus-survey.use-case';
import {
  GetSurveyComparisonUseCase,
  SurveyComparison,
} from '../application/use-cases/get-survey-comparison.use-case';
import { SurveyType } from '../domain/survey.types';
import { SubmitSurveyDto } from './dto/submit-survey.dto';

@ApiTags('Surveys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('surveys')
export class SurveysController {
  constructor(
    private readonly getSurvey: GetSurveyUseCase,
    private readonly submitPreSurvey: SubmitPreSurveyUseCase,
    private readonly submitPostSurvey: SubmitPostSurveyUseCase,
    private readonly submitSusSurvey: SubmitSusSurveyUseCase,
    private readonly getSurveyComparison: GetSurveyComparisonUseCase,
  ) {}

  @Get('pre')
  @ApiOperation({ summary: 'Get pre-usage survey questions (US-1201)' })
  getPreSurvey(): Promise<SurveyView> {
    return this.getSurvey.execute(SurveyType.PRE);
  }

  @Get('post')
  @ApiOperation({ summary: 'Get post-usage survey questions (US-1202)' })
  getPostSurvey(): Promise<SurveyView> {
    return this.getSurvey.execute(SurveyType.POST);
  }

  @Post('pre/response')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit pre-usage survey response (US-1201)' })
  submitPre(
    @UserId() userId: string,
    @Body() dto: SubmitSurveyDto,
  ): Promise<{ score: number; level: string }> {
    return this.submitPreSurvey.execute(userId, dto.answers);
  }

  @Post('post/response')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit post-usage survey response (US-1202)' })
  submitPost(
    @UserId() userId: string,
    @Body() dto: SubmitSurveyDto,
  ): Promise<{ score: number; level: string; improvement: number | null }> {
    return this.submitPostSurvey.execute(userId, dto.answers);
  }

  @Get('sus')
  @ApiOperation({ summary: 'Get SUS usability questionnaire (US-035)' })
  getSusSurvey(): Promise<SurveyView> {
    return this.getSurvey.execute(SurveyType.SUS);
  }

  @Post('sus/response')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit SUS survey response and compute SUS score (US-035)' })
  submitSus(
    @UserId() userId: string,
    @Body() dto: SubmitSurveyDto,
  ): Promise<{ susScore: number; grade: string }> {
    return this.submitSusSurvey.execute(userId, dto.answers);
  }

  @Get('comparison')
  @ApiOperation({ summary: 'Get pre/post comparison for a user (US-1203)' })
  comparison(@UserId() userId: string): Promise<SurveyComparison> {
    return this.getSurveyComparison.execute(userId);
  }
}
