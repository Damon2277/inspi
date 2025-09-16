/**
 * 阶段门控管理器测试
 * Stage Gate Manager Tests
 */

const fs = require('fs').promises;
const path = require('path');
const StageGateManager = require('../stage-gate-manager');

describe('StageGateManager', () => {
  let manager;
  let testDir;

  beforeEach(async () => {
    // 创建测试目录
    testDir = path.join(__dirname, 'temp-test-stage');
    await fs.mkdir(testDir, { recursive: true });
    
    // 切换到测试目录
    process.chdir(testDir);
    
    manager = new StageGateManager();
  });

  afterEach(async () => {
    // 清理测试目录
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('初始化', () => {
    test('应该创建默认配置文件', async () => {
      await manager.initialize();
      
      const configExists = await fs.access('.kiro/workflow-rules/stage-gate-config.json')
        .then(() => true)
        .catch(() => false);
      
      expect(configExists).toBe(true);
    });

    test('应该加载默认阶段配置', async () => {
      await manager.initialize();
      
      const stages = await manager.getStages();
      expect(stages).toContain('planning');
      expect(stages).toContain('development');
      expect(stages).toContain('testing');
      expect(stages).toContain('deployment');
    });
  });

  describe('阶段信息', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    test('应该获取阶段信息', async () => {
      const planningStage = await manager.getStageInfo('planning');
      
      expect(planningStage).toBeDefined();
      expect(planningStage.name).toBe('规划阶段');
      expect(planningStage.gates).toBeDefined();
      expect(Array.isArray(planningStage.gates)).toBe(true);
    });

    test('应该返回undefined对于不存在的阶段', async () => {
      const nonExistentStage = await manager.getStageInfo('non-existent');
      expect(nonExistentStage).toBeUndefined();
    });
  });

  describe('文件存在验证', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    test('应该验证单个文件存在', async () => {
      // 创建测试文件
      await fs.writeFile('test-file.txt', 'test content');
      
      const gate = {
        type: 'file_exists',
        target: 'test-file.txt'
      };
      
      const result = await manager.validateSingleGate(gate, {});
      expect(result.passed).toBe(true);
    });

    test('应该验证文件不存在', async () => {
      const gate = {
        type: 'file_exists',
        target: 'non-existent-file.txt'
      };
      
      const result = await manager.validateSingleGate(gate, {});
      expect(result.passed).toBe(false);
    });

    test('应该验证glob模式文件存在', async () => {
      // 创建测试目录和文件
      await fs.mkdir('.kiro/specs/test-feature', { recursive: true });
      await fs.writeFile('.kiro/specs/test-feature/requirements.md', '# Requirements');
      
      const gate = {
        type: 'file_exists',
        target: '.kiro/specs/*/requirements.md'
      };
      
      const result = await manager.validateSingleGate(gate, {});
      expect(result.passed).toBe(true);
    });
  });

  describe('模式匹配验证', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    test('应该验证模式匹配', async () => {
      // 创建测试文件
      await fs.writeFile('example.test.js', 'test content');
      
      const gate = {
        type: 'pattern_exists',
        target: '*.test.js'
      };
      
      const result = await manager.validateSingleGate(gate, {});
      expect(result.passed).toBe(true);
    });

    test('应该验证模式不匹配', async () => {
      const gate = {
        type: 'pattern_exists',
        target: '*.test.js'
      };
      
      const result = await manager.validateSingleGate(gate, {});
      expect(result.passed).toBe(false);
    });
  });

  describe('命令执行验证', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    test('应该验证成功的命令', async () => {
      const gate = {
        type: 'command',
        target: 'echo "test"'
      };
      
      const result = await manager.validateSingleGate(gate, {});
      expect(result.passed).toBe(true);
    });

    test('应该验证失败的命令', async () => {
      const gate = {
        type: 'command',
        target: 'exit 1'
      };
      
      const result = await manager.validateSingleGate(gate, {});
      expect(result.passed).toBe(false);
    });
  });

  describe('覆盖率验证', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    test('应该验证覆盖率达标', async () => {
      // 创建模拟覆盖率报告
      await fs.mkdir('coverage', { recursive: true });
      const coverageReport = {
        total: {
          lines: { pct: 85 },
          statements: { pct: 85 },
          functions: { pct: 85 },
          branches: { pct: 85 }
        }
      };
      await fs.writeFile('coverage/coverage-summary.json', JSON.stringify(coverageReport));
      
      const gate = {
        type: 'coverage',
        target: 80
      };
      
      const result = await manager.validateSingleGate(gate, {});
      expect(result.passed).toBe(true);
    });

    test('应该验证覆盖率不达标', async () => {
      // 创建模拟覆盖率报告
      await fs.mkdir('coverage', { recursive: true });
      const coverageReport = {
        total: {
          lines: { pct: 75 },
          statements: { pct: 75 },
          functions: { pct: 75 },
          branches: { pct: 75 }
        }
      };
      await fs.writeFile('coverage/coverage-summary.json', JSON.stringify(coverageReport));
      
      const gate = {
        type: 'coverage',
        target: 80
      };
      
      const result = await manager.validateSingleGate(gate, {});
      expect(result.passed).toBe(false);
    });

    test('应该处理缺少覆盖率报告', async () => {
      const gate = {
        type: 'coverage',
        target: 80
      };
      
      const result = await manager.validateSingleGate(gate, {});
      expect(result.passed).toBe(false);
      expect(result.message).toContain('未找到覆盖率报告');
    });
  });

  describe('功能状态验证', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    test('应该验证已完成的功能', async () => {
      // 创建项目状态文件
      await fs.mkdir('.kiro/project-state', { recursive: true });
      const projectState = {
        features: {
          'test-feature': {
            status: 'completed',
            completionDate: '2024-01-01'
          }
        }
      };
      await fs.writeFile(
        '.kiro/project-state/current-state.json',
        JSON.stringify(projectState)
      );
      
      const depConfig = {
        feature: 'test-feature',
        validator: 'feature_status'
      };
      
      const result = await manager.validateFeatureStatus(depConfig);
      expect(result.passed).toBe(true);
    });

    test('应该验证未完成的功能', async () => {
      // 创建项目状态文件
      await fs.mkdir('.kiro/project-state', { recursive: true });
      const projectState = {
        features: {
          'test-feature': {
            status: 'in_progress'
          }
        }
      };
      await fs.writeFile(
        '.kiro/project-state/current-state.json',
        JSON.stringify(projectState)
      );
      
      const depConfig = {
        feature: 'test-feature',
        validator: 'feature_status'
      };
      
      const result = await manager.validateFeatureStatus(depConfig);
      expect(result.passed).toBe(false);
    });
  });

  describe('任务状态验证', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    test('应该验证已完成的任务', async () => {
      // 创建任务文件
      const taskContent = `
# Tasks
- [x] 完成的任务
- [ ] 未完成的任务
      `;
      await fs.writeFile('tasks.md', taskContent);
      
      const depConfig = {
        taskFile: 'tasks.md',
        taskName: '完成的任务',
        validator: 'task_status'
      };
      
      const result = await manager.validateTaskStatus(depConfig);
      expect(result.passed).toBe(true);
    });

    test('应该验证未完成的任务', async () => {
      // 创建任务文件
      const taskContent = `
# Tasks
- [x] 完成的任务
- [ ] 未完成的任务
      `;
      await fs.writeFile('tasks.md', taskContent);
      
      const depConfig = {
        taskFile: 'tasks.md',
        taskName: '未完成的任务',
        validator: 'task_status'
      };
      
      const result = await manager.validateTaskStatus(depConfig);
      expect(result.passed).toBe(false);
    });
  });

  describe('完整门控验证', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    test('应该验证规划阶段门控', async () => {
      // 创建必需的文件
      await fs.mkdir('.kiro/specs/test-feature', { recursive: true });
      await fs.writeFile('.kiro/specs/test-feature/requirements.md', '# Requirements');
      await fs.writeFile('.kiro/specs/test-feature/design.md', '# Design');
      
      const result = await manager.validateGate('planning', {});
      
      expect(result.stage).toBe('planning');
      expect(result.passed).toBe(true);
    });

    test('应该验证门控失败', async () => {
      // 不创建必需的文件
      const result = await manager.validateGate('planning', {});
      
      expect(result.stage).toBe('planning');
      expect(result.passed).toBe(false);
      expect(result.failures.length).toBeGreaterThan(0);
    });

    test('应该处理不存在的阶段', async () => {
      await expect(manager.validateGate('non-existent', {}))
        .rejects.toThrow('未找到阶段配置: non-existent');
    });
  });

  describe('历史记录', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    test('应该保存和获取历史记录', async () => {
      // 创建必需的文件进行测试
      await fs.mkdir('.kiro/specs/test-feature', { recursive: true });
      await fs.writeFile('.kiro/specs/test-feature/requirements.md', '# Requirements');
      await fs.writeFile('.kiro/specs/test-feature/design.md', '# Design');
      
      // 执行门控验证
      await manager.validateGate('planning', {});
      
      // 获取历史记录
      const history = await manager.getHistory('planning', 5);
      
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].stage).toBe('planning');
    });

    test('应该返回空历史记录', async () => {
      const history = await manager.getHistory('non-existent', 5);
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(0);
    });
  });
});