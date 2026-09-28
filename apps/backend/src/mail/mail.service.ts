import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const host = this.configService.get<string>('MAIL_HOST');
    const port = this.configService.get<number>('MAIL_PORT') || 587;
    const secure = this.configService.get<string>('MAIL_SECURE') === 'true' || Number(port) === 465;
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASS');

    if (!user || !pass) {
      this.logger.warn('Credenciales SMTP no configuradas. Los correos se registrarán en consola.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: host || 'smtp.gmail.com',
      port: Number(port),
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  async sendVerificationCode(to: string, code: string): Promise<boolean> {
    const subject = 'Verifica tu correo electrónico - Flujo Fino';
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Flujo Fino</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Confirmación de identidad</p>
        </div>
        <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 12px; color: #334155; font-size: 15px; font-weight: 500;">Tu código de verificación de 6 dígitos es:</p>
          <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #10b981; margin: 12px 0;">${code}</div>
          <p style="margin: 12px 0 0; color: #94a3b8; font-size: 12px;">Este código vence en 15 minutos.</p>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
          Si tú no solicitaste este código, puedes ignorar este mensaje de manera segura.
        </p>
      </div>
    `;

    return this.sendMail(to, subject, html);
  }

  async sendPasswordResetCode(to: string, code: string): Promise<boolean> {
    const subject = 'Recuperación de contraseña - Flujo Fino';
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Flujo Fino</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Recuperación de contraseña</p>
        </div>
        <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 12px; color: #334155; font-size: 15px; font-weight: 500;">Has solicitado restablecer tu contraseña. Tu código es:</p>
          <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0284c7; margin: 12px 0;">${code}</div>
          <p style="margin: 12px 0 0; color: #94a3b8; font-size: 12px;">Este código vence en 15 minutos.</p>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
          Si no realizaste esta solicitud, puedes ignorar este mensaje o contactar a soporte.
        </p>
      </div>
    `;

    return this.sendMail(to, subject, html);
  }

  private async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    const from = this.configService.get<string>('MAIL_FROM') || this.configService.get<string>('MAIL_USER') || 'no-reply@flujofino.com';

    if (!this.transporter) {
      this.logger.log(`[SIMULATED MAIL] To: ${to} | Subject: ${subject}`);
      return true;
    }

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      return true;
    } catch (error) {
      this.logger.error(`Error enviando correo a ${to}:`, error);
      return false;
    }
  }
}
