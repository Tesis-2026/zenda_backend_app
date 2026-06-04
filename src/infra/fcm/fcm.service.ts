import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export interface FcmPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface FcmSendResult {
  delivered: boolean;
  // Set when FCM responded with an invalid-token error so callers can clear
  // the stored token from the user record.
  tokenInvalid?: boolean;
  // Skipped because Firebase isn't configured. The inbox row should still be
  // written so the user sees the notification next time they open the app.
  skipped?: boolean;
}

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private app: admin.app.App | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.tryInit();
  }

  private tryInit(): void {
    if (this.app) return;
    if (admin.apps.length > 0) {
      this.app = admin.apps[0] ?? null;
      return;
    }

    const projectId = (this.config.get<string>('fcm.projectId') ?? '').trim();
    const clientEmail = (this.config.get<string>('fcm.clientEmail') ?? '').trim();
    const privateKey = (this.config.get<string>('fcm.privateKey') ?? '').trim();

    const placeholders = ['your-firebase-project-id', 'firebase-adminsdk-xxxx@your-project.iam.gserviceaccount.com'];
    const isPlaceholder =
      placeholders.includes(projectId) ||
      placeholders.includes(clientEmail) ||
      privateKey.includes('your-key-here');

    if (!projectId || !clientEmail || !privateKey || isPlaceholder) {
      this.logger.warn(
        'FCM not configured (FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY missing or placeholder). Notifications are inbox-only.',
      );
      return;
    }

    try {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
      this.logger.log(`Firebase Admin SDK initialized for project ${projectId}`);
    } catch (err) {
      this.logger.error('Failed to initialize Firebase Admin SDK', err);
      this.app = null;
    }
  }

  get isConfigured(): boolean {
    return this.app !== null;
  }

  async sendToToken(token: string, payload: FcmPayload): Promise<FcmSendResult> {
    if (!this.app) {
      return { delivered: false, skipped: true };
    }
    if (!token || token.trim().length === 0) {
      return { delivered: false };
    }

    try {
      await this.app.messaging().send({
        token,
        notification: { title: payload.title, body: payload.body },
        data: payload.data ?? {},
        android: { priority: 'high' },
      });
      return { delivered: true };
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      const isInvalidToken =
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/invalid-argument';
      if (isInvalidToken) {
        this.logger.warn(`FCM token rejected (${code}); caller should clear it`);
        return { delivered: false, tokenInvalid: true };
      }
      this.logger.error('FCM send failed', err);
      return { delivered: false };
    }
  }
}
