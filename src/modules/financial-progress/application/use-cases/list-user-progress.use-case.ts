import { BadRequestException, Injectable } from '@nestjs/common';
import { IFinancialProgressRepository } from '../../domain/ports/financial-progress.repository';
import { FinancialProgressEntity } from '../../domain/financial-progress.entity';

export interface ListUserProgressQuery {
  userId: string;
  from?: string;
  to?: string;
}

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

@Injectable()
export class ListUserProgressUseCase {
  constructor(private readonly repo: IFinancialProgressRepository) {}

  async execute(query: ListUserProgressQuery): Promise<FinancialProgressEntity[]> {
    if (query.from !== undefined && !PERIOD_PATTERN.test(query.from)) {
      throw new BadRequestException('from must match YYYY-MM');
    }
    if (query.to !== undefined && !PERIOD_PATTERN.test(query.to)) {
      throw new BadRequestException('to must match YYYY-MM');
    }
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException('from must be <= to');
    }

    return this.repo.findByUser({
      userId: query.userId,
      from: query.from,
      to: query.to,
    });
  }
}
