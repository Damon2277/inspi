import { NextRequest, NextResponse } from 'next/server';

import { collectWeeklyMetrics } from '@/lib/notifications/newsletter-metrics';
import { evaluateNewsletterTrigger, sendWeeklyNewsletter } from '@/lib/notifications/newsletter-service';

const mockSubscribers = [
  { email: 'teacher1@example.com', name: '张老师' },
  { email: 'teacher2@example.com', name: '李老师' },
];

export async function GET() {
  const metrics = await collectWeeklyMetrics();
  if (!metrics) {
    return NextResponse.json({ success: false, error: 'Metrics unavailable' }, { status: 500 });
  }

  const trigger = await evaluateNewsletterTrigger({
    newCards: metrics.newCards,
    newUsers: metrics.newUsers,
    periodLabel: `${metrics.periodStart.toISOString()} – ${metrics.periodEnd.toISOString()}`,
  });

  return NextResponse.json({ success: true, trigger });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { dryRun = true } = body as { dryRun?: boolean };

  const metrics = await collectWeeklyMetrics();
  if (!metrics) {
    return NextResponse.json({ success: false, error: 'Metrics unavailable' }, { status: 500 });
  }

  const trigger = await evaluateNewsletterTrigger({
    newCards: metrics.newCards,
    newUsers: metrics.newUsers,
    periodLabel: `${metrics.periodStart.toISOString()} – ${metrics.periodEnd.toISOString()}`,
  });

  if (!trigger.shouldSend) {
    return NextResponse.json({ success: false, trigger }, { status: 200 });
  }

  const sent = await sendWeeklyNewsletter({
    metrics: {
      newCards: trigger.metrics.newCards,
      newUsers: trigger.metrics.newUsers,
      periodLabel: trigger.metrics.periodLabel,
    },
    subscribers: mockSubscribers,
    dryRun,
  });

  return NextResponse.json({ success: sent, trigger, dryRun });
}
