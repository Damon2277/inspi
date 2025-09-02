/**
 * 知识图谱边 API 路由
 * 处理图谱边的增删操作
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { GraphEdgeService } from '@/lib/services/knowledgeGraphService';
import { GraphEdge } from '@/types/knowledgeGraph';
import { handleServiceError } from '@/lib/utils/errorHandler';

/**
 * POST /api/knowledge-graph/[id]/edges
 * 添加新边
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    const graphId = params.id;
    const edgeData: Omit<GraphEdge, 'id' | 'createdAt' | 'updatedAt'> = await request.json();

    // 验证必填字段
    if (!edgeData.source || !edgeData.target) {
      return NextResponse.json({
        success: false,
        error: '源节点和目标节点不能为空'
      }, { status: 400 });
    }

    if (!edgeData.type) {
      return NextResponse.json({
        success: false,
        error: '边类型不能为空'
      }, { status: 400 });
    }

    const edge = await GraphEdgeService.addEdge(graphId, user.id, edgeData);
    
    return NextResponse.json({
      success: true,
      data: edge
    }, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}