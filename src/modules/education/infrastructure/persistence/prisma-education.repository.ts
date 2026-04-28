import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { EducationTopicEntity } from '../../domain/education-topic.entity';
import { IEducationRepository } from '../../domain/ports/education.repository';

@Injectable()
export class PrismaEducationRepository implements IEducationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listTopics(userId: string): Promise<EducationTopicEntity[]> {
    const topics = await this.prisma.educationalTopic.findMany({ orderBy: { order: 'asc' } });
    const progress = await this.prisma.userTopicProgress.findMany({ where: { userId } });
    const doneMap = new Map(progress.map((p) => [p.topicId, p.completedAt]));

    return topics.map(
      (t) =>
        new EducationTopicEntity(
          t.id, t.title, t.content,
          t.difficulty as EducationTopicEntity['difficulty'],
          t.order,
          doneMap.has(t.id),
          doneMap.get(t.id) ?? null,
        ),
    );
  }

  async getTopicById(id: string, userId: string): Promise<EducationTopicEntity | null> {
    const t = await this.prisma.educationalTopic.findUnique({ where: { id } });
    if (!t) return null;
    const progress = await this.prisma.userTopicProgress.findUnique({ where: { userId_topicId: { userId, topicId: id } } });
    return new EducationTopicEntity(
      t.id, t.title, t.content,
      t.difficulty as EducationTopicEntity['difficulty'],
      t.order,
      progress !== null,
      progress?.completedAt ?? null,
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
}
