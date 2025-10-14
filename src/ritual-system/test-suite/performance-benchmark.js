/**
 * 仪式感设计系统 - 性能基准测试
 */

class PerformanceBenchmark {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      environment: {
        platform: process.platform,
        nodeVersion: process.version,
        memory: process.memoryUsage()
      },
      benchmarks: []
    };
  }

  async runBenchmark(name, testFn, iterations = 1000) {
    console.log(`🔥 运行基准测试: ${name} (${iterations}次迭代)`);
    
    // 预热
    for (let i = 0; i < 10; i++) {
      await testFn();
    }

    // 垃圾回收
    if (global.gc) {
      global.gc();
    }

    const startMemory = process.memoryUsage();
    const startTime = process.hrtime.bigint();

    // 执行测试
    for (let i = 0; i < iterations; i++) {
      await testFn();
    }

    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();

    const duration = Number(endTime - startTime) / 1000000; // 转换为毫秒
    const avgDuration = duration / iterations;
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

    const result = {
      name,
      iterations,
      totalDuration: duration,
      averageDuration: avgDuration,
      operationsPerSecond: Math.round(1000 / avgDuration),
      memoryDelta,
      memoryPerOperation: memoryDelta / iterations
    };

    this.results.benchmarks.push(result);
    
    console.log(`   ⏱️  平均耗时: ${avgDuration.toFixed(3)}ms`);
    console.log(`   🚀 每秒操作: ${result.operationsPerSecond}`);
    console.log(`   💾 内存增量: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);

    return result;
  }

  generateReport() {
    return {
      summary: {
        totalBenchmarks: this.results.benchmarks.length,
        fastestOperation: this.results.benchmarks.reduce((min, b) => 
          b.averageDuration < min.averageDuration ? b : min),
        slowestOperation: this.results.benchmarks.reduce((max, b) => 
          b.averageDuration > max.averageDuration ? b : max),
        totalMemoryUsed: this.results.benchmarks.reduce((sum, b) => 
          sum + Math.max(0, b.memoryDelta), 0)
      },
      details: this.results.benchmarks,
      environment: this.results.environment,
      timestamp: this.results.timestamp
    };
  }
}

// 模拟仪式感系统的核心操作
const mockOperations = {
  // 仪式感检测
  detectRitual: async () => {
    const user = { id: 'test', level: 5, preferences: {} };
    const action = { type: 'user_login', timestamp: Date.now() };
    
    // 模拟检测逻辑
    const rules = [
      { type: 'user_login', ritual: 'welcome' },
      { type: 'task_completed', ritual: 'achievement' }
    ];
    
    const match = rules.find(rule => rule.type === action.type);
    return {
      shouldTrigger: !!match,
      ritualType: match?.ritual,
      intensity: 2,
      confidence: 0.8
    };
  },

  // 视觉效果应用
  applyVisualEffects: async () => {
    const effects = {
      colorTheme: 'gold',
      intensity: 2,
      decorativeLevel: 'moderate'
    };
    
    // 模拟DOM操作
    const element = { classList: { add: () => {}, remove: () => {} } };
    element.classList.add(`ritual-theme-${effects.colorTheme}`);
    element.classList.add(`ritual-intensity-${effects.intensity}`);
    
    return effects;
  },

  // 动画执行
  executeAnimation: async () => {
    const keyframes = [
      { opacity: 0, transform: 'scale(0.8)' },
      { opacity: 1, transform: 'scale(1)' }
    ];
    
    const options = {
      duration: 600,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    };
    
    // 模拟动画计算
    for (let i = 0; i < 60; i++) {
      const progress = i / 60;
      const frame = {
        opacity: keyframes[0].opacity + (keyframes[1].opacity - keyframes[0].opacity) * progress
      };
    }
    
    return { completed: true, duration: options.duration };
  },

  // 音频播放
  playAudio: async () => {
    const audioConfig = {
      soundId: 'welcome-chime',
      volume: 0.7,
      duration: 2000
    };
    
    // 模拟音频处理
    const samples = new Array(audioConfig.duration * 44.1).fill(0);
    samples.forEach((_, i) => {
      samples[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * audioConfig.volume;
    });
    
    return audioConfig;
  },

  // 个性化学习
  updatePersonalization: async () => {
    const userProfile = {
      preferences: { intensity: 2, types: ['welcome', 'achievement'] },
      history: new Array(100).fill(null).map((_, i) => ({
        id: i,
        type: 'ritual_event',
        timestamp: Date.now() - i * 1000
      }))
    };
    
    // 模拟学习算法
    const feedback = 'positive';
    const learningRate = 0.1;
    const adjustment = feedback === 'positive' ? 0.1 : -0.1;
    
    userProfile.preferences.intensity += adjustment * learningRate;
    userProfile.preferences.intensity = Math.max(1, Math.min(4, userProfile.preferences.intensity));
    
    return userProfile;
  },

  // 配置验证
  validateConfiguration: async () => {
    const config = {
      id: 'test-config',
      name: 'Test Configuration',
      visual: {
        colorScheme: { primary: '#FFD700', secondary: '#1E3A8A' },
        intensity: { 1: { opacity: 0.3 }, 2: { opacity: 0.6 } }
      },
      audio: {
        volume: { master: 0.8, effects: 0.7 }
      }
    };
    
    // 模拟验证逻辑
    const errors = [];
    const warnings = [];
    
    // 验证颜色
    Object.values(config.visual.colorScheme).forEach(color => {
      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        errors.push(`Invalid color: ${color}`);
      }
    });
    
    // 验证音量
    Object.values(config.audio.volume).forEach(volume => {
      if (volume < 0 || volume > 1) {
        errors.push(`Invalid volume: ${volume}`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  },

  // 复杂场景模拟
  complexRitualExecution: async () => {
    // 组合多个操作
    const detection = await mockOperations.detectRitual();
    if (detection.shouldTrigger) {
      await Promise.all([
        mockOperations.applyVisualEffects(),
        mockOperations.executeAnimation(),
        mockOperations.playAudio()
      ]);
      await mockOperations.updatePersonalization();
    }
    return detection;
  }
};

async function runPerformanceBenchmarks() {
  console.log('🚀 仪式感设计系统性能基准测试');
  console.log('='.repeat(60));

  const benchmark = new PerformanceBenchmark();

  // 基础操作基准测试
  await benchmark.runBenchmark('仪式感检测', mockOperations.detectRitual, 10000);
  await benchmark.runBenchmark('视觉效果应用', mockOperations.applyVisualEffects, 5000);
  await benchmark.runBenchmark('动画执行', mockOperations.executeAnimation, 1000);
  await benchmark.runBenchmark('音频播放', mockOperations.playAudio, 500);
  await benchmark.runBenchmark('个性化学习', mockOperations.updatePersonalization, 1000);
  await benchmark.runBenchmark('配置验证', mockOperations.validateConfiguration, 2000);

  // 复杂场景基准测试
  await benchmark.runBenchmark('完整仪式执行', mockOperations.complexRitualExecution, 500);

  const report = benchmark.generateReport();
  
  console.log('\n📊 性能基准测试报告');
  console.log('='.repeat(60));
  console.log(`🏆 最快操作: ${report.summary.fastestOperation.name} (${report.summary.fastestOperation.averageDuration.toFixed(3)}ms)`);
  console.log(`🐌 最慢操作: ${report.summary.slowestOperation.name} (${report.summary.slowestOperation.averageDuration.toFixed(3)}ms)`);
  console.log(`💾 总内存使用: ${(report.summary.totalMemoryUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`🧪 总基准测试: ${report.summary.totalBenchmarks}项`);

  console.log('\n📈 详细性能指标:');
  report.details.forEach(benchmark => {
    console.log(`\n${benchmark.name}:`);
    console.log(`   平均耗时: ${benchmark.averageDuration.toFixed(3)}ms`);
    console.log(`   每秒操作: ${benchmark.operationsPerSecond.toLocaleString()}`);
    console.log(`   内存/操作: ${(benchmark.memoryPerOperation / 1024).toFixed(2)}KB`);
  });

  // 性能等级评估
  console.log('\n🎯 性能等级评估:');
  const performanceGrades = {
    excellent: { threshold: 1, emoji: '🚀', label: '优秀' },
    good: { threshold: 5, emoji: '✅', label: '良好' },
    acceptable: { threshold: 10, emoji: '⚠️', label: '可接受' },
    poor: { threshold: Infinity, emoji: '❌', label: '需优化' }
  };

  report.details.forEach(benchmark => {
    let grade = performanceGrades.poor;
    for (const [level, config] of Object.entries(performanceGrades)) {
      if (benchmark.averageDuration <= config.threshold) {
        grade = config;
        break;
      }
    }
    console.log(`   ${grade.emoji} ${benchmark.name}: ${grade.label}`);
  });

  // 性能建议
  console.log('\n💡 性能优化建议:');
  const suggestions = [];
  
  report.details.forEach(benchmark => {
    if (benchmark.averageDuration > 10) {
      suggestions.push(`优化 ${benchmark.name} - 当前耗时 ${benchmark.averageDuration.toFixed(3)}ms`);
    }
    if (benchmark.memoryPerOperation > 1024 * 10) { // 10KB
      suggestions.push(`减少 ${benchmark.name} 的内存使用 - 当前 ${(benchmark.memoryPerOperation / 1024).toFixed(2)}KB/操作`);
    }
  });

  if (suggestions.length === 0) {
    console.log('   🎉 所有操作性能表现优异，无需优化！');
  } else {
    suggestions.forEach(suggestion => {
      console.log(`   • ${suggestion}`);
    });
  }

  // 保存报告
  const fs = require('fs');
  const path = require('path');
  const reportPath = path.join(__dirname, 'performance-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 详细报告已保存到: ${reportPath}`);

  return report;
}

// 内存泄漏测试
async function memoryLeakTest() {
  console.log('\n🔍 内存泄漏测试');
  console.log('-'.repeat(40));

  const initialMemory = process.memoryUsage().heapUsed;
  const iterations = 1000;

  for (let i = 0; i < iterations; i++) {
    await mockOperations.complexRitualExecution();
    
    // 每100次迭代检查一次内存
    if (i % 100 === 0) {
      const currentMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = currentMemory - initialMemory;
      console.log(`   迭代 ${i}: 内存增长 ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  const finalMemory = process.memoryUsage().heapUsed;
  const totalIncrease = finalMemory - initialMemory;
  const increasePerOperation = totalIncrease / iterations;

  console.log(`\n内存泄漏测试结果:`);
  console.log(`   总内存增长: ${(totalIncrease / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   每操作增长: ${(increasePerOperation / 1024).toFixed(2)}KB`);
  
  if (increasePerOperation < 1024) { // 小于1KB
    console.log(`   🎉 内存使用稳定，无明显泄漏`);
  } else if (increasePerOperation < 10240) { // 小于10KB
    console.log(`   ⚠️  内存增长轻微，建议监控`);
  } else {
    console.log(`   ❌ 检测到内存泄漏，需要优化`);
  }
}

// 并发性能测试
async function concurrencyTest() {
  console.log('\n⚡ 并发性能测试');
  console.log('-'.repeat(40));

  const concurrencyLevels = [1, 5, 10, 20, 50];
  
  for (const level of concurrencyLevels) {
    console.log(`\n测试并发级别: ${level}`);
    
    const startTime = Date.now();
    const promises = Array(level).fill(null).map(() => 
      mockOperations.complexRitualExecution()
    );
    
    await Promise.all(promises);
    
    const duration = Date.now() - startTime;
    const avgDuration = duration / level;
    
    console.log(`   总耗时: ${duration}ms`);
    console.log(`   平均耗时: ${avgDuration.toFixed(2)}ms`);
    console.log(`   吞吐量: ${Math.round(level * 1000 / duration)} ops/sec`);
  }
}

// 主函数
async function main() {
  try {
    const performanceReport = await runPerformanceBenchmarks();
    await memoryLeakTest();
    await concurrencyTest();
    
    console.log('\n🎉 性能测试完成！');
    return performanceReport;
  } catch (error) {
    console.error('性能测试失败:', error);
    throw error;
  }
}

module.exports = {
  runPerformanceBenchmarks,
  memoryLeakTest,
  concurrencyTest,
  PerformanceBenchmark
};

// 如果直接运行此文件
if (require.main === module) {
  main().catch(console.error);
}