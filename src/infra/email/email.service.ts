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
      subject: 'Zenda - Restablece tu contrasena',
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
      subject: 'Zenda - Tu codigo de verificacion',
      text: `Tu codigo de verificacion de Zenda es: ${code}\n\nEste codigo expira en 15 minutos.\n\nSi no solicitaste este codigo, ignora este correo.`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#10B981">Tu codigo de verificacion de Zenda</h2>
          <p>Ingresa el codigo de 6 digitos para restablecer tu contrasena.</p>
          <div style="background:#F0FDF4;border:1px solid #34D399;border-radius:8px;padding:20px;text-align:center;margin:24px 0">
            <span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#065F46">${code}</span>
          </div>
          <p style="color:#6B7280;font-size:14px">Este codigo expira en <strong>15 minutos</strong>.</p>
          <p style="color:#6B7280;font-size:14px">Si no solicitaste este codigo, ignora este correo — tu cuenta esta segura.</p>
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

  async sendAccountVerificationEmail(to: string, code: string): Promise<void> {
    const from = this.config.get<string>('email.from');
    const mailOptions = {
      from,
      to,
      subject: 'Zenda - Verifica tu cuenta',
      text:
        `Tu codigo de verificacion de Zenda es: ${code}\n\n` +
        'Este codigo expira en 15 minutos.\n\n' +
        'Si no creaste una cuenta en Zenda, ignora este correo.',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#10B981">Verifica tu cuenta de Zenda</h2>
          <p>Ingresa el codigo de 6 digitos en la app para activar tu cuenta.</p>
          <div style="background:#F0FDF4;border:1px solid #34D399;border-radius:8px;padding:20px;text-align:center;margin:24px 0">
            <span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#065F46">${code}</span>
          </div>
          <p style="color:#6B7280;font-size:14px">Este codigo expira en <strong>15 minutos</strong>.</p>
          <p style="color:#6B7280;font-size:14px">Si no creaste una cuenta en Zenda, ignora este correo.</p>
        </div>
      `,
    };
    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Account verification email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send account verification email to ${to}`, error);
      throw error;
    }
  }

  private buildResetEmailText(token: string): string {
    return [
      'Solicitaste restablecer la contrasena de tu cuenta de Zenda.',
      '',
      `Tu codigo de restablecimiento es: ${token}`,
      '',
      'Ingresa este codigo en la app de Zenda, en la pantalla "Restablecer contrasena".',
      'Este codigo expira en 1 hora.',
      '',
      'Si no solicitaste este cambio, ignora este correo — tu cuenta esta segura.',
    ].join('\n');
  }

  private buildResetEmailHtml(token: string): string {
    return `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#10B981">Restablece tu contrasena de Zenda</h2>
        <p>Solicitaste restablecer tu contrasena. Ingresa el siguiente codigo en la app de Zenda.</p>
        <div style="background:#F0FDF4;border:1px solid #34D399;border-radius:8px;padding:20px;text-align:center;margin:24px 0">
          <span style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#065F46">${token}</span>
        </div>
        <p style="color:#6B7280;font-size:14px">Este codigo expira en <strong>1 hora</strong>.</p>
        <p style="color:#6B7280;font-size:14px">Si no solicitaste este cambio, ignora este correo — tu cuenta esta segura.</p>
      </div>
    `;
  }
}
