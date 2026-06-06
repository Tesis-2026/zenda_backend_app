import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { EducationTopicEntity } from '../../domain/education-topic.entity';
import { QuizDifficulty, QuizQuestionEntity } from '../../domain/quiz-question.entity';
import { IEducationRepository, PersonalizedQuestionInput } from '../../domain/ports/education.repository';

// Mirrors POOL_SIZES in get-quiz.use-case.ts — the fixed number of questions a
// topic quiz serves per difficulty. Used so the topic card's question count
// matches the actual quiz length (not the full question pool).
const QUIZ_POOL_SIZES: Record<string, number> = {
  BEGINNER: 2,
  INTERMEDIATE: 2,
  ADVANCED: 1,
};

@Injectable()
export class PrismaEducationRepository implements IEducationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listTopics(userId: string): Promise<EducationTopicEntity[]> {
    const topics = await this.prisma.educationalTopic.findMany({ orderBy: { order: 'asc' } });
    const progress = await this.prisma.userTopicProgress.findMany({ where: { userId } });
    const progressByTopic = new Map(progress.map((p) => [p.topicId, p]));

    // Question count = what the quiz actually serves (2 BEGINNER + 2 INTERMEDIATE
    // + 1 ADVANCED, capped by the pool), single language to avoid EN+ES double count.
    const counts = await this.prisma.quizQuestion.groupBy({
      by: ['topicId', 'difficulty'],
      where: { language: 'es', topicId: { not: null } },
      _count: { _all: true },
    });
    const countMap = new Map<string, number>();
    for (const c of counts) {
      if (c.topicId === null) continue;
      const served = Math.min(c._count._all, QUIZ_POOL_SIZES[c.difficulty] ?? 0);
      countMap.set(c.topicId, (countMap.get(c.topicId) ?? 0) + served);
    }

    return topics.map((t) => {
      const p = progressByTopic.get(t.id);
      return new EducationTopicEntity(
        t.id, t.title, t.content,
        t.difficulty as EducationTopicEntity['difficulty'],
        t.order,
        p?.completedAt != null, // completed = quiz passed (>=70%)
        p?.completedAt ?? null,
        t.category,
        countMap.get(t.id) ?? 0,
        p != null && (p.readAt != null || p.completedAt != null), // read
      );
    });
  }

  async getTopicById(id: string, userId: string): Promise<EducationTopicEntity | null> {
    const t = await this.prisma.educationalTopic.findUnique({ where: { id } });
    if (!t) return null;
    const progress = await this.prisma.userTopicProgress.findUnique({ where: { userId_topicId: { userId, topicId: id } } });
    const diffCounts = await this.prisma.quizQuestion.groupBy({
      by: ['difficulty'],
      where: { topicId: id, language: 'es' },
      _count: { _all: true },
    });
    let questionCount = 0;
    for (const c of diffCounts) {
      questionCount += Math.min(c._count._all, QUIZ_POOL_SIZES[c.difficulty] ?? 0);
    }
    return new EducationTopicEntity(
      t.id, t.title, t.content,
      t.difficulty as EducationTopicEntity['difficulty'],
      t.order,
      progress?.completedAt != null,
      progress?.completedAt ?? null,
      t.category,
      questionCount,
      progress != null && (progress.readAt != null || progress.completedAt != null),
    );
  }

  async markComplete(topicId: string, userId: string): Promise<void> {
    const topic = await this.prisma.educationalTopic.findUnique({ where: { id: topicId } });
    if (!topic) throw new NotFoundException('Topic not found');
    await this.prisma.userTopicProgress.upsert({
      where: { userId_topicId: { userId, topicId } },
      create: { userId, topicId, completedAt: new Date() },
      update: { completedAt: new Date() },
    });
  }

  async markRead(topicId: string, userId: string): Promise<void> {
    const topic = await this.prisma.educationalTopic.findUnique({ where: { id: topicId } });
    if (!topic) throw new NotFoundException('Topic not found');
    await this.prisma.userTopicProgress.upsert({
      where: { userId_topicId: { userId, topicId } },
      create: { userId, topicId, readAt: new Date() },
      update: { readAt: new Date() },
    });
  }

  countAll(): Promise<number> {
    return this.prisma.educationalTopic.count();
  }

  countCompleted(userId: string): Promise<number> {
    return this.prisma.userTopicProgress.count({
      where: { userId, completedAt: { not: null } },
    });
  }

  async getQuizPool(topicId: string, language: string): Promise<QuizQuestionEntity[]> {
    const rows = await this.prisma.quizQuestion.findMany({
      where: { topicId, language },
      orderBy: { difficulty: 'asc' },
    });
    return rows.map((r) =>
      new QuizQuestionEntity(
        r.id,
        r.topicId,
        r.questionGroupKey,
        r.language,
        r.difficulty as QuizQuestionEntity['difficulty'],
        r.text,
        r.options as string[],
        r.correctAnswer,
      ),
    );
  }

  async getQuizQuestionsByIds(ids: string[]): Promise<QuizQuestionEntity[]> {
    const rows = await this.prisma.quizQuestion.findMany({ where: { id: { in: ids } } });
    return rows.map((r) =>
      new QuizQuestionEntity(
        r.id,
        r.topicId,
        r.questionGroupKey,
        r.language,
        r.difficulty as QuizDifficulty,
        r.text,
        r.options as string[],
        r.correctAnswer,
      ),
    );
  }

  async savePersonalizedQuestions(questions: PersonalizedQuestionInput[], language: string): Promise<QuizQuestionEntity[]> {
    const groupKey = `personalized_${Date.now()}`;
    const created = await Promise.all(
      questions.map((q) =>
        this.prisma.quizQuestion.create({
          data: {
            topicId: null,
            questionGroupKey: groupKey,
            language,
            difficulty: q.difficulty,
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
          },
        }),
      ),
    );
    return created.map(
      (r) =>
        new QuizQuestionEntity(
          r.id,
          r.topicId,
          r.questionGroupKey,
          r.language,
          r.difficulty as QuizDifficulty,
          r.text,
          r.options as string[],
          r.correctAnswer,
        ),
    );
  }
}
