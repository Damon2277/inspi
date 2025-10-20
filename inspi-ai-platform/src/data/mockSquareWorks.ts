export interface SquareWork {
  id: number;
  title: string;
  author: string;
  subject: string;
  grade: string;
  description: string;
  cardCount: number;
  likes: number;
  views: number;
  reuses: number;
  rating: number;
  tags: string[];
  thumbnail: string;
  createdAt: string;
}

export const mockSquareWorks: SquareWork[] = [
  {
    id: 1,
    title: '二次函数的图像与性质',
    author: '张老师',
    subject: '数学',
    grade: '高中',
    description: '通过动态图像展示二次函数的变化规律，帮助学生理解抛物线的开口方向、对称轴等重要概念。',
    cardCount: 4,
    likes: 89,
    views: 1250,
    reuses: 23,
    rating: 4.8,
    tags: ['函数', '图像', '性质'],
    thumbnail: '📊',
    createdAt: '2024-01-15',
  },
  {
    id: 2,
    title: '古诗词意境赏析',
    author: '李老师',
    subject: '语文',
    grade: '初中',
    description: '结合古诗词的创作背景，引导学生感受诗人的情感世界，提升文学鉴赏能力。',
    cardCount: 4,
    likes: 156,
    views: 2100,
    reuses: 45,
    rating: 4.9,
    tags: ['古诗词', '意境', '赏析'],
    thumbnail: '📜',
    createdAt: '2024-01-14',
  },
  {
    id: 3,
    title: '化学反应速率与平衡',
    author: '王老师',
    subject: '化学',
    grade: '高中',
    description: '通过实验现象和理论分析，帮助学生掌握化学反应速率的影响因素和化学平衡的建立过程。',
    cardCount: 4,
    likes: 67,
    views: 890,
    reuses: 18,
    rating: 4.7,
    tags: ['化学反应', '速率', '平衡'],
    thumbnail: '⚗️',
    createdAt: '2024-01-13',
  },
  {
    id: 4,
    title: '英语时态语法精讲',
    author: '陈老师',
    subject: '英语',
    grade: '初中',
    description: '系统梳理英语各种时态的用法，通过丰富的例句和练习，让学生轻松掌握时态变化规律。',
    cardCount: 4,
    likes: 234,
    views: 3200,
    reuses: 67,
    rating: 4.6,
    tags: ['时态', '语法', '练习'],
    thumbnail: '🔤',
    createdAt: '2024-01-12',
  },
  {
    id: 5,
    title: '物理力学基础',
    author: '赵老师',
    subject: '物理',
    grade: '高中',
    description: '从生活实例出发，讲解力的概念、牛顿定律等基础知识，培养学生的物理思维。',
    cardCount: 4,
    likes: 123,
    views: 1800,
    reuses: 34,
    rating: 4.8,
    tags: ['力学', '牛顿定律', '基础'],
    thumbnail: '⚡',
    createdAt: '2024-01-11',
  },
  {
    id: 6,
    title: '生物细胞结构',
    author: '孙老师',
    subject: '生物',
    grade: '初中',
    description: '通过显微镜观察和模型展示，让学生深入了解细胞的基本结构和功能。',
    cardCount: 4,
    likes: 98,
    views: 1400,
    reuses: 28,
    rating: 4.7,
    tags: ['细胞', '结构', '功能'],
    thumbnail: '🔬',
    createdAt: '2024-01-10',
  },
];
