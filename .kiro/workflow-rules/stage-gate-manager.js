/**
 * 开发阶段门控机制
 * Development Stage Gate Manager
 */

const fs = require('fs').promises;
const path = require('path');

class StageGateManager {
  constructor() {
    this.configPath = '.kiro/workflow-rules/stage-gate-config.json';
    this.resultsPath = '.kiro/workflow-rules/stage-gate-results.json';
    this.defaultConfig = {
      stages: {
        'planning': {
          name: '规划阶段',
          description: '项目规划和需求分析阶段',
          prerequisites: [],
          gates: [
            {
              id: 'requirements_defined',
              name: '需求已定义',
              type: 'file_exists',
              target: '.kiro/specs/*/requirements.md',
              required: true
            },
            {
              id: 'design_approved',
              name: '设计已批准',
              type: 'file_exists',
              target: '.kiro/specs/*/design.md',
              required: true
            }
          ]
        },
        'development': {
          name: '开发阶段',
          description: '代码开发和实现阶段',
          prerequisites: ['planning'],
          gates: [
            {
              id: 'tasks_defined',
              name: '任务已定义',
              type: 'file_exists',
              target: '.kiro/specs/*/tasks.md',
              required: true
            },
            {
              id: 'tests_exist',
              name: '测试文件存在',
              type: 'pattern_exists',
              target: '**/*.test.{js,ts}',
              required: false
            },
            {
              id: 'code_quality',
              name: '代码质量检查',
              type: 'command',
              target: 'npx eslint . --format json',
              required: false
            }
          ]
        },
        'testing': {
          name: '测试阶段',
          description: '功能测试和质量保证阶段',
          prerequisites: ['development'],
          gates: [
            {
              id: 'unit_tests_pass',
              name: '单元测试通过',
              type: 'command',
              target: 'npm test -- --run',
              required: true
            },
            {
              id: 'integration_tests_pass',
              name: '集成测试通过',
              type: 'command',
              target: 'npm run test:integration',
              required: false
            },
            {
              id: 'coverage_threshold',
              name: '测试覆盖率达标',
              type: 'coverage',
              target: 80,
              required: false
            }
          ]
        },
        'deployment': {
          name: '部署阶段',
          description: '部署和发布阶段',
          prerequisites: ['testing'],
          gates: [
            {
              id: 'build_success',
              name: '构建成功',
              type: 'command',
              target: 'npm run build',
              required: true
            },
            {
              id: 'deployment_config',
              name: '部署配置存在',
              type: 'file_exists',
              target: '.github/workflows/*.yml',
              required: false
            }
          ]
        }
      },
      dependencies: {
        'feature_completion': {
          name: '功能完成依赖',
          description: '检查功能是否完成',
          validator: 'feature_status'
        },
        'task_completion': {
          name: '任务完成依赖',
          description: '检查任务是否完成',
          validator: 'task_status'
        }
      }
    };
  }

