import { Injectable } from '@nestjs/common';
import { IRecommendationRepository } from '../../domain/ports/recommendation.repository';

@Injectable()
export class SubmitFeedbackUseCase {
  constructor(private readonly repo: IRecommendationRepository) {}

  async execute(id: string, userId: string, accepted: boolean): Promise<void> {
    await this.repo.submitFeedback(id, userId, accepted);
  }
}
