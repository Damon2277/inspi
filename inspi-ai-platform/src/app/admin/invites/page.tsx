'use client';

import React from 'react';

import { AdminGuard } from '@/components/admin/AdminGuard';
import { InviteManagement } from '@/components/admin/InviteManagement';

export default function AdminInvitesPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="border-4 border-dashed border-gray-200 rounded-lg">
              <InviteManagement />
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
