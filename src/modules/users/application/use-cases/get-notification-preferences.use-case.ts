import { Injectable } from '@nestjs/common';
import { NotificationPreference } from '../../domain/notification-preference';
import { INotificationPreferenceRepository } from '../../domain/ports/notification-preference.repository';

@Injectable()
export class GetNotificationPreferencesUseCase {
  constructor(private readonly repository: INotificationPreferenceRepository) {}

  execute(userId: string): Promise<NotificationPreference[]> {
    return this.repository.listForUser(userId);
  }
}
