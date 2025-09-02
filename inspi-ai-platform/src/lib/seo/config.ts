/**
 * SEO配置和常量
 */

export const SEO_CONFIG = {
  // 网站基本信息
  SITE_NAME: 'Inspi.AI',
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://inspi.ai',
  SITE_DESCRIPTION: '别让备课的深夜，磨灭您教学的热情。Inspi.AI，是您最懂教学的灵感搭档。',
  
  // 默认元数据
  DEFAULT_TITLE: 'Inspi.AI - 老师的好搭子，更是您教学创意的放大器',
  DEFAULT_DESCRIPTION: '用AI为您分担繁琐，把宝贵的时间，还给课堂、还给学生、还给教学本身的光芒。',
  DEFAULT_KEYWORDS: [
    'AI教学',
    '教学创意',
    '教师工具',
    '教学设计',
    '知识图谱',
    '教学魔法师',
    '智慧广场',
    '教育科技',
    '个性化教学',
    '教学资源'
  ],
  
  // Open Graph 默认设置
  OG_IMAGE: '/og-image.jpg',
  OG_TYPE: 'website',
  OG_LOCALE: 'zh_CN',
  
  // Twitter Card 设置
  TWITTER_CARD: 'summary_large_image',
  TWITTER_SITE: '@inspi_ai',
  
  // 结构化数据
  ORGANIZATION: {
    '@type': 'Organization',
    name: 'Inspi.AI',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://inspi.ai',
    logo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://inspi.ai'}/logo.png`,
    description: 'AI驱动的教师智慧与IP孵化平台',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+86-400-123-4567',
      contactType: 'customer service',
      email: 'sundp1980@gmail.com'
    }
  },
  
  // 面包屑导航
  BREADCRUMB_LIST: {
    '@type': 'BreadcrumbList',
    itemListElement: []
  }
} as const;

// 页面特定的SEO配置
export const PAGE_SEO_CONFIG = {
  HOME: {
    title: 'Inspi.AI - 老师的好搭子，更是您教学创意的放大器',
    description: '别让备课的深夜，磨灭您教学的热情。用AI为您分担繁琐，把宝贵的时间，还给课堂、还给学生、还给教学本身的光芒。',
    keywords: ['AI教学魔法师', '教学创意生成', '智慧广场', '知识图谱', '教师工具'],
    path: '/'
  },
  
  CREATE: {
    title: 'AI教学魔法师 - 创作您的教学创意 | Inspi.AI',
    description: '输入知识点，AI为您生成四种类型的教学创意卡片：可视化卡、类比延展卡、启发思考卡、互动氛围卡。',
    keywords: ['AI教学魔法师', '教学卡片生成', '创意教学', '知识点教学'],
    path: '/create'
  },
  
  SQUARE: {
    title: '智慧广场 - 发现优秀教学创意 | Inspi.AI',
    description: '浏览和复用全球教师的优秀教学创意，按学科、学段筛选，发现最受欢迎的教学魔法。',
    keywords: ['智慧广场', '教学资源', '教学创意分享', '教师社区'],
    path: '/square'
  },
  
  LEADERBOARD: {
    title: '智慧贡献榜 - 教师荣誉与排名 | Inspi.AI',
    description: '查看贡献度排行榜，发现最受欢迎的教学作品，见证教师智慧的力量。',
    keywords: ['贡献度排行榜', '教师荣誉', '热门作品', '教学影响力'],
    path: '/leaderboard'
  },
  
  PROFILE: {
    title: '个人中心 - 我的知识图谱 | Inspi.AI',
    description: '构建和展示您的个人知识图谱，管理您的教学作品，追踪您的贡献度。',
    keywords: ['个人知识图谱', '作品管理', '贡献度统计', '教师档案'],
    path: '/profile'
  }
} as const;

// 动态页面SEO模板
export const DYNAMIC_SEO_TEMPLATES = {
  WORK_DETAIL: {
    titleTemplate: (title: string, author: string) => `${title} - ${author}的教学创意 | Inspi.AI`,
    descriptionTemplate: (knowledgePoint: string, subject: string) => 
      `关于"${knowledgePoint}"的${subject}教学创意，包含可视化、类比、思考和互动四种教学卡片。`,
    keywordsTemplate: (knowledgePoint: string, subject: string, tags: string[]) => 
      [knowledgePoint, subject, '教学创意', '教学卡片', ...tags]
  },
  
  USER_PROFILE: {
    titleTemplate: (name: string) => `${name}的教学档案 - 知识图谱与作品展示 | Inspi.AI`,
    descriptionTemplate: (name: string, contributionScore: number, workCount: number) => 
      `${name}的个人教学档案，贡献度${contributionScore}分，已创作${workCount}个教学作品。`,
    keywordsTemplate: (name: string, subjects: string[]) => 
      [name, '教师档案', '知识图谱', '教学作品', ...subjects]
  }
} as const;

// SEO优化的内容配置
export const CONTENT_CONFIG = {
  // 主标语和标题
  HERO_TITLE: 'Inspi.AI - 老师的好搭子，更是您教学创意的放大器',
  HERO_SUBTITLE: '别让备课的深夜，磨灭您教学的热情',
  HERO_DESCRIPTION: 'Inspi.AI，是您最懂教学的灵感搭档。我们用AI为您分担繁琐，把宝贵的时间，还给课堂、还给学生、还给教学本身的光芒。',
  
  // 功能卡片优化内容
  FEATURE_CARDS: [
    {
      icon: '👁️',
      title: '化抽象为"看见"',
      description: '让知识，在学生眼前\'活\'起来。',
      keywords: ['可视化教学', '抽象概念', '直观理解']
    },
    {
      icon: '🔗',
      title: '用生活的温度，点亮知识',
      description: '让每一次学习成为亲切的探索。',
      keywords: ['生活化教学', '类比教学', '知识连接']
    },
    {
      icon: '💭',
      title: '抛出一个好问题，胜过一万句灌输',
      description: '培养的更是终身受用的思考力。',
      keywords: ['启发式教学', '批判性思维', '深度思考']
    },
    {
      icon: '🎯',
      title: '让课堂\'破冰\'，让知识\'升温\'',
      description: '在欢声笑语中，知识自然流淌。',
      keywords: ['互动教学', '课堂氛围', '寓教于乐']
    }
  ],
  
  // 智慧广场内容
  SQUARE_CONTENT: {
    title: '智慧广场 - 汇聚全球教师的教学智慧',
    description: '在这里，每一个教学创意都闪闪发光。浏览、学习、复用，让优秀的教学方法传播得更远。',
    cta: '发现更多教学魔法'
  },
  
  // 排行榜内容
  LEADERBOARD_CONTENT: {
    title: '智慧贡献榜 - 见证教师智慧的力量',
    description: '这里记录着每一位教师的贡献，每一次创作的价值，每一个作品的影响力。',
    sections: {
      contribution: '贡献度排行榜',
      trending: '热门作品推荐',
      weekly: '本周最受欢迎'
    }
  }
} as const;