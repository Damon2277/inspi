'use client';

import { AppLayout } from '@/components/layout';
import { SubscriptionManagement } from '@/components/subscription/SubscriptionManagement';

export default function SubscriptionPage() {
  return (
    <AppLayout>
      <SubscriptionManagement />
    </AppLayout>
  );
}
