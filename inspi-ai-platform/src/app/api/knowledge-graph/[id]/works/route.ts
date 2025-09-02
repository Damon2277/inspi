/**
 * 作品挂载 API 路由
 * 处理作品到图谱节点的挂载操作
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { WorkMountService } from '@/lib/services/knowledgeGraphService';
import { MountWorkRequest } from '@/types/knowledgeGraph';
import { handleServiceError } from '@/lib/utils/errorHandler';

/**
 * POST /api/knowledge-graph/[id]/works
 * 挂载作品到节点
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    const graphId = params.id;
    const body: MountWorkRequest = await request.json();

    // 验证必填字段
    if (!body.nodeId || !body.workId) {
      return NextResponse.json({
        success: false,
        error: '节点ID和作品ID不能为空'
      }, { status: 400 });
    }

    const mount = await WorkMountService.mountWork(user.id, {
      ...body,
      graphId
    });
    
    return NextResponse.json({
      success: true,
      data: mount
    }, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}