/**
 * 内容验证API路由
 */

import { NextRequest, NextResponse } from 'next/server';

import { validateContent, cleanUserContent } from '@/lib/security';
import { ContentFilterOptions } from '@/lib/security/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, options = {} } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({
        success: false,
        error: '请提供有效的内容',
      }, { status: 400 });
    }

    // 验证内容
    const result = await validateContent(content, options as ContentFilterOptions);

    return NextResponse.json({
      success: true,
      data: {
        isValid: result.isValid,
        cleanContent: result.cleanContent,
        riskLevel: result.riskLevel,
        issues: result.issues,
        summary: {
          hasErrors: false,
          hasWarnings: false,
          errorCount: 0,
          warningCount: 0,
        },
      },
    });
  } catch (error) {
    console.error('Content validation API error:', error);
    return NextResponse.json({
      success: false,
      error: '内容验证失败',
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, strict = false } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({
        success: false,
        error: '请提供有效的内容',
      }, { status: 400 });
    }

    // 清理内容
    const cleanedContent = await cleanUserContent(content, strict);

    return NextResponse.json({
      success: true,
      data: {
        originalContent: content,
        cleanedContent,
        changed: content !== cleanedContent,
      },
    });
  } catch (error) {
    console.error('Content cleaning API error:', error);
    return NextResponse.json({
      success: false,
      error: '内容清理失败',
    }, { status: 500 });
  }
}
