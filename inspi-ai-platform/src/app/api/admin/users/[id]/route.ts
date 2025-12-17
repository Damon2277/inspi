import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

import { getAdminFromRequest } from '@/lib/admin/auth';
import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    await connectDB();
    const user = await (User.findById as any)(params.id).select('-password').lean();
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('Failed to load admin user detail:', error);
    return NextResponse.json({ error: '加载用户详情失败' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  let payload: Record<string, any> | null = null;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }

  await connectDB();

  const updates: Record<string, any> = {};

  if (typeof payload?.name === 'string') {
    updates.name = payload.name.trim();
  }

  if (typeof payload?.email === 'string') {
    const email = payload.email.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: '邮箱不能为空' }, { status: 400 });
    }
    const existing = await (User.findOne as any)({ email, _id: { $ne: params.id } });
    if (existing) {
      return NextResponse.json({ error: '该邮箱已被占用' }, { status: 409 });
    }
    updates.email = email;
  }

  if (typeof payload?.isBlocked === 'boolean') {
    updates.isBlocked = payload.isBlocked;
  }

  if (typeof payload?.emailVerified === 'boolean') {
    updates.emailVerified = payload.emailVerified;
    updates.emailVerifiedAt = payload.emailVerified ? new Date() : null;
  }

  if (typeof payload?.subscriptionTier === 'string') {
    updates.subscriptionTier = payload.subscriptionTier;
    updates['subscription.tier'] = payload.subscriptionTier;
    updates['subscription.plan'] = payload.subscriptionTier;
  }

  if (typeof payload?.subscriptionStatus === 'string') {
    updates.subscriptionStatus = payload.subscriptionStatus;
    updates['subscription.status'] = payload.subscriptionStatus;
  }

  if (payload?.subscription?.endDate) {
    updates['subscription.endDate'] = payload.subscription.endDate;
  }

  if (Array.isArray(payload?.roles)) {
    updates.roles = payload.roles;
  }

  if (Array.isArray(payload?.permissions)) {
    updates.permissions = payload.permissions;
  }

  if (payload?.metadata) {
    updates.metadata = payload.metadata;
  }

  if (payload?.usage) {
    updates.usage = {
      dailyGenerations: payload.usage.dailyGenerations ?? 0,
      dailyReuses: payload.usage.dailyReuses ?? 0,
      lastResetDate: payload.usage.lastResetDate ? new Date(payload.usage.lastResetDate) : new Date(),
    };
  }

  if (typeof payload?.password === 'string' && payload.password.trim()) {
    const hashedPassword = await bcrypt.hash(payload.password.trim(), 12);
    updates.password = hashedPassword;
  }

  updates.updatedAt = new Date();

  try {
    const updatedUser = await (User.findByIdAndUpdate as any)(
      params.id,
      { $set: updates },
      { new: true, runValidators: true },
    ).select('-password');

    if (!updatedUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Failed to update admin user:', error);
    return NextResponse.json({ error: '更新用户失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    await connectDB();
    const deleted = await (User.findByIdAndDelete as any)(params.id);
    if (!deleted) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete admin user:', error);
    return NextResponse.json({ error: '删除用户失败' }, { status: 500 });
  }
}
