/**
 * AI教学魔法师 - 重新生成单张卡片API
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { GeminiService } from '@/lib/ai/geminiService';
import { usageLimitMiddleware, recordUsage } from '@/lib/middleware/usageLimit';
import connectDB from '@/lib/mongodb';
import type { RegenerateCardRequest } from '@/types/teaching';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // 1. 检查使用限制
    const limitResponse = await usageLimitMiddleware(request, 'generation');
    if (limitResponse) {
      return limitResponse;
    }

    // 2. 验证用户身份
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token) as any;
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // 3. 解析请求体
    const body: RegenerateCardRequest = await request.json();
    const { cardId, knowledgePoint, cardType, subject, gradeLevel } = body;

    // 4. 验证输入
    if (!knowledgePoint || !cardType) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    if (!['visualization', 'analogy', 'thinking', 'interaction'].includes(cardType)) {
      return NextResponse.json(
        { error: '无效的卡片类型' },
        { status: 400 }
      );
    }

    // 5. 检查AI服务配置
    if (!GeminiService.isConfigured()) {
      return NextResponse.json(
        { error: 'AI服务暂时不可用，请稍后重试' },
        { status: 503 }
      );
    }

    // 6. 调用AI重新生成服务
    const card = await GeminiService.regenerateCard(
      knowledgePoint.trim(),
      cardType,
      subject,
      gradeLevel
    );

    // 7. 记录使用次数
    await recordUsage(request, 'generation');

    return NextResponse.json({ card });

  } catch (error) {
    console.error('Regenerate card error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'AI重新生成服务暂时不可用，请稍后重试' },
      { status: 500 }
    );
  }
}