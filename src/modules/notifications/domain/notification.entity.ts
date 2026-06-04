export type NotificationKind =
  | 'BUDGET_ALERT'
  | 'ANOMALY_ALERT'
  | 'PREDICTION_READY'
  | 'CHALLENGE_REMINDER'
  | 'DAILY_REMINDER'
  | 'BADGE_EARNED';

export const ALL_NOTIFICATION_KINDS: readonly NotificationKind[] = [
  'BUDGET_ALERT',
  'ANOMALY_ALERT',
  'PREDICTION_READY',
  'CHALLENGE_REMINDER',
  'DAILY_REMINDER',
  'BADGE_EARNED',
] as const;

export interface NotificationProps {
  id: string;
  userId: string;
  type: NotificationKind;
  title: string;
  body: string;
  data: Record<string, string> | null;
  readAt: Date | null;
  sentAt: Date | null;
  createdAt: Date;
}

export class NotificationEntity {
  private constructor(private readonly props: NotificationProps) {}

  static fromPersistence(props: NotificationProps): NotificationEntity {
    return new NotificationEntity(props);
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get type(): NotificationKind {
    return this.props.type;
  }
  get title(): string {
    return this.props.title;
  }
  get body(): string {
    return this.props.body;
  }
  get data(): Record<string, string> | null {
    return this.props.data;
  }
  get readAt(): Date | null {
    return this.props.readAt;
  }
  get sentAt(): Date | null {
    return this.props.sentAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get isRead(): boolean {
    return this.props.readAt !== null;
  }
}
