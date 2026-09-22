import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { ResearchDashboardService } from './application/research-dashboard.service';
import { ResearchDashboardController } from './interface/research-dashboard.controller';

import { SurveysModule } from '../surveys/surveys.module';

@Module({
  imports: [PrismaModule, SurveysModule],
  controllers: [ResearchDashboardController],
  providers: [ResearchDashboardService],
})
export class ResearchDashboardModule {}
