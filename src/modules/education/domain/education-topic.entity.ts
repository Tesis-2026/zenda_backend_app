export type TopicDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export class EducationTopicEntity {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly content: string,
    public readonly difficulty: TopicDifficulty,
    public readonly order: number,
    public readonly isCompleted: boolean,
    public readonly completedAt: Date | null,
    public readonly category: string = 'budgeting',
    public readonly questionCount: number = 0,
    // Read = user tapped "mark as read"; distinct from isCompleted (quiz passed).
    public readonly isRead: boolean = false,
  ) {}
}
