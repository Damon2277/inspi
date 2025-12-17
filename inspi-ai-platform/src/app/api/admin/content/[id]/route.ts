import { NextRequest, NextResponse } from 'next/server';

import { getAdminFromRequest } from '@/lib/admin/auth';
import { serializeAdminWork } from '@/lib/admin/work-utils';
import Work from '@/lib/models/Work';
import connectDB from '@/lib/mongodb';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  await connectDB();

  const record = await Work.findById(params.id).populate('author', 'name email avatar').lean();
  if (!record) {
    return NextResponse.json({ error: '内容不存在' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: serializeAdminWork(record) });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  await connectDB();

  const deleted = await Work.findByIdAndDelete(params.id);
  if (!deleted) {
    return NextResponse.json({ error: '内容不存在' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
