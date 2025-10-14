/**
 * 卡片相关类型定义
 */

export interface GeneratedCard {
  id: string;
  type: CardType;
  title: string;
  content: string;
  explanation: string;
  cached?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type CardType = 'visualization' | 'analogy' | 'thinking' | 'interaction';

export interface CardStyle {
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;
  padding: number;
  borderRadius: number;
  borderColor: string;
  borderWidth: number;
}

export interface CardTypeConfig {
  id: CardType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface ExportFormat {
  key: string;
  name: string;
  description: string;
  icon: string;
  format: 'png' | 'jpg' | 'svg';
  options: {
    scale?: number;
    quality?: number;
    width?: number;
    height?: number;
    backgroundColor?: string;
  };
}

export interface SharePlatformConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  requiresImage?: boolean;
  maxTextLength?: number;
}

export interface CardEditHistory {
  id: string;
  cardId: string;
  content: string;
  style: CardStyle;
  timestamp: string;
  action: 'create' | 'edit' | 'style_change';
}

export interface CardShareRecord {
  id: string;
  cardId: string;
  platform: string;
  sharedAt: string;
  shareUrl?: string;
  viewCount?: number;
}
