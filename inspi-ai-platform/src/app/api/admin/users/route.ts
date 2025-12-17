import bcrypt from 'bcryptjs';
import type { FilterQuery } from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

import { getAdminFromRequest } from '@/lib/admin/auth';
import User, { UserDocument } from '@/lib/models/User';
import connectDB from '@/lib/mongodb';

const SORTABLE_FIELDS = new Set(['createdAt', 'updatedAt', 'name', 'email', 'lastLoginAt', 'subscriptionTier']);

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function GET(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(request.url);
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
  const pageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '20', 10), 1), 100);
  const search = searchParams.get('search')?.trim();
  const status = searchParams.get('status');
  const tier = searchParams.get('tier');
  const subscriptionStatus = searchParams.get('subscriptionStatus');

  const filter: FilterQuery<UserDocument> = {};
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ email: regex }, { name: regex }];
  }
  if (status === 'blocked') {
    filter.isBlocked = true;
  } else if (status === 'active') {
    filter.isBlocked = false;
  }
  if (tier) {
    filter.subscriptionTier = tier as any;
  }
  if (subscriptionStatus) {
    filter.subscriptionStatus = subscriptionStatus as any;
  }

  const sortByParam = searchParams.get('sortBy') || 'createdAt';
  const sortField = SORTABLE_FIELDS.has(sortByParam) ? sortByParam : 'createdAt';
  const sortOrderParam = (searchParams.get('sortOrder') || 'desc').toLowerCase();
  const sortOrder = sortOrderParam === 'asc' ? 1 : -1;

  const skip = (page - 1) * pageSize;

  try {
    const [users, total] = await Promise.all([
      (User.find(filter) as any)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(pageSize)
        .select('-password')
        .lean(),
      User.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: users,
        page,
        pageSize,
        total,
        hasMore: skip + users.length < total,
      },
    });
  } catch (error) {
    console.error('Failed to fetch admin users:', error);
    return NextResponse.json({ error: '加载用户列表失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  let payload: Partial<UserDocument> & { password?: string } | null = null;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }

  const email = payload?.email?.toString().trim().toLowerCase();
  const name = payload?.name?.toString().trim();
  const password = payload?.password?.toString();
  const subscriptionTier = payload?.subscriptionTier || 'free';

  if (!email || !password) {
    return NextResponse.json({ error: '邮箱和密码为必填项' }, { status: 400 });
  }

  await connectDB();

  const existing = await (User.findOne as any)({ email });
  if (existing) {
    return NextResponse.json({ error: '该邮箱已存在' }, { status: 409 });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const now = new Date();
    const baseSubscription = {
      plan: subscriptionTier,
      status: payload?.subscriptionStatus || 'active',
      tier: subscriptionTier,
      startDate: now,
      endDate: payload?.subscription?.endDate ?? null,
      features: payload?.subscription?.features || {},
      quotas: payload?.subscription?.quotas || {},
      metadata: payload?.subscription?.metadata || {},
    } as UserDocument['subscription'];

    const createdUser = await (User.create as any)({
      email,
      name: name || email.split('@')[0],
      password: hashedPassword,
      emailVerified: payload?.emailVerified ?? true,
      emailVerifiedAt: payload?.emailVerified ? now : null,
      subscription: { ...baseSubscription },
      subscriptionTier,
      subscriptionStatus: baseSubscription.status,
      usage: payload?.usage || {
        dailyGenerations: 0,
        dailyReuses: 0,
        lastResetDate: now,
      },
      roles: Array.isArray(payload?.roles) && payload.roles.length ? payload.roles : ['user'],
      permissions: Array.isArray(payload?.permissions) ? payload.permissions : [],
      isBlocked: payload?.isBlocked ?? false,
      settings: payload?.settings || {
        emailNotifications: true,
        publicProfile: true,
      },
      metadata: payload?.metadata || {},
    });

    const result = createdUser.toObject();
    delete result.password;

    return NextResponse.json({
      success: true,
      data: result,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create admin user:', error);
    return NextResponse.json({ error: '创建用户失败' }, { status: 500 });
  }
}
