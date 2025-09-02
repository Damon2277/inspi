/**
 * 单个边 API 路由
 * 处理特定边的删除操作
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { GraphEdgeService } from '@/lib/services/knowledgeGraphService';
import { handleServiceError } from '@/lib/utils/errorHandler';

/**
 * DELETE /api/knowledge-graph/[id]/edges/[edgeId]
 * 删除边
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; edgeId: string } }
) {
  try {
    const user = await requireAuth(request);
    const { id: graphId, edgeId } = params;

    await GraphEdgeService.deleteEdge(graphId, user.id, edgeId);
    
    return NextResponse.json({
      success: true,
      message: '边删除成功'
    });
  } catch (error) {
    return handleServiceError(error);
  }
}