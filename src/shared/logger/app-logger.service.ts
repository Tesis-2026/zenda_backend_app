import { ConsoleLogger, Injectable } from '@nestjs/common';

@Injectable()
export class AppLogger extends ConsoleLogger {
  log(message: string, context?: string) {
    super.log(this.toJson('info', message, context), context);
  }

  error(message: string, trace?: string, context?: string) {
    super.error(this.toJson('error', message, context), trace, context);
  }

  warn(message: string, context?: string) {
    super.warn(this.toJson('warn', message, context), context);
  }

  private toJson(level: 'info' | 'warn' | 'error', message: string, context?: string): string {
    return JSON.stringify({
      level,
      message,
      context: context ?? 'Application',
      timestamp: new Date().toISOString(),
    });
  }
}
