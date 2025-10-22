'use client';

import React from 'react';

import { AppLayout } from '@/components/layout';
import { AccountSettingsPanel } from '@/components/profile/AccountSettingsPanel';

export default function SettingsPage() {
  return (
    <AppLayout>
      <AccountSettingsPanel />
    </AppLayout>
  );
}

