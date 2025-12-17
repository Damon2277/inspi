import type { FilterQuery } from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

import { getAdminFromRequest } from '@/lib/admin/auth';
import { serializeAdminWork } from '@/lib/admin/work-utils';
import Work, { type WorkDocument } from '@/lib/models/Work';
import connectDB from '@/lib/mongodb';

const STATUS_SET = new Set(['draft', 'published', 'archived', 'private']);

export async function GET(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(request.url);
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
  const pageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '10', 10), 1), 50);
  const search = searchParams.get('search')?.trim();
  const status = searchParams.get('status');
  const subject = searchParams.get('subject');

  const filter: FilterQuery<WorkDocument> = {};
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { knowledgePoint: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }
  if (status && STATUS_SET.has(status)) {
    filter.status = status as WorkDocument['status'];
  }
  if (subject) {
    filter.subject = subject;
  }

  const skip = (page - 1) * pageSize;

  try {
    const [works, total] = await Promise.all([
      Work.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate('author', 'name email avatar')
        .lean(),
      Work.countDocuments(filter),
    ]);

    const items = works.map(work => serializeAdminWork(work));

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error('Failed to load admin content list:', error);
    return NextResponse.json({ error: '加载内容列表失败' }, { status: 500 });
  }
}
