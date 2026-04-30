import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IBadgeRepository } from '../../../badges/domain/ports/badge.repository';
import { VerifyChallengesUseCase } from '../../../challenges/application/use-cases/verify-challenges.use-case';
import { ISavingsGoalRepository } from '../../domain/ports/savings-goal.repository';
import { SavingsGoalEntity } from '../../domain/savings-goal.entity';

export interface ContributeToGoalCommand {
  userId: string;
  goalId: string;
  amount: number;
}

@Injectable()
export class ContributeToGoalUseCase {
  private readonly logger = new Logger(ContributeToGoalUseCase.name);

  constructor(
    private readonly repo: ISavingsGoalRepository,
    private readonly badgeRepo: IBadgeRepository,
    private readonly verifyChallenges: VerifyChallengesUseCase,
  ) {}

  async execute(cmd: ContributeToGoalCommand): Promise<SavingsGoalEntity> {
    const goal = await this.repo.findById(cmd.goalId, cmd.userId);
    if (!goal) throw new NotFoundException('Goal not found');

    const newAmount = goal.contribute(cmd.amount);
    const [updated] = await Promise.all([
      this.repo.updateCurrentAmount(cmd.goalId, newAmount),
      this.repo.addContribution(cmd.goalId, cmd.amount),
    ]);

    if (updated.progressPercent >= 100) {
      await this.badgeRepo.awardIfNotEarned(cmd.userId, 'Goal Achieved');
    }

    this.verifyChallenges.execute(cmd.userId).catch((err: unknown) => {
      this.logger.warn('Challenge verification failed after goal contribution', err);
    });

    return updated;
  }
}
