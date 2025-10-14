/**
 * 仪式感系统基础使用示例
 */

import { RitualSystem, RitualType, RitualIntensity, UserAction, User } from '../core';

// 创建仪式感系统实例
const ritualSystem = new RitualSystem();

// 示例用户数据
const exampleUser: User = {
  id: 'user-123',
  level: 5,
  joinDate: new Date('2024-01-15'),
  lastActiveDate: new Date(),
  preferences: {
    ritualIntensity: RitualIntensity.MODERATE,
    enabledRitualTypes: [
      RitualType.WELCOME,
      RitualType.ACHIEVEMENT,
      RitualType.CREATION,
      RitualType.SHARING
    ],
    soundEnabled: true,
    animationEnabled: true,
    reducedMotion: false
  },
  context: {
    userId: 'user-123',
    sessionDuration: 10 * 60 * 1000, // 10分钟会话
    previousActions: [],
    userLevel: 5,
    preferences: {
      ritualIntensity: RitualIntensity.MODERATE,
      enabledRitualTypes: [
        RitualType.WELCOME,
        RitualType.ACHIEVEMENT,
        RitualType.CREATION,
        RitualType.SHARING
      ],
      soundEnabled: true,
      animationEnabled: true,
      reducedMotion: false
    },
    deviceCapabilities: {
      supportsAnimation: true,
      supportsAudio: true,
      supportsHaptics: true,
      performanceLevel: 'high',
      screenSize: 'large'
    },
    culturalContext: {
      region: 'CN',
      language: 'zh-CN',
      colorPreferences: ['#FFD700', '#1E3A8A', '#7C3AED'],
      symbolPreferences: ['star', 'crown', 'diamond']
    }
  }
};

// 使用示例函数
export async function demonstrateRitualSystem() {
  console.log('🎭 仪式感系统演示开始');
  console.log('='.repeat(50));

  // 示例1: 用户登录
  console.log('\n📱 示例1: 用户登录');
  const loginAction: UserAction = {
    type: 'user_login',
    timestamp: Date.now(),
    userId: 'user-123',
    context: {
      loginMethod: 'email',
      deviceType: 'desktop'
    }
  };

  const loginResult = await ritualSystem.processUserAction(exampleUser, loginAction);
  console.log('登录仪式感检测结果:', {
    shouldTrigger: loginResult.shouldTrigger,
    ritualType: loginResult.ritualType,
    intensity: loginResult.intensity,
    confidence: `${Math.round(loginResult.confidence * 100)}%`,
    reason: loginResult.reason
  });

  // 示例2: 完成任务
  console.log('\n🎯 示例2: 完成任务');
  const taskAction: UserAction = {
    type: 'task_completed',
    timestamp: Date.now(),
    userId: 'user-123',
    context: {
      taskId: 'task-456',
      taskType: 'design',
      difficulty: 'medium',
      timeSpent: 25 * 60 * 1000 // 25分钟
    }
  };

  const taskResult = await ritualSystem.processUserAction(exampleUser, taskAction);
  console.log('任务完成仪式感检测结果:', {
    shouldTrigger: taskResult.shouldTrigger,
    ritualType: taskResult.ritualType,
    intensity: taskResult.intensity,
    confidence: `${Math.round(taskResult.confidence * 100)}%`,
    reason: taskResult.reason,
    metadata: taskResult.metadata
  });

  // 示例3: 创建项目
  console.log('\n🎨 示例3: 创建新项目');
  const createAction: UserAction = {
    type: 'project_created',
    timestamp: Date.now(),
    userId: 'user-123',
    context: {
      projectType: 'ai-artwork',
      template: 'blank',
      collaborators: 0
    }
  };

  const createResult = await ritualSystem.processUserAction(exampleUser, createAction);
  console.log('项目创建仪式感检测结果:', {
    shouldTrigger: createResult.shouldTrigger,
    ritualType: createResult.ritualType,
    intensity: createResult.intensity,
    confidence: `${Math.round(createResult.confidence * 100)}%`,
    reason: createResult.reason
  });

  // 示例4: 分享作品
  console.log('\n🚀 示例4: 分享作品');
  const shareAction: UserAction = {
    type: 'content_shared',
    timestamp: Date.now(),
    userId: 'user-123',
    context: {
      contentType: 'artwork',
      platform: 'social',
      visibility: 'public'
    }
  };

  const shareResult = await ritualSystem.processUserAction(exampleUser, shareAction);
  console.log('作品分享仪式感检测结果:', {
    shouldTrigger: shareResult.shouldTrigger,
    ritualType: shareResult.ritualType,
    intensity: shareResult.intensity,
    confidence: `${Math.round(shareResult.confidence * 100)}%`,
    reason: shareResult.reason
  });

  // 示例5: 等级提升
  console.log('\n⭐ 示例5: 等级提升');
  const levelUpAction: UserAction = {
    type: 'level_up',
    timestamp: Date.now(),
    userId: 'user-123',
    context: {
      oldLevel: 5,
      newLevel: 6,
      experienceGained: 1000,
      unlockedFeatures: ['advanced-filters', 'collaboration']
    }
  };

  const levelUpResult = await ritualSystem.processUserAction(exampleUser, levelUpAction);
  console.log('等级提升仪式感检测结果:', {
    shouldTrigger: levelUpResult.shouldTrigger,
    ritualType: levelUpResult.ritualType,
    intensity: levelUpResult.intensity,
    confidence: `${Math.round(levelUpResult.confidence * 100)}%`,
    reason: levelUpResult.reason
  });

  // 获取用户行为统计
  console.log('\n📊 用户行为统计');
  const userStats = ritualSystem.getUserStats('user-123');
  console.log('用户统计数据:', userStats);

  console.log('\n🎭 仪式感系统演示结束');
  console.log('='.repeat(50));
}

