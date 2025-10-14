'use client';

import React from 'react';

import { DesktopHomePage } from '@/components/desktop/pages/DesktopHomePage';
import { AppLayout } from '@/components/layout';

export default function HomePage() {
  return (
    <AppLayout>
      <DesktopHomePage />
    </AppLayout>
  );
}
