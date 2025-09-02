/**
 * 作品挂载管理 API 路由
 * 处理特定挂载记录的删除操作
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { WorkMountService } from '@/lib/services/knowledgeGraphService';
import { handleServiceError } from '@/lib/utils/errorHandler';

/**
 * DELETE /api/knowledge-graph/[id]/works/[mountId]
 * 取消作品挂载
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; mountId: string } }
) {
  try {
    const user = await requireAuth(request);
    const { mountId } = params;

    await WorkMountService.unmountWork(user.id, mountId);
    
    return NextResponse.json({
      success: true,
      message: '作品挂载取消成功'
    });
  } catch (error) {
    return handleServiceError(error);
  }
}