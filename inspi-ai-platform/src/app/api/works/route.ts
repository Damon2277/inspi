import { NextRequest, NextResponse } from 'next/server';

// GET /api/works - 获取作品列表（智慧广场）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const query = {
      author: searchParams.get('author') || undefined,
      status: (searchParams.get('status') as any) || 'published',
      subject: searchParams.get('subject') || undefined,
      gradeLevel: searchParams.get('gradeLevel') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '12'),
      sortBy: (searchParams.get('sortBy') as any) || 'latest',
      search: searchParams.get('search') || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined
    };

    // 临时返回模拟数据进行测试
    const mockResult = {
      works: [
        {
          id: '1',
          title: '数学加法教学',
          knowledgePoint: '两位数加法',
          subject: '数学',
          gradeLevel: '小学二年级',
          author: {
            id: 'user1',
            name: '张老师',
            avatar: null
          },
          reuseCount: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: ['数学', '加法'],
          cardCount: 4,
          cardTypes: ['visualization', 'analogy', 'thinking', 'interaction']
        },
        {
          id: '2',
          title: '语文阅读理解',
          knowledgePoint: '文章主旨理解',
          subject: '语文',
          gradeLevel: '小学三年级',
          author: {
            id: 'user2',
            name: '李老师',
            avatar: null
          },
          reuseCount: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: ['语文', '阅读'],
          cardCount: 3,
          cardTypes: ['thinking', 'interaction', 'visualization']
        }
      ],
      pagination: {
        page: query.page,
        limit: query.limit,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      },
      filters: {
        subjects: [
          { value: '数学', label: '数学', count: 1 },
          { value: '语文', label: '语文', count: 1 }
        ],
        gradeLevels: [
          { value: '小学二年级', label: '小学二年级', count: 1 },
          { value: '小学三年级', label: '小学三年级', count: 1 }
        ],
        availableTags: ['数学', '加法', '语文', '阅读']
      }
    };

    return NextResponse.json({
      success: true,
      data: mockResult
    });
  } catch (error: any) {
    console.error('Get works error:', error);
    return NextResponse.json(
      { success: false, message: '获取作品列表失败' },
      { status: 500 }
    );
  }
}

// POST /api/works - 创建新作品
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Using mock works service');
    
    // 简化的身份验证（检查是否有token）
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, knowledgePoint, subject, gradeLevel, cards, tags, status } = body;

    // 验证必填字段
    if (!title || !knowledgePoint || !subject || !gradeLevel || !cards) {
      return NextResponse.json(
        { success: false, message: '缺少必填字段' },
        { status: 400 }
      );
    }

    // 验证卡片数据
    if (!Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json(
        { success: false, message: '至少需要一张教学卡片' },
        { status: 400 }
      );
    }

    // 模拟创建作品
    const work = {
      id: `work-${Date.now()}`,
      title,
      knowledgePoint,
      subject,
      gradeLevel,
      cards,
      tags: tags || [],
      status: status || 'published',
      author: {
        id: 'user-1',
        name: 'Test User',
        avatar: null
      },
      reuseCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cardCount: cards.length,
      cardTypes: cards.map((card: any) => card.type)
    };

    console.log('✅ Mock work created successfully:', work.id);

    return NextResponse.json({
      success: true,
      data: work,
      message: status === 'published' ? '作品发布成功' : '作品保存成功'
    });
  } catch (error: any) {
    console.error('Create work error:', error);
    return NextResponse.json(
      { success: false, message: '创建作品失败' },
      { status: 500 }
    );
  }
}