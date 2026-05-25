import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BadgesFacade } from '../../../badges/application/facades/badges.facade';
import { ChallengesFacade } from '../../../challenges/application/facades/challenges.facade';
import { ISavingsGoalRepository } from '../../domain/ports/savings-goal.repository';
import { SavingsGoalEntity } from '../../domain/savings-goal.entity';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';

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
    private readonly badges: BadgesFacade,
    private readonly challenges: ChallengesFacade,
    private readonly auditLog: AuditLogService,
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
      await this.badges.awardIfNotEarned(cmd.userId, 'Goal Achieved');
    }

    this.challenges.verifyForUser(cmd.userId).catch((err: unknown) => {
      this.logger.warn('Challenge verification failed after goal contribution', err);
    });

    this.auditLog.record({
      action: 'CONTRIBUTE_TO_GOAL',
      resource: 'SavingsGoal',
      resourceId: cmd.goalId,
      beforeJson: { currentAmount: goal.currentAmount },
      afterJson: { currentAmount: updated.currentAmount, contribution: cmd.amount },
    });

    return updated;
  }
}
