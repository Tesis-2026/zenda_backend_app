import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { ResearchDashboardService } from './application/research-dashboard.service';
import { ResearchDashboardController } from './interface/research-dashboard.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ResearchDashboardController],
  providers: [ResearchDashboardService],
})
export class ResearchDashboardModule {}
