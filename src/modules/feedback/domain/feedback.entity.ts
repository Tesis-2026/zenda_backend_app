export type FeedbackKind = 'BUG' | 'SUGGESTION' | 'GENERAL';

export class FeedbackEntity {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly type: FeedbackKind,
    readonly message: string,
    readonly screenName: string | null,
    readonly rating: number | null,
    readonly createdAt: Date,
  ) {}

  static create(params: {
    id: string;
    userId: string;
    type: FeedbackKind;
    message: string;
    screenName: string | null;
    rating: number | null;
    createdAt: Date;
  }): FeedbackEntity {
    return new FeedbackEntity(
      params.id,
      params.userId,
      params.type,
      params.message,
      params.screenName,
      params.rating,
      params.createdAt,
    );
  }
}
