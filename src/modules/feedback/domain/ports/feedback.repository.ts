import { FeedbackEntity, FeedbackKind } from '../feedback.entity';

export abstract class IFeedbackRepository {
  abstract create(params: {
    userId: string;
    type: FeedbackKind;
    message: string;
    screenName?: string | null;
    rating?: number | null;
  }): Promise<FeedbackEntity>;
}
