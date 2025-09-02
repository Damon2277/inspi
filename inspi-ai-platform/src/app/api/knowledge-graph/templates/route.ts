/**
 * 预设模板 API 路由
 * 处理知识图谱预设模板的查询和管理
 */
import { NextRequest, NextResponse } from 'next/server';
import { PresetTemplateModel } from '@/lib/models/KnowledgeGraph';
import { SubjectCategory, EducationLevel } from '@/types/knowledgeGraph';
import { handleServiceError } from '@/lib/utils/errorHandler';

/**
 * GET /api/knowledge-graph/templates
 * 获取预设模板列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 构建查询条件
    const filter: any = {};
    const subject = searchParams.get('subject');
    const educationLevel = searchParams.get('educationLevel');
    const search = searchParams.get('search');
    
    if (subject && Object.values(SubjectCategory).includes(subject as SubjectCategory)) {
      filter.subject = subject;
    }
    
    if (educationLevel && Object.values(EducationLevel).includes(educationLevel as EducationLevel)) {
      filter.educationLevel = educationLevel;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const templates = await PresetTemplateModel
      .find(filter)
      .sort({ 'metadata.useCount': -1, createdAt: -1 })
      .lean();
    
    return NextResponse.json({
      success: true,
      data: templates
    });
  } catch (error) {
    return handleServiceError(error);
  }
}