/**
 * 仪式感核心系统导出
 */

import { RitualDetector } from './RitualDetector';
import { User, UserAction } from '../types';

export { RitualTrigger, IRitualTrigger } from './RitualTrigger';
export { RitualDetector, RitualDetectionResult } from './RitualDetector';
export * from '../types';

// 主要的仪式感检测系统类
export class RitualSystem {
  private detector: RitualDetector;

  constructor() {
    this.detector = new RitualDetector();
  }

  /**
   * 检测并处理仪式感时刻
   */
  async processUserAction(user: User, action: UserAction) {
    return await this.detector.detectRitualMoment(user, action);
  }

  /**
   * 获取用户行为统计
   */
  getUserStats(userId: string) {
    return this.detector.getUserBehaviorStats(userId);
  }
}
