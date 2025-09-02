/**
 * 单个预设模板 API 路由
 * 获取特定模板的详细信息
 */
import { NextRequest, NextResponse } from 'next/server';
import { PresetTemplateModel } from '@/lib/models/KnowledgeGraph';
import { handleServiceError } from '@/lib/utils/errorHandler';

/**
 * GET /api/knowledge-graph/templates/[id]
 * 获取单个预设模板
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id;

    const template = await PresetTemplateModel.findById(templateId).lean();
    
    if (!template) {
      return NextResponse.json({
        success: false,
        error: '模板不存在'
      }, { status: 404 });
    }

    // 增加使用计数
    await PresetTemplateModel.findByIdAndUpdate(
      templateId,
      { $inc: { 'metadata.useCount': 1 } }
    );
    
    return NextResponse.json({
      success: true,
      data: template
    });
  } catch (error) {
    return handleServiceError(error);
  }
}