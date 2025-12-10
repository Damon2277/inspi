'use client';

import React from 'react';

import { AuthProviders } from '@/components/auth/AuthProviders';
import { DesktopCreatePage } from '@/components/desktop/pages/DesktopCreatePage';
import { WeeklyAnnouncement } from '@/components/feedback/WeeklyAnnouncement';
import { AppLayout } from '@/components/layout';

export default function CreatePage() {
  return (
    <AppLayout maxWidth="full">
      <WeeklyAnnouncement />
      <AuthProviders>
        <DesktopCreatePage />
      </AuthProviders>
    </AppLayout>
  );
}
