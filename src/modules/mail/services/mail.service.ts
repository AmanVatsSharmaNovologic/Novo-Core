/**
 * @file mail.service.ts
 * @module modules/mail/services
 * @description Core email sending service using nodemailer with SMTP configuration
 * @author BharatERP
 * @created 2025-12-01
 */

import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AppConfig, CONFIG_DI_TOKEN } from '../../../shared/config/config.types';
import { LoggerService } from '../../../shared/logger';
import { RequestContext } from '../../../shared/request-context';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

@Injectable()
export class MailService implements OnModuleInit {
  private transporter: Transporter | null = null;

  constructor(
    @Inject(CONFIG_DI_TOKEN) private readonly config: AppConfig,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.mail) {
      this.logger.warn({}, 'Mail configuration not provided. Email sending will be disabled.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.mail.host,
        port: this.config.mail.port,
        secure: this.config.mail.secure,
        auth: {
          user: this.config.mail.user,
          pass: this.config.mail.password,
        },
      });

      // Verify connection
      await this.transporter.verify();
      this.logger.info({ host: this.config.mail.host, port: this.config.mail.port }, 'Mail service initialized successfully');
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to initialize mail service');
      this.transporter = null;
    }
  }

  /**
   * Send an email using the configured SMTP transporter
   */
  async sendEmail(options: SendEmailOptions): Promise<void> {
    if (!this.transporter) {
      const ctx = RequestContext.get();
      this.logger.warn(
        { requestId: ctx?.requestId, to: options.to },
        'Mail service not configured. Email not sent.',
      );
      return;
    }

    const ctx = RequestContext.get();
    const requestId = ctx?.requestId;

    try {
      const mailOptions = {
        from: `"${this.config.mail!.fromName}" <${this.config.mail!.from}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.info(
        { requestId, to: options.to, messageId: info.messageId },
        'Email sent successfully',
      );
    } catch (error) {
      this.logger.error(
        { requestId, err: error, to: options.to },
        'Failed to send email',
      );
      throw error;
    }
  }

  /**
   * Load and render an email template with variables
   */
  loadTemplate(templateName: string, variables: Record<string, string>): { html: string; text: string } {
    const templateDir = join(__dirname, '../templates');
    
    try {
      let html = readFileSync(join(templateDir, `${templateName}.html`), 'utf-8');
      let text = readFileSync(join(templateDir, `${templateName}.txt`), 'utf-8');

      // Simple template variable replacement
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, value);
        text = text.replace(regex, value);
      });

      return { html, text };
    } catch (error) {
      this.logger.error({ err: error, templateName }, 'Failed to load email template');
      throw new Error(`Failed to load email template: ${templateName}`);
    }
  }

  /**
   * Send a verification email with a verification link
   */
  async sendVerificationEmail(email: string, verificationUrl: string): Promise<void> {
    const year = new Date().getFullYear().toString();
    const { html, text } = this.loadTemplate('verification-email', {
      verificationUrl,
      year,
    });

    await this.sendEmail({
      to: email,
      subject: 'Verify Your Email Address - NovoLogic',
      html,
      text,
    });
  }
}

