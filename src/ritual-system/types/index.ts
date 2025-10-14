/**
 * 仪式感设计系统 - 核心类型定义
 */

// 仪式感类型枚举
export enum RitualType {
  WELCOME = 'welcome',
  ACHIEVEMENT = 'achievement',
  CREATION = 'creation',
  SHARING = 'sharing',
  MILESTONE = 'milestone',
  TRANSITION = 'transition'
}

// 仪式感强度等级
export enum RitualIntensity {
  SUBTLE = 1,
  MODERATE = 2,
  DRAMATIC = 3,
  EPIC = 4
}

// 用户行为类型
export interface UserAction {
  type: string;
  timestamp: number;
  userId: string;
  context: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// 用户上下文信息
export interface UserContext {
  userId: string;
  sessionDuration: number;
  previousActions: UserAction[];
  userLevel: number;
  preferences: UserPreferences;
  deviceCapabilities: DeviceCapabilities;
  culturalContext: CulturalContext;
}

// 用户偏好设置
export interface UserPreferences {
  ritualIntensity: RitualIntensity;
  enabledRitualTypes: RitualType[];
  soundEnabled: boolean;
  animationEnabled: boolean;
  reducedMotion: boolean;
}

// 设备能力信息
export interface DeviceCapabilities {
  supportsAnimation: boolean;
  supportsAudio: boolean;
  supportsHaptics: boolean;
  performanceLevel: 'low' | 'medium' | 'high';
  screenSize: 'small' | 'medium' | 'large';
}

// 文化上下文
export interface CulturalContext {
  region: string;
  language: string;
  colorPreferences: string[];
  symbolPreferences: string[];
}

// 用户信息
export interface User {
  id: string;
  level: number;
  joinDate: Date;
  lastActiveDate: Date;
  preferences: UserPreferences;
  context: UserContext;
}
