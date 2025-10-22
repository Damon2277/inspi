/**
 * Newsletter 调度服务
 * 负责根据运营指标决定是否发送周报邮件
 */

import { emailService } from '@/lib/email/service';
import { logger } from '@/shared/utils/logger';

export interface NewsletterMetrics {
  newCards: number;
  newUsers: number;
  periodLabel: string;
}

export interface NewsletterTriggerResult {
  shouldSend: boolean;
  reason: 'threshold_met' | 'below_minimum' | 'no_schedule';
  metrics: NewsletterMetrics;
  scheduledAt?: Date;
}

export const WEEKLY_THRESHOLD = {
  cards: 100,
  users: 100,
};

export const WEEKLY_MINIMUM = {
  cards: 30,
  users: 50,
};

export interface NewsletterScheduleOptions {
  metrics: NewsletterMetrics;
  subscribers: Array<{ email: string; name?: string }>;
  template?: {
    subject: string;
    html: string;
    text?: string;
  };
  dryRun?: boolean;
}

const defaultTemplate = ({ metrics }: { metrics: NewsletterMetrics }) => ({
  subject: `Inspi.AI 周报 ｜ ${metrics.periodLabel}`,
  html: `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 640px; margin: 0 auto;">
      <h1 style="font-size: 24px; font-weight: 700; color: #2563eb;">Inspi.AI 每周进展速递</h1>
      <p style="font-size: 16px;">本周老师们共发布 <strong>${metrics.newCards}</strong> 张教学卡片，<strong>${metrics.newUsers}</strong> 位新老师加入了共创。</p>
      <p style="font-size: 16px;">我们精选了最新的课堂案例和上线能力，请继续关注。</p>
      <p style="font-size: 14px; color: #6b7280;">如需退订，请在设置中心更新通知偏好。</p>
    </div>
  `,
  text: `Inspi.AI 周报\n\n本周老师们共发布 ${metrics.newCards} 张教学卡片，${metrics.newUsers} 位新老师加入共创。\n我们精选了最新的课堂案例和上线能力，请继续关注。`,
});

export const WEEKLY_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

let lastSentAt: Date | null = null;

export async function evaluateNewsletterTrigger(metrics: NewsletterMetrics): Promise<NewsletterTriggerResult> {
  const { newCards, newUsers } = metrics;

  if (lastSentAt && Date.now() - lastSentAt.getTime() < WEEKLY_COOLDOWN_MS) {
    return {
      shouldSend: false,
      reason: 'no_schedule',
      metrics,
      scheduledAt: lastSentAt,
    };
  }

  if (newCards < WEEKLY_MINIMUM.cards && newUsers < WEEKLY_MINIMUM.users) {
    return {
      shouldSend: false,
      reason: 'below_minimum',
      metrics,
    };
  }

  if (newCards < WEEKLY_THRESHOLD.cards && newUsers < WEEKLY_THRESHOLD.users) {
    return {
      shouldSend: false,
      reason: 'below_minimum',
      metrics,
    };
  }

  const scheduledAt = new Date();
  lastSentAt = scheduledAt;

  return {
    shouldSend: true,
    reason: 'threshold_met',
    metrics,
    scheduledAt,
  };
}

export async function sendWeeklyNewsletter(options: NewsletterScheduleOptions): Promise<boolean> {
  const { metrics, subscribers, template, dryRun } = options;

  if (!subscribers || subscribers.length === 0) {
    logger.warn('Newsletter skipped - no subscribers', { metrics });
    return false;
  }

  const content = template ?? defaultTemplate({ metrics });

  if (dryRun) {
    logger.info('Newsletter dry run', {
      subscribers: subscribers.length,
      subject: content.subject,
      metrics,
    });
    return true;
  }

  const recipientList = subscribers.map(sub => sub.email);

  const result = await emailService.sendEmail({
    to: recipientList,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });

  if (!result.success) {
    logger.error('Failed to send newsletter', {
      metrics,
      error: result.error,
    });
    return false;
  }

  logger.info('Newsletter sent', {
    metrics,
    subscribers: recipientList.length,
    messageId: result.messageId,
  });

  return true;
}

export function resetNewsletterSchedule() {
  lastSentAt = null;
}

export function getLastNewsletterSentAt() {
  return lastSentAt;
}
