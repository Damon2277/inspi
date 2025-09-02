/**
 * 单个知识图谱 API 路由
 * 处理特定图谱的获取、更新、删除操作
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { KnowledgeGraphService } from '@/lib/services/knowledgeGraphService';
import { UpdateGraphRequest } from '@/types/knowledgeGraph';
import { handleServiceError } from '@/lib/utils/errorHandler';

/**
 * GET /api/knowledge-graph/[id]
 * 获取单个知识图谱
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    const graphId = params.id;

    const graph = await KnowledgeGraphService.getGraph(graphId, user.id);
    
    if (!graph) {
      return NextResponse.json({
        success: false,
        error: '图谱不存在或无权限访问'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: graph
    });
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * PUT /api/knowledge-graph/[id]
 * 更新知识图谱
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    const graphId = params.id;
    const body: UpdateGraphRequest = await request.json();

    const graph = await KnowledgeGraphService.updateGraph(graphId, user.id, body);
    
    return NextResponse.json({
      success: true,
      data: graph
    });
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * DELETE /api/knowledge-graph/[id]
 * 删除知识图谱
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    const graphId = params.id;

    await KnowledgeGraphService.deleteGraph(graphId, user.id);
    
    return NextResponse.json({
      success: true,
      message: '图谱删除成功'
    });
  } catch (error) {
    return handleServiceError(error);
  }
}