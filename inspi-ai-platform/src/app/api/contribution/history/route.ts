/**
 * 贡献度历史记录API
 */

import { NextRequest, NextResponse } from 'next/server';
import contributionService from '@/lib/services/contributionService';
import { ContributionType } from '@/types/contribution';

/**
 * 获取用户贡献度历史记录
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 解析查询参数
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') as ContributionType;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    // 验证必需参数
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '用户ID不能为空' },
        { status: 400 }
      );
    }

    // 验证贡献度类型（如果提供）
    if (type && !Object.values(ContributionType).includes(type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `无效的贡献度类型。支持的类型: ${Object.values(ContributionType).join(', ')}` 
        },
        { status: 400 }
      );
    }

    // 验证日期格式（如果提供）
    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;
    
    if (startDate) {
      parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        return NextResponse.json(
          { success: false, error: '开始日期格式无效' },
          { status: 400 }
        );
      }
    }
    
    if (endDate) {
      parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        return NextResponse.json(
          { success: false, error: '结束日期格式无效' },
          { status: 400 }
        );
      }
    }

    // 获取贡献度历史记录
    const history = await contributionService.getContributionHistory({
      userId,
      type,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      limit,
      offset
    });

    return NextResponse.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('获取贡献度历史记录失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '获取贡献度历史记录失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}