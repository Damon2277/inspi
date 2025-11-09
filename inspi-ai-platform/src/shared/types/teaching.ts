/**
 * 教学相关类型定义
 */

import type { CardType } from './cards';

export type { CardType };

export type RawCardType = 'concept' | 'example' | 'practice' | 'extension';

export type VisualizationTheme = 'ocean' | 'sunrise' | 'forest' | 'galaxy' | 'neutral';

export interface VisualizationBranch {
  id: string;
  title: string;
  summary: string;
  keywords?: string[];
  icon?: string;
  color?: string;
}

export interface VisualizationAnnotation {
  title: string;
  description: string;
  icon?: string;
  placement?: 'left' | 'right' | 'top' | 'bottom' | 'center';
}

export interface StructuredDiagramHeader {
  title: string;
  subtitle?: string;
  formula?: string;
  summary?: string;
  conceptTagline?: string;
}

export interface StructuredDiagramStage {
  id: string;
  title: string;
  summary: string;
  details?: string[];
  icon?: string;
  outcome?: string;
  imagePrompt?: string;
  imageUrl?: string;
  imageMetadata?: {
    provider?: string;
    width?: number;
    height?: number;
    generatedAt?: string;
  };
}

export interface StructuredDiagramOutcome {
  title: string;
  description?: string;
  icon?: string;
}

export interface StructuredDiagramSpec {
  header: StructuredDiagramHeader;
  stages: StructuredDiagramStage[];
  outcomes?: StructuredDiagramOutcome[];
  notes?: string[];
  highlight?: string;
}

export interface VisualizationSpec {
  type: 'concept-map' | 'process-flow' | 'matrix' | 'hero-illustration' | 'structured-diagram';
  theme: VisualizationTheme;
  layout?: 'left-to-right' | 'right-to-left' | 'radial' | 'grid' | 'hierarchical' | string;
  imagePrompt?: string;
  negativePrompt?: string;
  imageUrl?: string;
  imageMetadata?: {
    provider?: string;
    width?: number;
    height?: number;
    generatedAt?: string;
  };
  center: {
    title: string;
    subtitle?: string;
  };
  branches: VisualizationBranch[];
  footerNote?: string;
  composition?: {
    metaphor?: string;
    visualFocus?: string;
    backgroundMood?: string;
    colorPalette?: string[];
  };
  annotations?: VisualizationAnnotation[];
  structured?: StructuredDiagramSpec;
}

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
    generatedAt?: Date | string;
  };
  visual?: VisualizationSpec;
  sop?: CardSOPSection[];
  presentation?: CardPresentationMeta;
  cached?: boolean;
}

export interface CardSOPMicroStep {
  title: string;
  goal: string;
  teacherActions: string;
  studentActions: string;
  evidence?: string;
  differentiation?: {
    basic?: string;
    intermediate?: string;
    advanced?: string;
  };
  durationSeconds?: number;
  interactionMode?: string;
}

export interface CardSOPSection {
  title: string;
  durationMinutes: number;
  steps: CardSOPMicroStep[];
}

export interface CardPresentationCue {
  title: string;
  narrative: string;
  emphasis?: string;
  durationSeconds?: number;
  spotlight?: string;
}

export interface CardPresentationMeta {
  headline: string;
  summary: string;
  recommendedDuration: number;
  cues: CardPresentationCue[];
  theme?: 'light' | 'dark';
  callToAction?: string;
}

export interface GenerateCardsRequest {
  knowledgePoint: string;
  subject?: string;
  gradeLevel?: string;
  difficulty?: string;
  additionalContext?: string;
  cardTypes?: (CardType | RawCardType)[];
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
  cardType: RawCardType;
  subject?: string;
  gradeLevel?: string;
}

// 学科选项
export const SUBJECTS = [
  '语文', '数学', '英语', '物理', '化学', '生物',
  '历史', '地理', '政治', '音乐', '美术', '体育',
  '信息技术', '通用技术', '心理健康', '其他',
] as const;

// 年级选项
export const GRADE_LEVELS = [
  '小学一年级', '小学二年级', '小学三年级', '小学四年级', '小学五年级', '小学六年级',
  '初中一年级', '初中二年级', '初中三年级',
  '高中一年级', '高中二年级', '高中三年级',
  '大学', '其他',
] as const;

// 卡片类型配置
export const CARD_TYPE_CONFIG = {
  visualization: {
    title: '可视化卡',
    description: '帮助学生"看见"抽象概念',
    icon: '👁️',
    color: 'bg-blue-50 border-blue-200 text-blue-800',
  },
  analogy: {
    title: '类比延展卡',
    description: '连接生活经验与知识点',
    icon: '🔗',
    color: 'bg-green-50 border-green-200 text-green-800',
  },
  thinking: {
    title: '启发思考卡',
    description: '激发深度思考的问题',
    icon: '💭',
    color: 'bg-purple-50 border-purple-200 text-purple-800',
  },
  interaction: {
    title: '互动氛围卡',
    description: '课堂活动与游戏设计',
    icon: '🎯',
    color: 'bg-orange-50 border-orange-200 text-orange-800',
  },
} as const;

export type Subject = typeof SUBJECTS[number];
export type GradeLevel = typeof GRADE_LEVELS[number];
