import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly appUrl: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('app.email.resendApiKey', '');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from = config.get<string>('app.email.fromAddress', 'GymSaaS <noreply@gymsaas.com>');
    this.appUrl = config.get<string>('app.appUrl', 'http://localhost:3001');
  }

  async sendGymOwnerActivation(params: {
    to: string;
    ownerName: string;
    gymName: string;
    inviteToken: string;
  }): Promise<void> {
    const url = `${this.appUrl}/activate?token=${params.inviteToken}`;
    await this.send({
      to: params.to,
      subject: `Activate your gym on GymSaaS — ${params.gymName}`,
      html: this.gymOwnerTemplate(params.ownerName, params.gymName, url),
    });
  }

  async sendStaffInvitation(params: {
    to: string;
    staffName: string;
    gymName: string;
    role: string;
    inviteToken: string;
  }): Promise<void> {
    const url = `${this.appUrl}/activate?token=${params.inviteToken}`;
    await this.send({
      to: params.to,
      subject: `You've been invited to join ${params.gymName}`,
      html: this.staffInviteTemplate(params.staffName, params.gymName, params.role, url),
    });
  }

  async sendMemberWelcome(params: {
    to: string;
    memberName: string;
    gymName: string;
    inviteToken: string;
  }): Promise<void> {
    const url = `${this.appUrl}/activate?token=${params.inviteToken}`;
    await this.send({
      to: params.to,
      subject: `Welcome to ${params.gymName}`,
      html: this.memberWelcomeTemplate(params.memberName, params.gymName, url),
    });
  }

  private async send(opts: { to: string; subject: string; html: string }): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`[EMAIL SKIPPED — no RESEND_API_KEY] To: ${opts.to} | Subject: ${opts.subject}`);
      return;
    }
    this.logger.log(`Sending email to ${opts.to} | Subject: ${opts.subject}`);
    await this.resend.emails.send({
      from: this.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
  }

  private gymOwnerTemplate(ownerName: string, gymName: string, url: string): string {
    return `
      <p>Hi ${ownerName},</p>
      <p>Your gym <strong>${gymName}</strong> has been created on GymSaaS.</p>
      <p>Click the button below to activate your account and set your password.</p>
      <p><a href="${url}" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;">Activate Account</a></p>
      <p>This link expires in 72 hours.</p>
    `;
  }

  private staffInviteTemplate(name: string, gymName: string, role: string, url: string): string {
    return `
      <p>Hi ${name},</p>
      <p>You've been invited to join <strong>${gymName}</strong> as <strong>${role.replace(/_/g, ' ')}</strong>.</p>
      <p><a href="${url}" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;">Accept Invitation</a></p>
      <p>This link expires in 72 hours.</p>
    `;
  }

  private memberWelcomeTemplate(name: string, gymName: string, url: string): string {
    return `
      <p>Hi ${name},</p>
      <p>Welcome to <strong>${gymName}</strong>!</p>
      <p>Click below to activate your account and access the member app.</p>
      <p><a href="${url}" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;">Activate Account</a></p>
      <p>This link expires in 72 hours.</p>
    `;
  }
}
