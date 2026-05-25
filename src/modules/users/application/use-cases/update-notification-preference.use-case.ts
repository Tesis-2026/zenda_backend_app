import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { INotificationPreferenceRepository } from '../../domain/ports/notification-preference.repository';

@Injectable()
export class UpdateNotificationPreferenceUseCase {
  constructor(private readonly repository: INotificationPreferenceRepository) {}

  execute(userId: string, type: NotificationType, enabled: boolean): Promise<void> {
    return this.repository.setForUser(userId, type, enabled);
  }
}
