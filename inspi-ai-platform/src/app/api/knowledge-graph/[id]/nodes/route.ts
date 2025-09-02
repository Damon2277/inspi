/**
 * 知识图谱节点 API 路由
 * 处理图谱节点的增删改查操作
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { GraphNodeService } from '@/lib/services/knowledgeGraphService';
import { GraphNode, NodeSearchQuery } from '@/types/knowledgeGraph';
import { handleServiceError } from '@/lib/utils/errorHandler';

/**
 * GET /api/knowledge-graph/[id]/nodes
 * 搜索图谱节点
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);
    const graphId = params.id;
    const { searchParams } = new URL(request.url);
    
    const query: NodeSearchQuery = {
      graphId,
      search: searchParams.get('search') || undefined,
      type: searchParams.get('type') as any,
      level: searchParams.get('level') ? parseInt(searchParams.get('level')!) : undefined,
      hasWorks: searchParams.get('hasWorks') ? searchParams.get('hasWorks') === 'true' : undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean)
    };

    const nodes = await GraphNodeService.searchNodes(query);
    
    return NextResponse.json({
      success: true,
      data: nodes
    });
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * POST /api/knowledge-graph/[id]/nodes
 * 添加新节点
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    const graphId = params.id;
    const nodeData: Omit<GraphNode, 'id' | 'createdAt' | 'updatedAt'> = await request.json();

    // 验证必填字段
    if (!nodeData.label?.trim()) {
      return NextResponse.json({
        success: false,
        error: '节点标签不能为空'
      }, { status: 400 });
    }

    const node = await GraphNodeService.addNode(graphId, user.id, nodeData);
    
    return NextResponse.json({
      success: true,
      data: node
    }, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}