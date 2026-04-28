import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { IEducationRepository } from './domain/ports/education.repository';
import { PrismaEducationRepository } from './infrastructure/persistence/prisma-education.repository';
import { ListTopicsUseCase } from './application/use-cases/list-topics.use-case';
import { GetTopicUseCase } from './application/use-cases/get-topic.use-case';
import { CompleteTopicUseCase } from './application/use-cases/complete-topic.use-case';
import { EducationController } from './interface/education.controller';

@Module({
  imports: [PrismaModule],
  controllers: [EducationController],
  providers: [
    { provide: IEducationRepository, useClass: PrismaEducationRepository },
    ListTopicsUseCase,
    GetTopicUseCase,
    CompleteTopicUseCase,
  ],
  exports: [IEducationRepository],
})
export class EducationModule {}
