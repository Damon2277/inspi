/**
 * 单个节点 API 路由
 * 处理特定节点的更新和删除操作
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { GraphNodeService } from '@/lib/services/knowledgeGraphService';
import { GraphNode } from '@/types/knowledgeGraph';
import { handleServiceError } from '@/lib/utils/errorHandler';

/**
 * PUT /api/knowledge-graph/[id]/nodes/[nodeId]
 * 更新节点
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; nodeId: string } }
) {
  try {
    const user = await requireAuth(request);
    const { id: graphId, nodeId } = params;
    const updates: Partial<GraphNode> = await request.json();

    const node = await GraphNodeService.updateNode(graphId, user.id, nodeId, updates);
    
    return NextResponse.json({
      success: true,
      data: node
    });
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * DELETE /api/knowledge-graph/[id]/nodes/[nodeId]
 * 删除节点
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; nodeId: string } }
) {
  try {
    const user = await requireAuth(request);
    const { id: graphId, nodeId } = params;

    await GraphNodeService.deleteNode(graphId, user.id, nodeId);
    
    return NextResponse.json({
      success: true,
      message: '节点删除成功'
    });
  } catch (error) {
    return handleServiceError(error);
  }
}