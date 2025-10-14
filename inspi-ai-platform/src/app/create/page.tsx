'use client';

import React from 'react';

import { AuthProviders } from '@/components/auth/AuthProviders';
import { DesktopCreatePage } from '@/components/desktop/pages/DesktopCreatePage';
import { AppLayout } from '@/components/layout';

export default function CreatePage() {
  return (
    <AppLayout>
      <AuthProviders>
        <DesktopCreatePage />
      </AuthProviders>
    </AppLayout>
  );
}
