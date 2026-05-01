import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('email.host'),
      port: this.config.get<number>('email.port'),
      secure: this.config.get<boolean>('email.secure'),
      auth: {
        user: this.config.get<string>('email.user'),
        pass: this.config.get<string>('email.pass'),
      },
    });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const from = this.config.get<string>('email.from');

    const mailOptions = {
      from,
      to,
      subject: 'Zenda — Reset your password',
      text: this.buildResetEmailText(token),
      html: this.buildResetEmailHtml(token),
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}`, error);
      throw error;
    }
  }

  async sendOtpEmail(to: string, code: string): Promise<void> {
    const from = this.config.get<string>('email.from');
    const mailOptions = {
      from,
      to,
      subject: 'Zenda — Your verification code',
      text: `Your Zenda verification code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you did not request this, ignore this email.`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#10B981">Your Zenda verification code</h2>
          <p>Enter the 6-digit code below to reset your password.</p>
          <div style="background:#F0FDF4;border:1px solid #34D399;border-radius:8px;padding:20px;text-align:center;margin:24px 0">
            <span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#065F46">${code}</span>
          </div>
          <p style="color:#6B7280;font-size:14px">This code expires in <strong>15 minutes</strong>.</p>
          <p style="color:#6B7280;font-size:14px">If you did not request this, ignore this email — your account is safe.</p>
        </div>
      `,
    };
    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${to}`, error);
      throw error;
    }
  }

  private buildResetEmailText(token: string): string {
    return [
      'You requested a password reset for your Zenda account.',
      '',
      `Your reset code is: ${token}`,
      '',
      'Enter this code in the Zenda app on the "Reset Password" screen.',
      'This code expires in 1 hour.',
      '',
      'If you did not request this, ignore this email — your account is safe.',
    ].join('\n');
  }

  private buildResetEmailHtml(token: string): string {
    return `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#10B981">Reset your Zenda password</h2>
        <p>You requested a password reset. Enter the code below in the Zenda app.</p>
        <div style="background:#F0FDF4;border:1px solid #34D399;border-radius:8px;padding:20px;text-align:center;margin:24px 0">
          <span style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#065F46">${token}</span>
        </div>
        <p style="color:#6B7280;font-size:14px">This code expires in <strong>1 hour</strong>.</p>
        <p style="color:#6B7280;font-size:14px">If you did not request this, ignore this email — your account is safe.</p>
      </div>
    `;
  }
}
