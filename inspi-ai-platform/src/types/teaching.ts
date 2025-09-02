/**
 * 教学相关类型定义
 */

export type CardType = 'visualization' | 'analogy' | 'thinking' | 'interaction';

export interface TeachingCard {
  id: string;
  type: CardType;
  title: string;
  content: string;
  explanation: string;
  examples?: string[];
  metadata?: {
    subject?: string;
    gradeLevel?: string;
    knowledgePoint?: string;
    generatedAt?: Date;
  };
}

export interface GenerateCardsRequest {
  knowledgePoint: string;
  subject?: string;
  gradeLevel?: string;
}

export interface GenerateCardsResponse {
  cards: TeachingCard[];
  sessionId: string;
  usage: {
    current: number;
    limit: number;
    remaining: number;
  };
}

export interface RegenerateCardRequest {
  cardId: string;
  knowledgePoint: string;
  cardType: CardType;
  subject?: string;
  gradeLevel?: string;
}

// 学科选项
export const SUBJECTS = [
  '语文', '数学', '英语', '物理', '化学', '生物',
  '历史', '地理', '政治', '音乐', '美术', '体育',
  '信息技术', '通用技术', '心理健康', '其他'
] as const;

// 年级选项
export const GRADE_LEVELS = [
  '小学一年级', '小学二年级', '小学三年级', '小学四年级', '小学五年级', '小学六年级',
  '初中一年级', '初中二年级', '初中三年级',
  '高中一年级', '高中二年级', '高中三年级',
  '大学', '其他'
] as const;

// 卡片类型配置
export const CARD_TYPE_CONFIG = {
  visualization: {
    title: '可视化卡',
    description: '帮助学生"看见"抽象概念',
    icon: '👁️',
    color: 'bg-blue-50 border-blue-200 text-blue-800'
  },
  analogy: {
    title: '类比延展卡',
    description: '连接生活经验与知识点',
    icon: '🔗',
    color: 'bg-green-50 border-green-200 text-green-800'
  },
  thinking: {
    title: '启发思考卡',
    description: '激发深度思考的问题',
    icon: '💭',
    color: 'bg-purple-50 border-purple-200 text-purple-800'
  },
  interaction: {
    title: '互动氛围卡',
    description: '课堂活动与游戏设计',
    icon: '🎯',
    color: 'bg-orange-50 border-orange-200 text-orange-800'
  }
} as const;

export type Subject = typeof SUBJECTS[number];
export type GradeLevel = typeof GRADE_LEVELS[number];