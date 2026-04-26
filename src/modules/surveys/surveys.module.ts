import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { SurveysController } from './interface/surveys.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SurveysController],
})
export class SurveysModule {}
