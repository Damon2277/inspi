import { NextRequest, NextResponse } from 'next/server';

// GET /api/works/[id] - 获取单个作品详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔧 Using mock work detail service');
    
    const { id: workId } = await params;
    
    // 模拟作品数据
    const mockWork = {
      id: workId,
      title: '二次函数的图像与性质 - 教学创意',
      description: '基于"二次函数的图像与性质"生成的教学创意卡片',
      knowledgePoint: '二次函数的图像与性质',
      subject: '数学',
      gradeLevel: '高中一年级',
      author: {
        id: 'user-1',
        name: 'Test User',
        avatar: null
      },
      cards: [
        {
          id: 'card-1',
          type: 'visualization',
          title: '可视化理解',
          content: '让我们用图像来理解"二次函数的图像与性质"：\n\n通过具体的例子和图表，我们可以更好地掌握这个概念。想象一下相关的场景，用你熟悉的事物来类比这个知识点。\n\n这样的视觉化方法能帮助你更深入地理解和记忆。',
          explanation: '通过视觉化的方式帮助学生理解二次函数的图像与性质的核心概念。'
        },
        {
          id: 'card-2',
          type: 'analogy',
          title: '类比延展',
          content: '"二次函数的图像与性质"就像生活中的很多现象：\n\n我们可以把它比作日常生活中熟悉的事物，这样就能更容易理解其中的规律和特点。\n\n通过这种类比，复杂的概念变得简单易懂。',
          explanation: '用生活中的类比帮助学生理解二次函数的图像与性质。'
        },
        {
          id: 'card-3',
          type: 'thinking',
          title: '启发思考',
          content: '🤔 关于"二次函数的图像与性质"，让我们思考：\n\n1. 这个概念在生活中有哪些应用？\n2. 你能举出相关的例子吗？\n3. 如果没有这个概念，会有什么影响？\n\n💡 试着从不同角度思考这个问题。',
          explanation: '通过启发性问题引导学生深入思考二次函数的图像与性质。'
        },
        {
          id: 'card-4',
          type: 'interaction',
          title: '互动氛围',
          content: '🎮 让我们一起探索"二次函数的图像与性质"：\n\n互动活动：\n- 小组讨论相关话题\n- 分享个人理解和经验\n- 一起解决相关问题\n- 创造性地应用这个概念\n\n让学习变得更有趣！',
          explanation: '通过互动活动提高学生对二次函数的图像与性质的参与度和理解。'
        }
      ],
      tags: ['数学', '高中一年级', '教学创意'],
      status: 'published',
      reuseCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cardCount: 4,
      cardTypes: ['visualization', 'analogy', 'thinking', 'interaction']
    };

    return NextResponse.json({
      success: true,
      data: mockWork
    });
  } catch (error: any) {
    console.error('Get work detail error:', error);
    return NextResponse.json(
      { success: false, message: '获取作品详情失败' },
      { status: 500 }
    );
  }
}

// PUT /api/works/[id] - 更新作品
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔧 Using mock work update service');
    
    // 简化的身份验证（检查是否有token）
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    const { id: workId } = await params;
    const body = await request.json();

    // 模拟更新作品
    const updatedWork = {
      id: workId,
      ...body,
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: updatedWork,
      message: '作品更新成功'
    });
  } catch (error: any) {
    console.error('Update work error:', error);
    return NextResponse.json(
      { success: false, message: '更新作品失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/works/[id] - 删除作品
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔧 Using mock work delete service');
    
    // 简化的身份验证（检查是否有token）
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    const { id: workId } = await params;
    
    console.log('✅ Mock work deleted successfully:', workId);

    return NextResponse.json({
      success: true,
      message: '作品删除成功'
    });
  } catch (error: any) {
    console.error('Delete work error:', error);
    return NextResponse.json(
      { success: false, message: '删除作品失败' },
      { status: 500 }
    );
  }
}