/**
 * 预提交检查系统测试
 * Pre-commit Checker Tests
 */

const fs = require('fs').promises;
const path = require('path');
const PreCommitChecker = require('../pre-commit-checker');

describe('PreCommitChecker', () => {
  let checker;
  let testDir;

  beforeEach(async () => {
    // 创建测试目录
    testDir = path.join(__dirname, 'temp-test');
    await fs.mkdir(testDir, { recursive: true });
    
    // 切换到测试目录
    process.chdir(testDir);
    
    checker = new PreCommitChecker();
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
      await checker.initialize();
      
      const configExists = await fs.access('.kiro/workflow-rules/pre-commit-config.json')
        .then(() => true)
        .catch(() => false);
      
      expect(configExists).toBe(true);
    });

    test('应该使用现有配置文件', async () => {
      // 创建自定义配置
      await fs.mkdir('.kiro/workflow-rules', { recursive: true });
      const customConfig = {
        checks: {
          runExistingTests: false,
          checkStyleConsistency: true
        }
      };
      await fs.writeFile(
        '.kiro/workflow-rules/pre-commit-config.json',
        JSON.stringify(customConfig, null, 2)
      );

      await checker.initialize();
      
      const config = await checker.loadConfig();
      expect(config.checks.runExistingTests).toBe(false);
      expect(config.checks.checkStyleConsistency).toBe(true);
    });
  });

  describe('测试检查', () => {
    beforeEach(async () => {
      await checker.initialize();
    });

    test('应该跳过测试当没有测试文件时', async () => {
      const hasTests = await checker.checkForTestFiles();
      expect(hasTests).toBe(false);
    });

    test('应该检测到测试文件', async () => {
      // 创建测试文件
      await fs.writeFile('example.test.js', 'test("example", () => {});');
      
      const hasTests = await checker.checkForTestFiles();
      expect(hasTests).toBe(true);
    });

    test('应该运行现有测试检查', async () => {
      // 创建 package.json
      const packageJson = {
        scripts: {
          test: 'echo "测试通过"'
        }
      };
      await fs.writeFile('package.json', JSON.stringify(packageJson, null, 2));
      
      // 创建测试文件
      await fs.writeFile('example.test.js', 'test("example", () => {});');
      
      const config = await checker.loadConfig();
      const result = await checker.runExistingTests(config);
      
      expect(result.status).toBeDefined();
      expect(['passed', 'failed', 'skipped', 'error']).toContain(result.status);
    });
  });

  describe('样式检查', () => {
    beforeEach(async () => {
      await checker.initialize();
    });

    test('应该跳过样式检查当没有样式文件时', async () => {
      const styleFiles = await checker.findStyleFiles();
      expect(styleFiles).toHaveLength(0);
    });

    test('应该检测到样式文件', async () => {
      await fs.writeFile('styles.css', '.test { color: red; }');
      
      const styleFiles = await checker.findStyleFiles();
      expect(styleFiles.length).toBeGreaterThan(0);
      expect(styleFiles.some(file => file.includes('styles.css'))).toBe(true);
    });

    test('应该运行样式一致性检查', async () => {
      await fs.writeFile('styles.css', '.test { color: red; }');
      
      const result = await checker.checkStyleConsistency();
      
      expect(result.status).toBeDefined();
      expect(['passed', 'failed', 'warning', 'skipped', 'error']).toContain(result.status);
    });
  });

  describe('功能状态验证', () => {
    beforeEach(async () => {
      await checker.initialize();
    });

    test('应该跳过状态验证当没有状态文件时', async () => {
      const result = await checker.validateFeatureStatus();
      
      expect(result.status).toBe('skipped');
      expect(result.messages).toContain('项目状态文件不存在，跳过状态验证');
    });

    test('应该验证项目状态一致性', async () => {
      // 创建项目状态文件
      await fs.mkdir('.kiro/project-state', { recursive: true });
      const projectState = {
        features: {
          'test-feature': {
            status: 'completed',
            completionDate: '2024-01-01'
          },
          'incomplete-feature': {
            status: 'in_progress'
          }
        }
      };
      await fs.writeFile(
        '.kiro/project-state/current-state.json',
        JSON.stringify(projectState, null, 2)
      );
      
      const result = await checker.validateFeatureStatus();
      
      expect(result.status).toBeDefined();
      expect(['passed', 'warning', 'error']).toContain(result.status);
    });

    test('应该检测状态不一致问题', () => {
      const projectState = {
        features: {
          'inconsistent-feature': {
            status: 'completed'
            // 缺少 completionDate
          },
          'another-inconsistent': {
            status: 'in_progress',
            completionDate: '2024-01-01' // 不应该有完成日期
          }
        }
      };
      
      const inconsistencies = checker.checkStateConsistency(projectState);
      
      expect(inconsistencies).toHaveLength(2);
      expect(inconsistencies[0]).toContain('inconsistent-feature');
      expect(inconsistencies[1]).toContain('another-inconsistent');
    });
  });

  describe('依赖验证', () => {
    beforeEach(async () => {
      await checker.initialize();
    });

    test('应该检测依赖冲突', async () => {
      const packageData = {
        dependencies: {
          'lodash': '^4.17.21',
          'react': '^18.0.0'
        },
        devDependencies: {
          'lodash': '^4.17.21', // 冲突
          'jest': '^29.0.0'
        }
      };
      
      const conflicts = await checker.checkDependencyConflicts(packageData);
      
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toContain('lodash');
    });

    test('应该运行依赖验证', async () => {
      // 创建 package.json
      const packageJson = {
        dependencies: {
          'react': '^18.0.0'
        },
        devDependencies: {
          'jest': '^29.0.0'
        }
      };
      await fs.writeFile('package.json', JSON.stringify(packageJson, null, 2));
      
      const result = await checker.verifyDependencies();
      
      expect(result.status).toBeDefined();
      expect(['passed', 'warning', 'error']).toContain(result.status);
    });
  });

  describe('完整检查流程', () => {
    beforeEach(async () => {
      await checker.initialize();
    });

    test('应该运行完整的预提交检查', async () => {
      // 创建基本项目结构
      const packageJson = {
        scripts: {
          test: 'echo "测试通过"'
        }
      };
      await fs.writeFile('package.json', JSON.stringify(packageJson, null, 2));
      
      const results = await checker.runChecks();
      
      expect(results).toHaveProperty('timestamp');
      expect(results).toHaveProperty('overall');
      expect(results).toHaveProperty('checks');
      expect(results).toHaveProperty('summary');
      
      expect(['passed', 'failed', 'warning', 'error']).toContain(results.overall);
      expect(typeof results.summary.passed).toBe('number');
      expect(typeof results.summary.failed).toBe('number');
      expect(typeof results.summary.warnings).toBe('number');
      expect(typeof results.summary.skipped).toBe('number');
    });

    test('应该正确计算总体结果', () => {
      const results = {
        checks: {
          test1: { status: 'passed' },
          test2: { status: 'passed' },
          test3: { status: 'warning' }
        },
        summary: {}
      };
      
      checker.calculateOverallResult(results);
      
      expect(results.overall).toBe('warning');
      expect(results.summary.passed).toBe(2);
      expect(results.summary.failed).toBe(0);
      expect(results.summary.warnings).toBe(1);
      expect(results.summary.skipped).toBe(0);
    });

    test('应该保存检查结果', async () => {
      const results = {
        timestamp: new Date().toISOString(),
        overall: 'passed',
        checks: {},
        summary: { passed: 1, failed: 0, warnings: 0, skipped: 0 }
      };
      
      await checker.saveResults(results);
      
      const savedData = await fs.readFile('.kiro/workflow-rules/check-results.json', 'utf8');
      const savedResults = JSON.parse(savedData);
      
      expect(savedResults.overall).toBe('passed');
      expect(savedResults.summary.passed).toBe(1);
    });
  });

  describe('工具方法', () => {
    test('应该返回正确的状态图标', () => {
      expect(checker.getStatusIcon('passed')).toBe('✅');
      expect(checker.getStatusIcon('failed')).toBe('❌');
      expect(checker.getStatusIcon('warning')).toBe('⚠️');
      expect(checker.getStatusIcon('skipped')).toBe('⏭️');
      expect(checker.getStatusIcon('error')).toBe('💥');
      expect(checker.getStatusIcon('unknown')).toBe('❓');
    });
  });
});