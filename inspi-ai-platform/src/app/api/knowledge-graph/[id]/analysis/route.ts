/**
 * 图谱分析 API 路由
 * 提供特定图谱的结构分析和推荐
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { GraphAnalysisService } from '@/lib/services/knowledgeGraphService';
import { handleServiceError } from '@/lib/utils/errorHandler';

/**
 * GET /api/knowledge-graph/[id]/analysis
 * 分析图谱结构
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);
    const graphId = params.id;

    const analysis = await GraphAnalysisService.analyzeGraph(graphId);
    
    return NextResponse.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    return handleServiceError(error);
  }
}