import { NextRequest, NextResponse } from 'next/server';

import { getAdminFromRequest } from '@/lib/admin/auth';
import {
  getAdminOrder,
  mutateAdminOrder,
  type AdminOrderStatus,
} from '@/lib/admin/orders';

const ORDER_ACTIONS = new Set(['mark_paid', 'mark_refunded', 'cancel']);
const ORDER_STATUSES: AdminOrderStatus[] = ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'];

const isValidStatus = (value: unknown): value is AdminOrderStatus =>
  typeof value === 'string' && (ORDER_STATUSES as string[]).includes(value);

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(_request);
  if (!admin) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const order = getAdminOrder(params.id);
  if (!order) {
    return NextResponse.json({ error: '订单不存在' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: order });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }

  const status = payload?.status;
  const note = typeof payload?.note === 'string' ? payload.note : undefined;
  const action = typeof payload?.action === 'string' ? payload.action : undefined;

  const mutation: { status?: AdminOrderStatus; note?: string; action?: 'mark_paid' | 'mark_refunded' | 'cancel'; operator: string } = {
    operator: admin.name,
  };

  if (isValidStatus(status)) {
    mutation.status = status;
  }
  if (note) {
    mutation.note = note;
  }
  if (action && ORDER_ACTIONS.has(action)) {
    mutation.action = action as any;
  }

  if (!mutation.status && !mutation.action && !mutation.note) {
    return NextResponse.json({ error: '缺少可执行的更新内容' }, { status: 400 });
  }

  const updated = mutateAdminOrder(params.id, mutation);
  if (!updated) {
    return NextResponse.json({ error: '订单不存在' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: updated });
}
