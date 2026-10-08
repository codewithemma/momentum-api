import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { FollowUpReminderEmailTemplate } from './templates/follow-up-reminder.template.js';

@Injectable()
export class MailService {
  private transporter;
  private resend = new Resend(process.env.RESEND_API_KEY!);

  constructor() {
    if (process.env.NODE_ENV !== 'production') {
      this.transporter = nodemailer.createTransport({
        host: process.env.MAILTRAP_HOST,
        port: Number(process.env.MAILTRAP_PORT),
        auth: {
          user: process.env.MAILTRAP_USER,
          pass: process.env.MAILTRAP_PASSWORD,
        },
      });
    }
  }

  private async sendMail({
    to,
    subject,
    html,
  }: {
    to: string;
    subject: string;
    html: string;
  }) {
    if (process.env.NODE_ENV === 'production') {
      await this.resend.emails.send({
        from: 'Momentum <notifications@mail.codewithemma.dev>',
        to,
        subject,
        html,
      });

      return;
    }

    await this.transporter!.sendMail({
      from: 'Momentum <notifications@mail.codewithemma.dev>',
      to,
      subject,
      html,
    });
  }

  async sendFollowUpReminderEmail({
    email,
    dueToday,
    overdue,
  }: {
    email: string;
    dueToday: {
      id: string;
      name: string;
      company: string | null;
    }[];
    overdue: {
      id: string;
      name: string;
      company: string | null;
    }[];
  }) {
    const total = dueToday.length + overdue.length;

    if (total === 0) {
      return;
    }

    const subject =
      overdue.length > 0
        ? `${total} follow-up${total === 1 ? '' : 's'} need your attention`
        : `${dueToday.length} follow-up${dueToday.length === 1 ? '' : 's'} due today`;

    const html = FollowUpReminderEmailTemplate({
      dueToday,
      overdue,
      dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
    });

    await this.sendMail({
      to: email,
      subject,
      html,
    });
  }
}