// 高级使用示例：自定义仪式感场景
export async function demonstrateCustomScenarios() {
  console.log('\n🔧 高级示例: 自定义仪式感场景');
  
  // 场景1: 新用户首次创作
  const newUser: User = {
    ...exampleUser,
    id: 'new-user-789',
    level: 1,
    joinDate: new Date(), // 刚注册
    context: {
      ...exampleUser.context,
      userId: 'new-user-789',
      userLevel: 1,
      sessionDuration: 2 * 60 * 1000 // 2分钟新会话
    }
  };

  const firstCreateAction: UserAction = {
    type: 'project_created',
    timestamp: Date.now(),
    userId: 'new-user-789',
    context: {
      isFirstProject: true,
      projectType: 'ai-artwork',
      guidedTutorial: true
    }
  };

  const newUserResult = await ritualSystem.processUserAction(newUser, firstCreateAction);
  console.log('新用户首次创作:', {
    shouldTrigger: newUserResult.shouldTrigger,
    ritualType: newUserResult.ritualType,
    intensity: newUserResult.intensity,
    confidence: `${Math.round(newUserResult.confidence * 100)}%`,
    specialHandling: '新用户应该获得更强的仪式感体验'
  });

  // 场景2: 资深用户的日常操作
  const veteranUser: User = {
    ...exampleUser,
    id: 'veteran-user-456',
    level: 25,
    joinDate: new Date('2023-01-01'), // 老用户
    context: {
      ...exampleUser.context,
      userId: 'veteran-user-456',
      userLevel: 25,
      sessionDuration: 2 * 60 * 60 * 1000 // 2小时长会话
    }
  };

  const routineAction: UserAction = {
    type: 'task_completed',
    timestamp: Date.now(),
    userId: 'veteran-user-456',
    context: {
      taskId: 'routine-task-123',
      isRoutine: true,
      completionTime: 'fast'
    }
  };

  const veteranResult = await ritualSystem.processUserAction(veteranUser, routineAction);
  console.log('资深用户日常操作:', {
    shouldTrigger: veteranResult.shouldTrigger,
    ritualType: veteranResult.ritualType,
    intensity: veteranResult.intensity,
    confidence: `${Math.round(veteranResult.confidence * 100)}%`,
    specialHandling: '资深用户的日常操作应该有更低的仪式感强度'
  });

  // 场景3: 特殊日期的操作
  const anniversaryUser: User = {
    ...exampleUser,
    joinDate: new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate()) // 正好一年前
  };

  const anniversaryAction: UserAction = {
    type: 'user_login',
    timestamp: Date.now(),
    userId: 'user-123',
    context: {
      isAnniversary: true
    }
  };

  const anniversaryResult = await ritualSystem.processUserAction(anniversaryUser, anniversaryAction);
  console.log('周年纪念日登录:', {
    shouldTrigger: anniversaryResult.shouldTrigger,
    ritualType: anniversaryResult.ritualType,
    intensity: anniversaryResult.intensity,
    confidence: `${Math.round(anniversaryResult.confidence * 100)}%`,
    specialContext: anniversaryResult.metadata?.specialContext,
    specialHandling: '特殊日期应该触发更强的仪式感'
  });
}

// 如果直接运行此文件，执行演示
if (require.main === module) {
  demonstrateRitualSystem()
    .then(() => demonstrateCustomScenarios())
    .catch(console.error);
}