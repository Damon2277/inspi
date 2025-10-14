/**
 * 仪式感设计系统完整演示
 * 展示整个系统的集成使用
 */

import { getRitualSystem } from '../RitualDesignSystem';
import { RitualType, RitualIntensity, User, UserAction } from '../types';

// 创建示例用户
const createExampleUser = (id: string, level: number): User => ({
  id,
  level,
  joinDate: new Date('2024-01-01'),
  lastActiveDate: new Date(),
  preferences: {
    ritualIntensity: RitualIntensity.MODERATE,
    enabledRitualTypes: [
      RitualType.WELCOME,
      RitualType.ACHIEVEMENT,
      RitualType.CREATION,
      RitualType.SHARING,
      RitualType.MILESTONE
    ],
    soundEnabled: true,
    animationEnabled: true,
    reducedMotion: false
  },
  context: {
    userId: id,
    sessionDuration: 10 * 60 * 1000, // 10分钟
    previousActions: [],
    userLevel: level,
    preferences: {
      ritualIntensity: RitualIntensity.MODERATE,
      enabledRitualTypes: [
        RitualType.WELCOME,
        RitualType.ACHIEVEMENT,
        RitualType.CREATION,
        RitualType.SHARING,
        RitualType.MILESTONE
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
      colorPreferences: ['#FFD700', '#7C3AED', '#1E3A8A'],
      symbolPreferences: ['star', 'crown', 'diamond']
    }
  }
});

type ActionContext = Record<string, unknown>;

const createUserAction = (type: string, context: ActionContext = {}): UserAction => ({
  type,
  timestamp: Date.now(),
  userId: 'demo-user',
  context,
  metadata: {
    source: 'demo',
    version: '1.0.0'
  }
});

const maybeUnrefTimeout = (handle: ReturnType<typeof setTimeout>): void => {
  if (typeof handle === 'object' && handle !== null && 'unref' in handle && typeof (handle as NodeJS.Timeout).unref === 'function') {
    (handle as NodeJS.Timeout).unref();
  }
};

/**
 * 完整系统演示
 */
export async function demonstrateCompleteSystem() {
  console.log('🎭 仪式感设计系统完整演示');
  console.log('='.repeat(60));

  try {
    // 1. 初始化系统
    console.log('\n🚀 步骤1: 初始化仪式感设计系统');
    const ritualSystem = getRitualSystem({
      enableVisual: true,
      enableAudio: true,
      enableAnimation: true,
      enablePersonalization: true,
      performanceMode: 'high',
      culturalAdaptation: true,
      accessibilityMode: false
    });

    console.log('✅ 系统初始化完成');
    console.log('系统状态:', ritualSystem.getSystemStatus());

    // 2. 创建用户
    console.log('\n👤 步骤2: 创建示例用户');
    const user = createExampleUser('demo-user', 5);
    console.log('✅ 用户创建完成:', {
      id: user.id,
      level: user.level,
      preferences: user.preferences
    });

    // 3. 演示各种仪式感场景
    console.log('\n🎬 步骤3: 演示各种仪式感场景');

    // 3.1 欢迎仪式
    console.log('\n📱 场景1: 用户登录 - 欢迎仪式');
    const loginAction = createUserAction('user_login', {
      loginMethod: 'email',
      isFirstTime: false,
      deviceType: 'desktop'
    });

    const loginResult = await ritualSystem.processUserAction(user, loginAction);
    console.log('欢迎仪式执行结果:', {
      success: loginResult.success,
      ritualType: loginResult.ritualType,
      intensity: loginResult.intensity,
      duration: `${loginResult.duration}ms`,
      components: loginResult.components
    });

    // 等待一段时间
    await new Promise<void>(resolve => {
      const timer = setTimeout(resolve, 1000);
      maybeUnrefTimeout(timer);
    });

    // 3.2 成就仪式
    console.log('\n🏆 场景2: 任务完成 - 成就仪式');
    const taskAction = createUserAction('task_completed', {
      taskId: 'design-task-001',
      taskType: 'design',
      difficulty: 'medium',
      timeSpent: 25 * 60 * 1000, // 25分钟
      points: 100
    });

    const taskResult = await ritualSystem.processUserAction(user, taskAction);
    console.log('成就仪式执行结果:', {
      success: taskResult.success,
      ritualType: taskResult.ritualType,
      intensity: taskResult.intensity,
      duration: `${taskResult.duration}ms`,
      components: taskResult.components
    });

    await new Promise<void>(resolve => {
      const timer = setTimeout(resolve, 1000);
      maybeUnrefTimeout(timer);
    });

    // 3.3 创作仪式
    console.log('\n🎨 场景3: 创建项目 - 创作仪式');
    const createAction = createUserAction('project_created', {
      projectType: 'ai-artwork',
      template: 'blank',
      collaborators: 0,
      isFirstProject: false
    });

    const createResult = await ritualSystem.processUserAction(user, createAction);
    console.log('创作仪式执行结果:', {
      success: createResult.success,
      ritualType: createResult.ritualType,
      intensity: createResult.intensity,
      duration: `${createResult.duration}ms`,
      components: createResult.components
    });

    await new Promise<void>(resolve => {
      const timer = setTimeout(resolve, 1000);
      maybeUnrefTimeout(timer);
    });

    // 3.4 分享仪式
    console.log('\n🚀 场景4: 分享作品 - 分享仪式');
    const shareAction = createUserAction('content_shared', {
      contentType: 'artwork',
      platform: 'social',
      visibility: 'public',
      expectedReach: 'medium'
    });

    const shareResult = await ritualSystem.processUserAction(user, shareAction);
    console.log('分享仪式执行结果:', {
      success: shareResult.success,
      ritualType: shareResult.ritualType,
      intensity: shareResult.intensity,
      duration: `${shareResult.duration}ms`,
      components: shareResult.components
    });

    await new Promise<void>(resolve => {
      const timer = setTimeout(resolve, 1000);
      maybeUnrefTimeout(timer);
    });

    // 3.5 里程碑仪式
    console.log('\n⭐ 场景5: 等级提升 - 里程碑仪式');
    const levelUpAction = createUserAction('level_up', {
      oldLevel: 5,
      newLevel: 6,
      experienceGained: 1000,
      unlockedFeatures: ['advanced-filters', 'collaboration'],
      isSignificantMilestone: true
    });

    const levelUpResult = await ritualSystem.processUserAction(user, levelUpAction);
    console.log('里程碑仪式执行结果:', {
      success: levelUpResult.success,
      ritualType: levelUpResult.ritualType,
      intensity: levelUpResult.intensity,
      duration: `${levelUpResult.duration}ms`,
      components: levelUpResult.components
    });

    // 4. 个性化功能演示
    console.log('\n🧠 步骤4: 个性化功能演示');
    
    // 模拟用户反馈
    ritualSystem.recordUserFeedback('demo-user', 'ritual-001', 5, '非常喜欢这个欢迎动画！');
    ritualSystem.recordUserFeedback('demo-user', 'ritual-002', 4, '成就庆祝很棒，但音效可以再柔和一些');
    ritualSystem.recordUserFeedback('demo-user', 'ritual-003', 3, '创作仪式还不错');

    const userProfile = ritualSystem.getUserProfile('demo-user');
    console.log('用户个性化档案:', {
      userId: userProfile?.userId,
      preferences: userProfile?.preferences,
      historyCount: {
        rituals: userProfile?.history.triggeredRituals.length || 0,
        feedback: userProfile?.history.userFeedback.length || 0
      }
    });

    // 5. 配置管理演示
    console.log('\n⚙️ 步骤5: 配置管理演示');
    const configManager = ritualSystem.getConfigurationManager();
    const allConfigs = configManager.getAllConfigurations();
    console.log('可用配置数量:', allConfigs.length);
    console.log('活跃配置:', configManager.getActiveConfiguration()?.name);

    // 6. 系统性能监控
    console.log('\n📊 步骤6: 系统性能监控');
    const finalStatus = ritualSystem.getSystemStatus();
    console.log('最终系统状态:', finalStatus);

    // 7. 演示不同用户类型的体验差异
    console.log('\n👥 步骤7: 不同用户类型体验对比');
    
    // 新用户
    const newUser = createExampleUser('new-user', 1);
    newUser.context.sessionDuration = 2 * 60 * 1000; // 2分钟新会话
    
    const newUserResult = await ritualSystem.processUserAction(newUser, loginAction);
    console.log('新用户体验:', {
      intensity: newUserResult.intensity,
      duration: `${newUserResult.duration}ms`
    });

    // 资深用户
    const veteranUser = createExampleUser('veteran-user', 25);
    veteranUser.context.sessionDuration = 2 * 60 * 60 * 1000; // 2小时长会话
    veteranUser.preferences.ritualIntensity = RitualIntensity.SUBTLE; // 偏好低强度
    
    const veteranResult = await ritualSystem.processUserAction(veteranUser, loginAction);
    console.log('资深用户体验:', {
      intensity: veteranResult.intensity,
      duration: `${veteranResult.duration}ms`
    });

    // 8. 可访问性模式演示
    console.log('\n♿ 步骤8: 可访问性模式演示');
    ritualSystem.updateConfig({
      accessibilityMode: true,
      enableAnimation: false // 为可访问性禁用动画
    });

    const accessibleUser = createExampleUser('accessible-user', 3);
    accessibleUser.preferences.reducedMotion = true;
    accessibleUser.preferences.animationEnabled = false;

    const accessibleResult = await ritualSystem.processUserAction(accessibleUser, taskAction);
    console.log('可访问性模式体验:', {
      success: accessibleResult.success,
      components: accessibleResult.components,
      duration: `${accessibleResult.duration}ms`
    });

    console.log('\n🎉 演示完成！');
    console.log('='.repeat(60));
    
    return {
      success: true,
      message: '仪式感设计系统完整演示成功完成',
      results: {
        totalScenarios: 5,
        userTypes: 3,
        systemFeatures: [
          '智能检测',
          '视觉效果',
          '音频反馈', 
          '动画系统',
          '个性化学习',
          '配置管理',
          '性能监控',
          '可访问性支持'
        ]
      }
    };

  } catch (error) {
    console.error('演示过程中发生错误:', error);
    return {
      success: false,
      message: '演示失败',
      error: (error as Error).message
    };
  }
}

/**
 * 性能压力测试
 */
export async function performanceStressTest() {
  console.log('\n🔥 性能压力测试');
  console.log('-'.repeat(40));

  const ritualSystem = getRitualSystem();
  const user = createExampleUser('stress-test-user', 10);
  
  const startTime = Date.now();
  // 并发执行多个仪式感
  const promises = [];
  for (let i = 0; i < 10; i++) {
    const action = createUserAction('task_completed', { taskId: `stress-task-${i}` });
    promises.push(ritualSystem.processUserAction(user, action));
  }

  const concurrentResults = await Promise.allSettled(promises);
  const successCount = concurrentResults.filter(r => r.status === 'fulfilled').length;
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;

  console.log('压力测试结果:', {
    totalRequests: 10,
    successfulRequests: successCount,
    failedRequests: 10 - successCount,
    totalTime: `${totalTime}ms`,
    averageTime: `${totalTime / 10}ms`,
    requestsPerSecond: Math.round(10000 / totalTime)
  });

  return {
    totalRequests: 10,
    successfulRequests: successCount,
    totalTime,
    averageTime: totalTime / 10
  };
}

// 如果直接运行此文件
if (require.main === module) {
  demonstrateCompleteSystem()
    .then(result => {
      console.log('\n📋 最终结果:', result);
      return performanceStressTest();
    })
    .then(perfResult => {
      console.log('\n⚡ 性能测试完成:', perfResult);
    })
    .catch(console.error);
}
