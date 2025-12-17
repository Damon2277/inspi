'use client';

import React from 'react';

import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AdminGuard } from '@/components/admin/AdminGuard';

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminDashboard />
    </AdminGuard>
  );
}
