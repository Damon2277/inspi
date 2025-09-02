/**
 * Mock AI教学魔法师 - 生成教学卡片API
 * 遵循"先让它工作，再让它完美"原则
 */

import { NextRequest, NextResponse } from 'next/server';
import type { GenerateCardsRequest, GenerateCardsResponse } from '@/types/teaching';

// Mock教学卡片数据
const mockCards = {
  数学: {
    '两位数加法': [
      {
        id: 'card-1',
        type: 'visualization' as const,
        title: '可视化理解',
        content: '想象一下，你有23个苹果，朋友又给了你15个苹果。我们可以用小方块来表示：\n\n🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦 (20个)\n🟦🟦🟦 (3个)\n\n🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨 (10个)\n🟨🟨🟨🟨🟨 (5个)\n\n先把十位相加：20 + 10 = 30\n再把个位相加：3 + 5 = 8\n最后合并：30 + 8 = 38',
        explanation: '通过视觉化的方式，让学生直观理解两位数加法的过程，先处理十位，再处理个位。'
      },
      {
        id: 'card-2',
        type: 'analogy' as const,
        title: '类比延展',
        content: '两位数加法就像整理玩具箱：\n\n🧸 个位数字像散落的小玩具\n📦 十位数字像装满玩具的盒子\n\n当我们计算23 + 15时：\n- 先数盒子：2盒 + 1盒 = 3盒\n- 再数散落的玩具：3个 + 5个 = 8个\n- 最后合起来：3盒8个玩具 = 38个玩具\n\n这样，复杂的数学变成了简单的整理游戏！',
        explanation: '用孩子熟悉的整理玩具场景来类比数学概念，降低理解难度。'
      },
      {
        id: 'card-3',
        type: 'thinking' as const,
        title: '启发思考',
        content: '🤔 思考时间：\n\n如果你在商店买东西：\n- 一本书23元\n- 一支笔15元\n\n问题1：你需要带多少钱？\n问题2：如果你带了50元，还剩多少钱？\n问题3：你能想出其他需要用到两位数加法的生活场景吗？\n\n💡 提示：想想你的年龄、身高、或者收集的卡片数量...',
        explanation: '通过实际生活场景引发思考，让学生主动探索数学在生活中的应用。'
      },
      {
        id: 'card-4',
        type: 'interaction' as const,
        title: '互动氛围',
        content: '🎮 数字接龙游戏：\n\n游戏规则：\n1. 老师说一个两位数（如23）\n2. 学生轮流说另一个两位数（如15）\n3. 全班一起计算结果（23 + 15 = 38）\n4. 下一轮从结果开始（38 + ?）\n\n🏆 挑战模式：\n- 看谁能最快说出正确答案\n- 尝试让结果正好等于100\n- 用手势表示十位和个位\n\n让数学变成快乐的游戏！',
        explanation: '通过游戏化的互动方式，提高学生参与度和学习兴趣。'
      }
    ],
    '分数概念': [
      {
        id: 'card-5',
        type: 'visualization' as const,
        title: '可视化理解',
        content: '🍕 分数就像分披萨：\n\n一整个披萨 = 1\n切成2块，每块是 1/2\n切成4块，每块是 1/4\n切成8块，每块是 1/8\n\n📊 用图形表示：\n⚪ = 1 (完整的圆)\n◐ = 1/2 (半个圆)\n◔ = 1/4 (四分之一圆)\n\n分母告诉我们分成几份，分子告诉我们取了几份。',
        explanation: '用披萨和图形直观展示分数概念，帮助学生理解分子分母的含义。'
      }
    ]
  },
  语文: {
    '文章主旨理解': [
      {
        id: 'card-6',
        type: 'visualization' as const,
        title: '可视化理解',
        content: '📖 理解文章主旨就像寻宝：\n\n🗺️ 文章 = 寻宝地图\n💎 主旨 = 宝藏位置\n🔍 关键词 = 寻宝线索\n\n寻宝步骤：\n1. 快速浏览全文（观察地图）\n2. 找出关键词句（收集线索）\n3. 思考作者想表达什么（推理宝藏位置）\n4. 用一句话概括（找到宝藏！）\n\n记住：主旨通常藏在开头、结尾或反复出现的地方！',
        explanation: '用寻宝游戏比喻阅读理解过程，让抽象的概念变得具体有趣。'
      }
    ]
  }
};

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Using mock magic generate service');
    
    // 1. 简化的身份验证（检查是否有token）
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. 解析请求体
    const body: GenerateCardsRequest = await request.json();
    const { knowledgePoint, subject, gradeLevel } = body;

    // 3. 验证输入
    if (!knowledgePoint || knowledgePoint.trim().length === 0) {
      return NextResponse.json(
        { error: '请输入知识点' },
        { status: 400 }
      );
    }

    if (knowledgePoint.length > 100) {
      return NextResponse.json(
        { error: '知识点长度不能超过100个字符' },
        { status: 400 }
      );
    }

    // 4. 模拟AI生成延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 5. 获取mock卡片数据
    let cards = [];
    
    if (mockCards[subject] && mockCards[subject][knowledgePoint]) {
      cards = mockCards[subject][knowledgePoint];
    } else {
      // 生成通用的mock卡片
      cards = [
        {
          id: `card-${Date.now()}-1`,
          type: 'visualization' as const,
          title: '可视化理解',
          content: `让我们用图像来理解"${knowledgePoint}"：\n\n通过具体的例子和图表，我们可以更好地掌握这个概念。想象一下相关的场景，用你熟悉的事物来类比这个知识点。\n\n这样的视觉化方法能帮助你更深入地理解和记忆。`,
          explanation: `通过视觉化的方式帮助学生理解${knowledgePoint}的核心概念。`
        },
        {
          id: `card-${Date.now()}-2`,
          type: 'analogy' as const,
          title: '类比延展',
          content: `"${knowledgePoint}"就像生活中的很多现象：\n\n我们可以把它比作日常生活中熟悉的事物，这样就能更容易理解其中的规律和特点。\n\n通过这种类比，复杂的概念变得简单易懂。`,
          explanation: `用生活中的类比帮助学生理解${knowledgePoint}。`
        },
        {
          id: `card-${Date.now()}-3`,
          type: 'thinking' as const,
          title: '启发思考',
          content: `🤔 关于"${knowledgePoint}"，让我们思考：\n\n1. 这个概念在生活中有哪些应用？\n2. 你能举出相关的例子吗？\n3. 如果没有这个概念，会有什么影响？\n\n💡 试着从不同角度思考这个问题。`,
          explanation: `通过启发性问题引导学生深入思考${knowledgePoint}。`
        },
        {
          id: `card-${Date.now()}-4`,
          type: 'interaction' as const,
          title: '互动氛围',
          content: `🎮 让我们一起探索"${knowledgePoint}"：\n\n互动活动：\n- 小组讨论相关话题\n- 分享个人理解和经验\n- 一起解决相关问题\n- 创造性地应用这个概念\n\n让学习变得更有趣！`,
          explanation: `通过互动活动提高学生对${knowledgePoint}的参与度和理解。`
        }
      ];
    }

    // 6. 生成会话ID
    const sessionId = `mock_session_${Date.now()}`;

    // 7. 构建响应
    const response: GenerateCardsResponse = {
      cards,
      sessionId,
      usage: {
        current: 1,
        limit: 10, // Mock免费用户限制
        remaining: 9
      }
    };

    console.log('✅ Mock cards generated successfully:', cards.length, 'cards');

    return NextResponse.json(response);

  } catch (error) {
    console.error('Mock generate cards error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'AI生成服务暂时不可用，请稍后重试' },
      { status: 500 }
    );
  }
}