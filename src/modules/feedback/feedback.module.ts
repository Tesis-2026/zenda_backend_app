import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { SubmitFeedbackUseCase } from './application/use-cases/submit-feedback.use-case';
import { IFeedbackRepository } from './domain/ports/feedback.repository';
import { PrismaFeedbackRepository } from './infrastructure/persistence/prisma-feedback.repository';
import { FeedbackController } from './interface/feedback.controller';

@Module({
  imports: [PrismaModule],
  controllers: [FeedbackController],
  providers: [
    { provide: IFeedbackRepository, useClass: PrismaFeedbackRepository },
    SubmitFeedbackUseCase,
  ],
})
export class FeedbackModule {}
