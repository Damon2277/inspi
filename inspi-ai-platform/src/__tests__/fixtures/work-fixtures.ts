/**
 * 作品相关测试数据工厂
 */

export interface MockCard {
  id: string
  type: 'concept' | 'example' | 'exercise' | 'summary'
  title: string
  content: string
  order: number
  metadata?: Record<string, any>
}

export interface MockWork {
  id: string
  title: string
  description: string
  subject: string
  grade: string
  knowledgePoint: string
  cards: MockCard[]
  authorId: string
  isPublished: boolean
  isDraft: boolean
  views: number
  likes: number
  reposts: number
  tags: string[]
  createdAt: string
  updatedAt: string
  publishedAt?: string
}

export interface MockWorkStats {
  workId: string
  views: number
  likes: number
  reposts: number
  comments: number
  shares: number
  dailyViews: number[]
  weeklyViews: number[]
  monthlyViews: number[]
}

// 卡片工厂
export const createCardFixture = (
  type: MockCard['type'],
  overrides: Partial<MockCard> = {},
): MockCard => ({
  id: `card-${type}-${Math.random().toString(36).substring(2, 15)}`,
  type,
  title: `${type.charAt(0).toUpperCase() + type.slice(1)} Card`,
  content: `This is a test ${type} card content with detailed information.`,
  order: 0,
  metadata: {},
  ...overrides,
});

// 概念卡片
export const createConceptCardFixture = (overrides: Partial<MockCard> = {}): MockCard =>
  createCardFixture('concept', {
    title: 'Concept: Addition',
    content: 'Addition is the process of combining two or more numbers to get their sum.',
    ...overrides,
  });

// 例题卡片
export const createExampleCardFixture = (overrides: Partial<MockCard> = {}): MockCard =>
  createCardFixture('example', {
    title: 'Example: 2 + 3 = 5',
    content: 'Let\'s solve: 2 + 3. We start with 2 and add 3 more to get 5.',
    ...overrides,
  });

// 练习卡片
export const createExerciseCardFixture = (overrides: Partial<MockCard> = {}): MockCard =>
  createCardFixture('exercise', {
    title: 'Exercise: Solve 4 + 6',
    content: 'Try to solve: 4 + 6 = ?',
    metadata: { answer: '10', difficulty: 'easy' },
    ...overrides,
  });

// 总结卡片
export const createSummaryCardFixture = (overrides: Partial<MockCard> = {}): MockCard =>
  createCardFixture('summary', {
    title: 'Summary: Addition Basics',
    content: 'We learned that addition combines numbers to find their total sum.',
    ...overrides,
  });

// 完整卡片组合
export const createCardSetFixture = (): MockCard[] => [
  createConceptCardFixture({ order: 0 }),
  createExampleCardFixture({ order: 1 }),
  createExerciseCardFixture({ order: 2 }),
  createSummaryCardFixture({ order: 3 }),
];

// 作品工厂
export const createWorkFixture = (overrides: Partial<MockWork> = {}): MockWork => ({
  id: `work-${Math.random().toString(36).substring(2, 15)}`,
  title: 'Test Work Title',
  description: 'This is a test work description.',
  subject: 'Mathematics',
  grade: 'Grade 5',
  knowledgePoint: 'Addition',
  cards: createCardSetFixture(),
  authorId: `user-${Math.random().toString(36).substring(2, 15)}`,
  isPublished: true,
  isDraft: false,
  views: Math.floor(Math.random() * 1000),
  likes: Math.floor(Math.random() * 100),
  reposts: Math.floor(Math.random() * 50),
  tags: ['mathematics', 'addition', 'elementary'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  publishedAt: new Date().toISOString(),
  ...overrides,
});

// 草稿作品
export const createDraftWorkFixture = (authorId: string, overrides: Partial<MockWork> = {}): MockWork =>
  createWorkFixture({
    authorId,
    isPublished: false,
    isDraft: true,
    publishedAt: undefined,
    views: 0,
    likes: 0,
    reposts: 0,
    ...overrides,
  });

// 已发布作品
export const createPublishedWorkFixture = (authorId: string, overrides: Partial<MockWork> = {}): MockWork =>
  createWorkFixture({
    authorId,
    isPublished: true,
    isDraft: false,
    publishedAt: new Date().toISOString(),
    ...overrides,
  });

// 热门作品
export const createPopularWorkFixture = (authorId: string, overrides: Partial<MockWork> = {}): MockWork =>
  createPublishedWorkFixture(authorId, {
    views: Math.floor(Math.random() * 5000) + 1000,
    likes: Math.floor(Math.random() * 500) + 100,
    reposts: Math.floor(Math.random() * 200) + 50,
    ...overrides,
  });

// 不同学科的作品
export const createMathWorkFixture = (authorId: string, overrides: Partial<MockWork> = {}): MockWork =>
  createWorkFixture({
    authorId,
    subject: 'Mathematics',
    knowledgePoint: 'Addition',
    tags: ['mathematics', 'addition', 'elementary'],
    ...overrides,
  });

export const createScienceWorkFixture = (authorId: string, overrides: Partial<MockWork> = {}): MockWork =>
  createWorkFixture({
    authorId,
    subject: 'Science',
    knowledgePoint: 'Photosynthesis',
    tags: ['science', 'biology', 'plants'],
    ...overrides,
  });

export const createLanguageWorkFixture = (authorId: string, overrides: Partial<MockWork> = {}): MockWork =>
  createWorkFixture({
    authorId,
    subject: 'Language Arts',
    knowledgePoint: 'Reading Comprehension',
    tags: ['language', 'reading', 'comprehension'],
    ...overrides,
  });

// 批量创建作品
export const createWorksFixture = (
  count: number,
  authorId: string,
  baseOverrides: Partial<MockWork> = {},
): MockWork[] => {
  return Array.from({ length: count }, (_, index) =>
    createWorkFixture({
      authorId,
      title: `Test Work ${index + 1}`,
      ...baseOverrides,
    }),
  );
};

// 作品统计数据
export const createWorkStatsFixture = (workId: string, overrides: Partial<MockWorkStats> = {}): MockWorkStats => ({
  workId,
  views: Math.floor(Math.random() * 1000),
  reposts: Math.floor(Math.random() * 50),
  shares: Math.floor(Math.random() * 20),
  dailyViews: Array.from({ length: 7 }, () => Math.floor(Math.random() * 50)),
  weeklyViews: Array.from({ length: 4 }, () => Math.floor(Math.random() * 200)),
  monthlyViews: Array.from({ length: 12 }, () => Math.floor(Math.random() * 500)),
  ...overrides,
});


// 作品收藏
export const createWorkBookmarkFixture = (workId: string, userId: string) => ({
  id: `bookmark-${userId}-${workId}`,
  workId,
  userId,
  createdAt: new Date().toISOString(),
});

// 作品复用记录
export const createWorkReuseFixture = (originalWorkId: string, newWorkId: string, userId: string) => ({
  id: `reuse-${Math.random().toString(36).substring(2, 15)}`,
  originalWorkId,
  newWorkId,
  userId,
  attribution: `Based on work by User ${Math.random().toString(36).substring(2, 6)}`,
  createdAt: new Date().toISOString(),
});
