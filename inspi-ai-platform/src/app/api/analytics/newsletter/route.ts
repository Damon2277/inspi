import { NextRequest, NextResponse } from 'next/server';

import { collectWeeklyMetrics } from '@/lib/notifications/newsletter-metrics';
import { evaluateNewsletterTrigger } from '@/lib/notifications/newsletter-service';

export async function GET(_request: NextRequest) {
  const metrics = await collectWeeklyMetrics();
  if (!metrics) {
    return NextResponse.json({ success: false, error: 'Metrics unavailable' }, { status: 500 });
  }

  const result = await evaluateNewsletterTrigger({
    newCards: metrics.newCards,
    newUsers: metrics.newUsers,
    periodLabel: `${metrics.periodStart.toISOString()} – ${metrics.periodEnd.toISOString()}`,
  });

  return NextResponse.json({ success: true, result });
}
