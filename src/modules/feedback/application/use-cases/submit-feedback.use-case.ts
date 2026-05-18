import { Injectable } from '@nestjs/common';
import { FeedbackEntity, FeedbackKind } from '../../domain/feedback.entity';
import { IFeedbackRepository } from '../../domain/ports/feedback.repository';

export interface SubmitFeedbackCommand {
  userId: string;
  type?: FeedbackKind;
  message: string;
  screenName?: string;
  rating?: number;
}

@Injectable()
export class SubmitFeedbackUseCase {
  constructor(private readonly repo: IFeedbackRepository) {}

  execute(cmd: SubmitFeedbackCommand): Promise<FeedbackEntity> {
    return this.repo.create({
      userId: cmd.userId,
      type: cmd.type ?? 'GENERAL',
      message: cmd.message,
      screenName: cmd.screenName ?? null,
      rating: cmd.rating ?? null,
    });
  }
}
