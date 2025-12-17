import { NextRequest, NextResponse } from 'next/server';

import { getAdminFromRequest } from '@/lib/admin/auth';
import { queryAdminOrders, type AdminOrderPaymentMethod, type AdminOrderStatus } from '@/lib/admin/orders';

const parseDate = (value: string | null) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export async function GET(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || '1');
  const pageSize = Number(searchParams.get('pageSize') || '10');
  const status = searchParams.get('status') as (AdminOrderStatus | 'all' | null);
  const method = searchParams.get('method') as (AdminOrderPaymentMethod | 'all' | null);
  const search = searchParams.get('search') || undefined;
  const startDate = parseDate(searchParams.get('startDate'));
  const endDate = parseDate(searchParams.get('endDate'));

  const result = queryAdminOrders({
    page,
    pageSize,
    status: status || undefined,
    method: method || undefined,
    search,
    startDate,
    endDate,
  });

  return NextResponse.json({ success: true, data: result });
}
