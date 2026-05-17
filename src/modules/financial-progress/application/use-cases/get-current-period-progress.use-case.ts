import { Injectable, NotFoundException } from '@nestjs/common';
import { IFinancialProgressRepository } from '../../domain/ports/financial-progress.repository';
import { FinancialProgressEntity } from '../../domain/financial-progress.entity';

@Injectable()
export class GetCurrentPeriodProgressUseCase {
  constructor(private readonly repo: IFinancialProgressRepository) {}

  async execute(userId: string): Promise<FinancialProgressEntity> {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const snapshot = await this.repo.findByUserAndPeriod(userId, period);
    if (!snapshot) {
      throw new NotFoundException(`No progress snapshot for period ${period}`);
    }
    return snapshot;
  }
}
