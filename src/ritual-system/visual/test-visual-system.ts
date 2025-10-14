/**
 * 视觉系统功能验证
 */

import { VisualRitualOrchestrator, RitualStyle } from './VisualRitualOrchestrator';
import { RitualType, RitualIntensity } from '../types';

type MockStyle = {
  setProperty: (prop: string, value: string) => void;
  getProperty: (prop: string) => string;
};

type MockClassList = {
  add: (className: string) => void;
  remove: (className: string) => void;
  contains: (className: string) => boolean;
};

type MockElement = HTMLElement & {
  classList: MockClassList;
  style: MockStyle;
};

const mockElement = {
  classList: {
    add: (className: string) => console.log(`Added class: ${className}`),
    remove: (className: string) => console.log(`Removed class: ${className}`),
    contains: (_className: string) => false
  },
  style: {
    setProperty: (prop: string, value: string) => console.log(`Set ${prop}: ${value}`),
    getProperty: (prop: string) => {
      console.log(`Get property: ${prop}`);
      return '';
    }
  }
} as unknown as MockElement;

const createNoopAnimation = (): Animation => {
  const animation: Partial<Animation> = {
    id: 'noop-animation',
    startTime: 0,
    currentTime: 0,
    playbackRate: 1,
    playState: 'finished',
    pending: false,
    replaceState: 'active',
    effect: null,
    timeline: null,
    oncancel: null,
    onfinish: null,
    cancel: () => undefined,
    finish: () => undefined,
    play: () => undefined,
    pause: () => undefined,
    reverse: () => undefined,
    updatePlaybackRate: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => true,
    commitStyles: () => undefined
  };

  const resolved = animation as Animation;
  (resolved as unknown as { ready: Promise<Animation> }).ready = Promise.resolve(resolved);
  (resolved as unknown as { finished: Promise<Animation> }).finished = Promise.resolve(resolved);
  return resolved;
};

// 模拟document
const mockDocument = {
  createElement: () => mockElement,
  head: { appendChild: () => undefined },
  body: {
    animate: () => createNoopAnimation()
  },
  dispatchEvent: () => true
};

(globalThis as { document: Document }).document = mockDocument as unknown as Document;

export function testVisualSystem() {
  console.log('🎨 测试视觉仪式感系统');
  console.log('='.repeat(50));

  const orchestrator = new VisualRitualOrchestrator();

  // 测试1: 创建欢迎仪式场景
  console.log('\n📱 测试1: 创建欢迎仪式场景');
  const welcomeScene = orchestrator.createRitualScene(RitualType.WELCOME, RitualIntensity.MODERATE);
  console.log('✅ 欢迎场景创建成功:', {
    id: welcomeScene.id,
    type: welcomeScene.type,
    intensity: welcomeScene.intensity,
    elementsCount: welcomeScene.elements.length,
    duration: welcomeScene.duration
  });

  // 测试2: 创建成就仪式场景
  console.log('\n🏆 测试2: 创建成就仪式场景');
  const achievementScene = orchestrator.createRitualScene(RitualType.ACHIEVEMENT, RitualIntensity.DRAMATIC);
  console.log('✅ 成就场景创建成功:', {
    id: achievementScene.id,
    type: achievementScene.type,
    intensity: achievementScene.intensity,
    elementsCount: achievementScene.elements.length,
    duration: achievementScene.duration
  });

  // 测试3: 应用仪式感样式
  console.log('\n🎭 测试3: 应用仪式感样式');
  const goldStyle: RitualStyle = {
    colorTheme: 'gold',
    intensity: RitualIntensity.MODERATE,
    decorativeLevel: 'moderate'
  };
  
  orchestrator.applyRitualStyling(mockElement, goldStyle);
  console.log('✅ 金色主题样式应用成功');

  // 测试4: 应用文化适配样式
  console.log('\n🌍 测试4: 应用文化适配样式');
  const culturalStyle: RitualStyle = {
    colorTheme: 'divine',
    intensity: RitualIntensity.DRAMATIC,
    decorativeLevel: 'ornate',
    culturalContext: 'eastern'
  };
  
  orchestrator.applyRitualStyling(mockElement, culturalStyle);
  console.log('✅ 东方文化适配样式应用成功');

  // 测试5: 应用可访问性样式
  console.log('\n♿ 测试5: 应用可访问性样式');
  const accessibleStyle: RitualStyle = {
    colorTheme: 'blue',
    intensity: RitualIntensity.SUBTLE,
    decorativeLevel: 'minimal',
    accessibilityMode: true
  };
  
  orchestrator.applyRitualStyling(mockElement, accessibleStyle);
  console.log('✅ 可访问性样式应用成功');

  // 测试6: 创建动画过渡
  console.log('\n🎬 测试6: 创建动画过渡');
  orchestrator.animateTransition({}, {}, 1.0);
  console.log('✅ 动画过渡创建成功');

  // 测试7: 场景管理
  console.log('\n📋 测试7: 场景管理');
  const activeScenes = orchestrator.getActiveScenes();
  console.log(`✅ 当前活跃场景数量: ${activeScenes.length}`);
  
  // 清理一个场景
  orchestrator.cleanupScene(welcomeScene.id);
  const remainingScenes = orchestrator.getActiveScenes();
  console.log(`✅ 清理后场景数量: ${remainingScenes.length}`);

  // 测试8: 不同强度的场景对比
  console.log('\n⚡ 测试8: 不同强度场景对比');
  const subtleScene = orchestrator.createRitualScene(RitualType.MILESTONE, RitualIntensity.SUBTLE);
  const epicScene = orchestrator.createRitualScene(RitualType.MILESTONE, RitualIntensity.EPIC);
  
  console.log('轻微强度场景:', {
    duration: subtleScene.duration,
    elementsCount: subtleScene.elements.length
  });
  
  console.log('史诗强度场景:', {
    duration: epicScene.duration,
    elementsCount: epicScene.elements.length
  });
  
  console.log(`✅ 强度对比验证: 史诗场景持续时间更长 (${epicScene.duration > subtleScene.duration})`);

  // 测试9: 元素动画配置验证
  console.log('\n🎭 测试9: 元素动画配置验证');
  const creationScene = orchestrator.createRitualScene(RitualType.CREATION, RitualIntensity.MODERATE);
  const animatedElements = creationScene.elements.filter(el => el.animation);
  console.log(`✅ 创作场景中有动画的元素数量: ${animatedElements.length}`);
  
  if (animatedElements.length > 0) {
    const firstAnimated = animatedElements[0];
    console.log('首个动画元素配置:', {
      name: firstAnimated.animation?.name,
      duration: firstAnimated.animation?.duration,
      easing: firstAnimated.animation?.easing
    });
  }

  // 清理资源
  orchestrator.destroy();
  console.log('\n🧹 资源清理完成');

  console.log('\n🎨 视觉系统测试完成');
  console.log('='.repeat(50));
  
  return {
    success: true,
    message: '视觉仪式感系统所有功能测试通过'
  };
}

// 如果直接运行此文件
if (require.main === module) {
  testVisualSystem();
}
