/**
 * 图谱统计 API 路由
 * 提供知识图谱的统计信息和分析数据
 */
import { NextRequest, NextResponse } from 'next/server';
import { GraphAnalysisService } from '@/lib/services/knowledgeGraphService';
import { handleServiceError } from '@/lib/utils/errorHandler';

/**
 * GET /api/knowledge-graph/statistics
 * 获取图谱统计信息
 */
export async function GET(request: NextRequest) {
  try {
    const statistics = await GraphAnalysisService.getGraphStatistics();
    
    return NextResponse.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    return handleServiceError(error);
  }
}