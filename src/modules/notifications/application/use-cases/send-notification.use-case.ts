import { Inject, Injectable, Logger } from '@nestjs/common';
import { FcmService } from '../../../../infra/fcm/fcm.service';
import { NotificationEntity, NotificationKind } from '../../domain/notification.entity';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../domain/ports/notification.repository';
import {
  INotificationUserPort,
  NOTIFICATION_USER_PORT,
} from '../../domain/ports/notification-user.port';

export interface SendNotificationCommand {
  userId: string;
  type: NotificationKind;
  title: string;
  body: string;
  data?: Record<string, string>;
  // When set, the inbox row is created only if no notification of the same type
  // (and optionally matching dataKey/dataValue) exists since `idempotencySince`.
  idempotencySince?: Date;
  idempotencyDataKey?: string;
  idempotencyDataValue?: string;
  // When false, skip the user-preference check (used for system-critical messages).
  // Defaults to true.
  respectPreferences?: boolean;
}

export interface SendNotificationResult {
  notification: NotificationEntity | null;
  delivered: boolean;
  skippedReason?: 'preference-off' | 'duplicate' | 'no-fcm-token' | 'fcm-not-configured';
}

@Injectable()
export class SendNotificationUseCase {
  private readonly logger = new Logger(SendNotificationUseCase.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: INotificationRepository,
    @Inject(NOTIFICATION_USER_PORT)
    private readonly userPort: INotificationUserPort,
    private readonly fcm: FcmService,
  ) {}

  async execute(cmd: SendNotificationCommand): Promise<SendNotificationResult> {
    const respect = cmd.respectPreferences ?? true;
    if (respect) {
      const enabled = await this.userPort.isEnabled(cmd.userId, cmd.type);
      if (!enabled) {
        return { notification: null, delivered: false, skippedReason: 'preference-off' };
      }
    }

    if (cmd.idempotencySince) {
      const dup = await this.repo.existsRecent({
        userId: cmd.userId,
        type: cmd.type,
        since: cmd.idempotencySince,
        dataKey: cmd.idempotencyDataKey,
        dataValue: cmd.idempotencyDataValue,
      });
      if (dup) {
        return { notification: null, delivered: false, skippedReason: 'duplicate' };
      }
    }

    const token = await this.userPort.getFcmToken(cmd.userId);
    let delivered = false;
    let sentAt: Date | null = null;
    let skippedReason: SendNotificationResult['skippedReason'];

    if (token === null) {
      skippedReason = 'no-fcm-token';
    } else {
      const result = await this.fcm.sendToToken(token, {
        title: cmd.title,
        body: cmd.body,
        data: cmd.data,
      });
      if (result.delivered) {
        delivered = true;
        sentAt = new Date();
      } else if (result.tokenInvalid) {
        await this.userPort.clearFcmToken(cmd.userId);
      } else if (result.skipped) {
        skippedReason = 'fcm-not-configured';
      }
    }

    const notification = await this.repo.create({
      userId: cmd.userId,
      type: cmd.type,
      title: cmd.title,
      body: cmd.body,
      data: cmd.data,
      sentAt,
    });

    return { notification, delivered, skippedReason };
  }
}
