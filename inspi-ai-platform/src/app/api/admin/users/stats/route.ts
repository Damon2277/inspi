import { NextRequest, NextResponse } from 'next/server';

import { getAdminFromRequest } from '@/lib/admin/auth';
import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function buildDateLabel(date: Date) {
  return date.toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  await connectDB();

  const now = new Date();
  const todayStart = startOfDay(now);
  const sevenDaysAgo = new Date(todayStart.getTime() - 6 * DAY_IN_MS);
  const previousWeekStart = new Date(sevenDaysAgo.getTime() - 7 * DAY_IN_MS);
  const activeSince = new Date(now.getTime() - 30 * DAY_IN_MS);

  try {
    const [
      totalUsers,
      blockedUsers,
      verifiedUsers,
      activeUsers,
      newUsersToday,
      newUsers7Days,
      newUsersPrevWeek,
      trendRaw,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isBlocked: true }),
      User.countDocuments({ emailVerified: true }),
      User.countDocuments({ isBlocked: false, lastLoginAt: { $gte: activeSince } }),
      User.countDocuments({ createdAt: { $gte: todayStart } }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      User.countDocuments({
        createdAt: {
          $gte: previousWeekStart,
          $lt: sevenDaysAgo,
        },
      }),
      (User.aggregate as any)([
        { $match: { createdAt: { $gte: previousWeekStart } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
                timezone: 'Asia/Shanghai',
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const trendMap = new Map<string, number>();
    for (const row of trendRaw) {
      trendMap.set(row._id, row.count);
    }

    const trend: Array<{ date: string; value: number }> = [];
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(sevenDaysAgo.getTime() + i * DAY_IN_MS);
      trend.push({ date: buildDateLabel(date), value: trendMap.get(buildDateLabel(date)) || 0 });
    }

    const newUsersThisWeek = newUsers7Days;
    const weekGrowth = newUsersPrevWeek === 0
      ? null
      : Number((((newUsersThisWeek - newUsersPrevWeek) / newUsersPrevWeek) * 100).toFixed(1));

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        blockedUsers,
        verifiedUsers,
        newUsersToday,
        newUsers7Days,
        weekGrowth,
        trend,
      },
    });
  } catch (error) {
    console.error('Failed to load admin user stats:', error);
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 });
  }
}
