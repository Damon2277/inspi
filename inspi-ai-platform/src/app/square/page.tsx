'use client';

import React from 'react';

import { DesktopSquarePage } from '@/components/desktop/pages/DesktopSquarePage';
import { AppLayout } from '@/components/layout';

export default function SquarePage() {
  return (
    <AppLayout>
      <DesktopSquarePage />
    </AppLayout>
  );
}
