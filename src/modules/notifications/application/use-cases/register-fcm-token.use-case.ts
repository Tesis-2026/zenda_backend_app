import { Inject, Injectable } from '@nestjs/common';
import {
  INotificationUserPort,
  NOTIFICATION_USER_PORT,
} from '../../domain/ports/notification-user.port';

@Injectable()
export class RegisterFcmTokenUseCase {
  constructor(
    @Inject(NOTIFICATION_USER_PORT)
    private readonly userPort: INotificationUserPort,
  ) {}

  async register(userId: string, token: string): Promise<void> {
    await this.userPort.setFcmToken(userId, token);
  }

  async unregister(userId: string): Promise<void> {
    await this.userPort.clearFcmToken(userId);
  }

  async setDailyReminderTime(userId: string, hhmm: string | null): Promise<void> {
    await this.userPort.setDailyReminderTime(userId, hhmm);
  }
}
