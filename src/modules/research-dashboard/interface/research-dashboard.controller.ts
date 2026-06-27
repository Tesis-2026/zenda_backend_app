import {
  Controller,
  Get,
  Header,
  Headers,
  Query,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ResearchDashboardService } from '../application/research-dashboard.service';
import { ResearchDashboardData } from '../application/research-dashboard.types';
import { ResearchDashboardQueryDto } from './dto/research-dashboard-query.dto';
import { renderResearchDashboard } from './research-dashboard.view';

@ApiTags('Research Dashboard')
@Controller('research-dashboard')
export class ResearchDashboardController {
  constructor(
    private readonly dashboard: ResearchDashboardService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({
    summary: 'Render the thesis pilot research analytics dashboard',
  })
  @ApiResponse({ status: 200, description: 'HTML research dashboard' })
  async view(
    @Query() query: ResearchDashboardQueryDto,
    @Headers('x-research-token') headerToken?: string,
  ): Promise<string> {
    this.assertAccess(query.token, headerToken);
    const data = await this.dashboard.build(query);
    return renderResearchDashboard({ data, token: query.token });
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Get aggregated thesis pilot analytics as JSON',
  })
  @ApiResponse({ status: 200, description: 'Aggregated research metrics' })
  async summary(
    @Query() query: ResearchDashboardQueryDto,
    @Headers('x-research-token') headerToken?: string,
  ): Promise<ResearchDashboardData> {
    this.assertAccess(query.token, headerToken);
    return this.dashboard.build(query);
  }

  @Get('export.json')
  @Header('Content-Disposition', 'attachment; filename="zenda-research-dashboard.json"')
  @ApiOperation({ summary: 'Export aggregated research metrics as JSON' })
  async exportJson(
    @Query() query: ResearchDashboardQueryDto,
    @Headers('x-research-token') headerToken?: string,
  ): Promise<ResearchDashboardData> {
    this.assertAccess(query.token, headerToken);
    return this.dashboard.build(query);
  }

  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="zenda-research-dashboard.csv"')
  @ApiOperation({ summary: 'Export thesis pilot metrics as CSV' })
  async exportCsv(
    @Query() query: ResearchDashboardQueryDto,
    @Headers('x-research-token') headerToken?: string,
  ): Promise<string> {
    this.assertAccess(query.token, headerToken);
    const data = await this.dashboard.build(query);
    return this.toCsv(data);
  }

  private assertAccess(queryToken?: string, headerToken?: string): void {
    const configuredToken =
      this.config.get<string>('researchDashboard.token')?.trim() ?? '';
    const nodeEnv = this.config.get<string>('app.nodeEnv') ?? 'development';

    if (!configuredToken && nodeEnv !== 'production') return;

    if (!configuredToken) {
      throw new ServiceUnavailableException(
        'Research dashboard is not configured in this environment.',
      );
    }

    const providedToken = (headerToken ?? queryToken ?? '').trim();
    if (providedToken !== configuredToken) {
      throw new UnauthorizedException('Invalid research dashboard token');
    }
  }

  private toCsv(data: ResearchDashboardData): string {
    const rows: string[][] = [['section', 'metric', 'value']];
    const add = (section: string, metric: string, value: string | number | null) => {
      rows.push([section, metric, value === null ? '' : String(value)]);
    };

    add('period', 'from', data.period.from);
    add('period', 'to', data.period.to);
    add('period', 'label', data.period.label);
    add('participants', 'total_users', data.participants.totalUsers);
    add('participants', 'active_users', data.participants.activeUsers);
    add('participants', 'profile_completed', data.participants.profileCompleted);
    add('participants', 'consent_given', data.participants.consentGiven);
    add('participants', 'average_age', data.participants.averageAge);
    add(
      'participants',
      'average_monthly_income',
      data.participants.averageMonthlyIncome,
    );
    add('usage', 'total_events', data.usage.totalEvents);
    add('usage', 'sessions', data.usage.sessions);
    add('usage', 'daily_active_users_average', data.usage.dailyActiveUsersAverage);
    add('finance', 'transactions', data.finance.transactions);
    add('finance', 'users_with_transactions', data.finance.usersWithTransactions);
    add('finance', 'income_count', data.finance.incomeCount);
    add('finance', 'expense_count', data.finance.expenseCount);
    add('finance', 'transfer_count', data.finance.transferCount);
    add('finance', 'total_income', data.finance.totalIncome);
    add('finance', 'total_expense', data.finance.totalExpense);
    add('finance', 'budgets', data.finance.budgets);
    add('finance', 'goals', data.finance.goals);
    add('finance', 'ai_categorized_transactions', data.finance.aiCategorizedTransactions);
    add('finance', 'ai_category_share', data.finance.aiCategoryShare);
    add('ai', 'conversations', data.ai.conversations);
    add('ai', 'users_with_conversations', data.ai.usersWithConversations);
    add('ai', 'user_messages', data.ai.userMessages);
    add('ai', 'assistant_messages', data.ai.assistantMessages);
    add('ai', 'average_assistant_words', data.ai.averageAssistantWords);
    add('ai', 'feedback_count', data.ai.feedbackCount);
    add('ai', 'average_rating', data.ai.averageRating);
    add('ai', 'helpful_rate', data.ai.helpfulRate);
    add('ai', 'clear_rate', data.ai.clearRate);
    add('ai', 'personalized_rate', data.ai.personalizedRate);
    add('surveys', 'pre_completed', data.surveys.pre.completed);
    add('surveys', 'pre_average_score', data.surveys.pre.averageScore);
    add('surveys', 'post_completed', data.surveys.post.completed);
    add('surveys', 'post_average_score', data.surveys.post.averageScore);
    add('surveys', 'paired_pre_post_users', data.surveys.pairedPrePostUsers);
    add('surveys', 'average_pre_post_delta', data.surveys.averagePrePostDelta);
    add(
      'surveys',
      'average_pre_post_delta_percentage',
      data.surveys.averagePrePostDeltaPercentage,
    );
    add('surveys', 'sus_completed', data.surveys.sus.completed);
    add('surveys', 'sus_average_score', data.surveys.sus.averageScore);
    add(
      'surveys',
      'satisfaction_completed',
      data.surveys.satisfaction.completed,
    );
    add(
      'surveys',
      'satisfaction_average_score',
      data.surveys.satisfaction.averageScore,
    );

    rows.push([]);
    rows.push(['daily', 'date', 'active_users', 'events', 'transactions', 'chat_messages']);
    for (const day of data.usage.daily) {
      rows.push([
        'daily',
        day.date,
        String(day.activeUsers),
        String(day.events),
        String(day.transactions),
        String(day.chatMessages),
      ]);
    }

    rows.push([]);
    rows.push(['event_type', 'label', 'count', 'percentage']);
    for (const item of data.usage.eventsByType) {
      rows.push(['event_type', item.label, String(item.count), String(item.percentage)]);
    }

    rows.push([]);
    rows.push(['satisfaction_likert', 'order', 'question', 'average', 'responses']);
    for (const item of data.surveys.satisfactionLikert) {
      rows.push([
        'satisfaction_likert',
        String(item.order),
        item.text,
        item.average === null ? '' : String(item.average),
        String(item.responses),
      ]);
    }

    rows.push([]);
    rows.push(['open_answer', 'question', 'answer']);
    for (const item of data.surveys.openAnswers) {
      rows.push(['open_answer', item.question, item.answer]);
    }

    return rows.map((row) => row.map((cell) => this.csvCell(cell)).join(',')).join('\n');
  }

  private csvCell(value: string): string {
    if (/[",\n\r]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
