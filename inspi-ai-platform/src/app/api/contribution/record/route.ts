/**
 * 贡献度记录API（内部使用）
 */

import { NextRequest, NextResponse } from 'next/server';

import contributionService from '@/lib/services/contributionService';
import { ContributionType } from '@/shared/types/contribution';

/**
 * 创建贡献度记录
 * 这个API主要用于系统内部调用，记录用户的各种贡献行为
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, workId, points, metadata } = body;

    // 验证必需参数
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '用户ID不能为空' },
        { status: 400 },
      );
    }

    if (!type) {
      return NextResponse.json(
        { success: false, error: '贡献度类型不能为空' },
        { status: 400 },
      );
    }

    // 验证贡献度类型
    if (!Object.values(ContributionType).includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: `无效的贡献度类型。支持的类型: ${Object.values(ContributionType).join(', ')}`,
        },
        { status: 400 },
      );
    }

    // 验证积分值（如果提供）
    if (points !== undefined && (typeof points !== 'number' || points < 0 || points > 1000)) {
      return NextResponse.json(
        { success: false, error: '积分值必须是0-1000之间的数字' },
        { status: 400 },
      );
    }

    // 创建贡献度记录
    const record = await contributionService.createContribution({
      userId,
      type,
      workId,
      points,
      metadata,
    });

    return NextResponse.json({
      success: true,
      data: record,
      message: '贡献度记录创建成功',
    });

  } catch (error) {
    console.error('创建贡献度记录失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '创建贡献度记录失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 },
    );
  }
}

/**
 * 批量创建贡献度记录
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { records } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { success: false, error: '记录列表不能为空' },
        { status: 400 },
      );
    }

    if (records.length > 100) {
      return NextResponse.json(
        { success: false, error: '单次最多只能创建100条记录' },
        { status: 400 },
      );
    }

    // 验证每条记录
    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      if (!record.userId || !record.type) {
        return NextResponse.json(
          { success: false, error: `第${i + 1}条记录缺少必需字段` },
          { status: 400 },
        );
      }

      if (!Object.values(ContributionType).includes(record.type)) {
        return NextResponse.json(
          { success: false, error: `第${i + 1}条记录的贡献度类型无效` },
          { status: 400 },
        );
      }
    }

    // 批量创建记录
    const createdRecords = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      try {
        const record = await contributionService.createContribution(records[i]);
        createdRecords.push(record);
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        created: createdRecords,
        errors: errors,
        summary: {
          total: records.length,
          success: createdRecords.length,
          failed: errors.length,
        },
      },
      message: `批量创建完成，成功${createdRecords.length}条，失败${errors.length}条`,
    });

  } catch (error) {
    console.error('批量创建贡献度记录失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '批量创建贡献度记录失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 },
    );
  }
}
