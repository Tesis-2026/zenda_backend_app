import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { FeedbackController } from './interface/feedback.controller';

@Module({
  imports: [PrismaModule],
  controllers: [FeedbackController],
})
export class FeedbackModule {}
