import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from = this.config.get<string>('MAIL_FROM', 'DonNation <noreply@donnation.local>');
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const subject = 'Réinitialisation de votre mot de passe DonNation';
    const html = `
      <p>Bonjour,</p>
      <p>Vous avez demandé la réinitialisation de votre mot de passe DonNation.</p>
      <p><a href="${resetUrl}">Cliquez ici pour choisir un nouveau mot de passe</a></p>
      <p>Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      <p>— L'équipe DonNation</p>
    `;
    const text = `Réinitialisez votre mot de passe : ${resetUrl}`;

    if (this.resend) {
      await this.resend.emails.send({ from: this.from, to, subject, html, text });
      return;
    }

    const smtpHost = this.config.get<string>('SMTP_HOST');
    if (!smtpHost) {
      this.logger.warn(`Mail not configured — password reset link for ${to}: ${resetUrl}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(this.config.get<string>('SMTP_PORT', '587')),
      secure: this.config.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });

    await transporter.sendMail({ from: this.from, to, subject, html, text });
  }
}
