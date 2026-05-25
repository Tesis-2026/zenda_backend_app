import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { SurveysController } from './interface/surveys.controller';

/**
 * Surveys bounded context (B7).
 *
 * Previously lived inside EducationModule, which conflated two
 * different research / engagement concerns: educational content
 * (topics + quizzes) and longitudinal research surveys (PRE/POST
 * financial-literacy + SUS usability). Splitting them lets surveys
 * evolve independently — e.g. the SUS scoring formula or the
 * pre/post improvement metric have no business living next to topic
 * progress.
 *
 * The controller still talks to Prisma directly (legacy from before
 * the DDD split). Lifting Prisma access into a dedicated repository
 * is a separate follow-up — out of scope for the module-extraction
 * batch (B7) which only relocates code, not its layering.
 */
@Module({
  imports: [PrismaModule],
  controllers: [SurveysController],
})
export class SurveysModule {}