  /**
   * 初始化阶段门控管理器
   */
  async initialize() {
    try {
      // 确保配置目录存在
      await fs.mkdir('.kiro/workflow-rules', { recursive: true });
      
      // 创建默认配置文件
      try {
        await fs.access(this.configPath);
      } catch {
        await fs.writeFile(this.configPath, JSON.stringify(this.defaultConfig, null, 2));
        console.log('✅ 创建阶段门控配置文件');
      }
    } catch (error) {
      console.error('❌ 阶段门控管理器初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 验证阶段门控
   */
  async validateGate(stageName, context = {}) {
    console.log(`🔍 验证阶段门控: ${stageName}`);
    
    const config = await this.loadConfig();
    const stage = config.stages[stageName];
    
    if (!stage) {
      throw new Error(`未找到阶段配置: ${stageName}`);
    }

    const result = {
      stage: stageName,
      timestamp: new Date().toISOString(),
      passed: false,
      prerequisites: {
        checked: [],
        passed: [],
        failed: []
      },
      gates: {
        checked: [],
        passed: [],
        failed: [],
        skipped: []
      },
      context,
      failures: [],
      warnings: []
    };

    try {
      // 1. 检查前置条件
      if (stage.prerequisites && stage.prerequisites.length > 0) {
        console.log('  📋 检查前置条件...');
        await this.checkPrerequisites(stage.prerequisites, result, config);
      }

      // 2. 检查门控条件
      console.log('  🚪 检查门控条件...');
      await this.checkGates(stage.gates, result, context);

      // 3. 检查依赖关系
      if (context.dependencies) {
        console.log('  🔗 检查依赖关系...');
        await this.checkDependencies(context.dependencies, result, config);
      }

      // 4. 计算总体结果
      this.calculateGateResult(result);
      
      // 5. 保存结果
      await this.saveResults(result);
      
      // 6. 生成报告
      this.generateGateReport(result);
      
      return result;

    } catch (error) {
      result.error = error.message;
      result.passed = false;
      await this.saveResults(result);
      throw error;
    }
  }

  /**
   * 检查前置条件
   */
  async checkPrerequisites(prerequisites, result, config) {
    for (const prereqStage of prerequisites) {
      result.prerequisites.checked.push(prereqStage);
      
      try {
        // 递归验证前置阶段
        const prereqResult = await this.validateGate(prereqStage, {});
        
        if (prereqResult.passed) {
          result.prerequisites.passed.push(prereqStage);
          console.log(`    ✅ 前置条件通过: ${prereqStage}`);
        } else {
          result.prerequisites.failed.push(prereqStage);
          result.failures.push(`前置条件失败: ${prereqStage}`);
          console.log(`    ❌ 前置条件失败: ${prereqStage}`);
        }
        
      } catch (error) {
        result.prerequisites.failed.push(prereqStage);
        result.failures.push(`前置条件检查错误: ${prereqStage} - ${error.message}`);
        console.log(`    💥 前置条件检查错误: ${prereqStage}`);
      }
    }
  }

  /**
   * 检查门控条件
   */
  async checkGates(gates, result, context) {
    for (const gate of gates) {
      result.gates.checked.push(gate.id);
      
      try {
        const gateResult = await this.validateSingleGate(gate, context);
        
        if (gateResult.passed) {
          result.gates.passed.push(gate.id);
          console.log(`    ✅ 门控通过: ${gate.name}`);
        } else if (gate.required) {
          result.gates.failed.push(gate.id);
          result.failures.push(`必需门控失败: ${gate.name} - ${gateResult.message}`);
          console.log(`    ❌ 必需门控失败: ${gate.name}`);
        } else {
          result.gates.skipped.push(gate.id);
          result.warnings.push(`可选门控跳过: ${gate.name} - ${gateResult.message}`);
          console.log(`    ⏭️ 可选门控跳过: ${gate.name}`);
        }
        
      } catch (error) {
        if (gate.required) {
          result.gates.failed.push(gate.id);
          result.failures.push(`门控检查错误: ${gate.name} - ${error.message}`);
          console.log(`    💥 门控检查错误: ${gate.name}`);
        } else {
          result.gates.skipped.push(gate.id);
          result.warnings.push(`门控检查错误(可选): ${gate.name} - ${error.message}`);
          console.log(`    ⚠️ 门控检查错误(可选): ${gate.name}`);
        }
      }
    }
  }

  /**
   * 验证单个门控
   */
  async validateSingleGate(gate, context) {
    switch (gate.type) {
      case 'file_exists':
        return await this.validateFileExists(gate);
      
      case 'pattern_exists':
        return await this.validatePatternExists(gate);
      
      case 'command':
        return await this.validateCommand(gate);
      
      case 'coverage':
        return await this.validateCoverage(gate);
      
      case 'custom':
        return await this.validateCustom(gate, context);
      
      default:
        throw new Error(`未知的门控类型: ${gate.type}`);
    }
  }

  /**
   * 验证文件存在
   */
  async validateFileExists(gate) {
    try {
      if (gate.target.includes('*')) {
        // 使用 glob 模式
        const glob = require('glob');
        const files = glob.sync(gate.target);
        
        if (files.length > 0) {
          return { passed: true, message: `找到 ${files.length} 个匹配文件` };
        } else {
          return { passed: false, message: '未找到匹配的文件' };
        }
      } else {
        // 直接文件路径
        await fs.access(gate.target);
        return { passed: true, message: '文件存在' };
      }
    } catch (error) {
      return { passed: false, message: '文件不存在' };
    }
  }

  /**
   * 验证模式存在
   */
  async validatePatternExists(gate) {
    try {
      const glob = require('glob');
      const files = glob.sync(gate.target);
      
      if (files.length > 0) {
        return { passed: true, message: `找到 ${files.length} 个匹配文件` };
      } else {
        return { passed: false, message: '未找到匹配的文件模式' };
      }
    } catch (error) {
      return { passed: false, message: `模式匹配错误: ${error.message}` };
    }
  }

  /**
   * 验证命令执行
   */
  async validateCommand(gate) {
    try {
      const { execSync } = require('child_process');
      const output = execSync(gate.target, { 
        encoding: 'utf8',
        cwd: process.cwd(),
        timeout: 60000
      });
      
      return { passed: true, message: '命令执行成功', output };
    } catch (error) {
      return { passed: false, message: `命令执行失败: ${error.message}` };
    }
  }

  /**
   * 验证测试覆盖率
   */
  async validateCoverage(gate) {
    try {
      // 尝试读取覆盖率报告
      const coveragePath = 'coverage/coverage-summary.json';
      
      try {
        const coverageData = await fs.readFile(coveragePath, 'utf8');
        const coverage = JSON.parse(coverageData);
        
        const totalCoverage = coverage.total;
        const lineCoverage = totalCoverage.lines.pct;
        
        if (lineCoverage >= gate.target) {
          return { 
            passed: true, 
            message: `覆盖率 ${lineCoverage}% 达到要求 ${gate.target}%` 
          };
        } else {
          return { 
            passed: false, 
            message: `覆盖率 ${lineCoverage}% 未达到要求 ${gate.target}%` 
          };
        }
        
      } catch (error) {
        return { passed: false, message: '未找到覆盖率报告' };
      }
      
    } catch (error) {
      return { passed: false, message: `覆盖率检查错误: ${error.message}` };
    }
  }

  /**
   * 验证自定义门控
   */
  async validateCustom(gate, context) {
    // 自定义验证逻辑可以在这里扩展
    if (gate.validator && typeof gate.validator === 'function') {
      return await gate.validator(gate, context);
    }
    
    return { passed: false, message: '自定义验证器未实现' };
  }

  /**
   * 检查依赖关系
   */
  async checkDependencies(dependencies, result, config) {
    for (const [depName, depConfig] of Object.entries(dependencies)) {
      try {
        const depResult = await this.validateDependency(depName, depConfig, config);
        
        if (!depResult.passed) {
          result.failures.push(`依赖验证失败: ${depName} - ${depResult.message}`);
        }
        
      } catch (error) {
        result.failures.push(`依赖检查错误: ${depName} - ${error.message}`);
      }
    }
  }

  /**
   * 验证依赖关系
   */
  async validateDependency(depName, depConfig, config) {
    switch (depConfig.validator) {
      case 'feature_status':
        return await this.validateFeatureStatus(depConfig);
      
      case 'task_status':
        return await this.validateTaskStatus(depConfig);
      
      default:
        return { passed: false, message: `未知的依赖验证器: ${depConfig.validator}` };
    }
  }

  /**
   * 验证功能状态
   */
  async validateFeatureStatus(depConfig) {
    try {
      const statePath = '.kiro/project-state/current-state.json';
      const stateData = await fs.readFile(statePath, 'utf8');
      const projectState = JSON.parse(stateData);
      
      if (depConfig.feature && projectState.features) {
        const feature = projectState.features[depConfig.feature];
        
        if (feature && feature.status === 'completed') {
          return { passed: true, message: '功能已完成' };
        } else {
          return { passed: false, message: '功能未完成' };
        }
      }
      
      return { passed: false, message: '功能配置不完整' };
      
    } catch (error) {
      return { passed: false, message: '无法读取项目状态' };
    }
  }

  /**
   * 验证任务状态
   */
  async validateTaskStatus(depConfig) {
    try {
      if (depConfig.taskFile && depConfig.taskName) {
        const taskData = await fs.readFile(depConfig.taskFile, 'utf8');
        
        // 简单的任务状态检查
        if (taskData.includes(`[x] ${depConfig.taskName}`) || 
            taskData.includes(`[X] ${depConfig.taskName}`)) {
          return { passed: true, message: '任务已完成' };
        } else {
          return { passed: false, message: '任务未完成' };
        }
      }
      
      return { passed: false, message: '任务配置不完整' };
      
    } catch (error) {
      return { passed: false, message: '无法读取任务文件' };
    }
  }

  /**
   * 计算门控结果
   */
  calculateGateResult(result) {
    // 如果有前置条件失败，整体失败
    if (result.prerequisites.failed.length > 0) {
      result.passed = false;
      return;
    }
    
    // 如果有必需门控失败，整体失败
    if (result.gates.failed.length > 0) {
      result.passed = false;
      return;
    }
    
    // 如果有其他失败，整体失败
    if (result.failures.length > 0) {
      result.passed = false;
      return;
    }
    
    // 否则通过
    result.passed = true;
  }

  /**
   * 生成门控报告
   */
  generateGateReport(result) {
    console.log('\n🚪 阶段门控验证报告');
    console.log('='.repeat(50));
    console.log(`阶段: ${result.stage}`);
    console.log(`状态: ${result.passed ? '✅ 通过' : '❌ 失败'}`);
    console.log(`时间: ${new Date(result.timestamp).toLocaleString()}`);
    
    if (result.prerequisites.checked.length > 0) {
      console.log('\n前置条件:');
      result.prerequisites.passed.forEach(prereq => {
        console.log(`  ✅ ${prereq}`);
      });
      result.prerequisites.failed.forEach(prereq => {
        console.log(`  ❌ ${prereq}`);
      });
    }
    
    if (result.gates.checked.length > 0) {
      console.log('\n门控检查:');
      result.gates.passed.forEach(gate => {
        console.log(`  ✅ ${gate}`);
      });
      result.gates.failed.forEach(gate => {
        console.log(`  ❌ ${gate}`);
      });
      result.gates.skipped.forEach(gate => {
        console.log(`  ⏭️ ${gate}`);
      });
    }
    
    if (result.failures.length > 0) {
      console.log('\n失败原因:');
      result.failures.forEach(failure => {
        console.log(`  - ${failure}`);
      });
    }
    
    if (result.warnings.length > 0) {
      console.log('\n警告信息:');
      result.warnings.forEach(warning => {
        console.log(`  - ${warning}`);
      });
    }
    
    console.log('='.repeat(50));
  }

  /**
   * 加载配置
   */
  async loadConfig() {
    try {
      const configData = await fs.readFile(this.configPath, 'utf8');
      return { ...this.defaultConfig, ...JSON.parse(configData) };
    } catch {
      return this.defaultConfig;
    }
  }

  /**
   * 保存结果
   */
  async saveResults(result) {
    try {
      // 读取现有结果
      let allResults = [];
      try {
        const existingData = await fs.readFile(this.resultsPath, 'utf8');
        allResults = JSON.parse(existingData);
      } catch {
        // 文件不存在，使用空数组
      }
      
      // 添加新结果
      allResults.push(result);
      
      // 保持最近100条记录
      if (allResults.length > 100) {
        allResults = allResults.slice(-100);
      }
      
      await fs.writeFile(this.resultsPath, JSON.stringify(allResults, null, 2));
    } catch (error) {
      console.error('保存门控结果失败:', error.message);
    }
  }

  /**
   * 获取阶段列表
   */
  async getStages() {
    const config = await this.loadConfig();
    return Object.keys(config.stages);
  }

  /**
   * 获取阶段信息
   */
  async getStageInfo(stageName) {
    const config = await this.loadConfig();
    return config.stages[stageName];
  }

  /**
   * 获取历史结果
   */
  async getHistory(stageName = null, limit = 10) {
    try {
      const resultsData = await fs.readFile(this.resultsPath, 'utf8');
      let results = JSON.parse(resultsData);
      
      if (stageName) {
        results = results.filter(result => result.stage === stageName);
      }
      
      return results.slice(-limit).reverse();
    } catch {
      return [];
    }
  }
}

module.exports = StageGateManager;