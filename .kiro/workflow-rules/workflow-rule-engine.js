/**
 * 工作流程规则引擎
 * Workflow Rule Engine
 */

const fs = require('fs').promises;
const PreCommitChecker = require('./pre-commit-checker');
const StageGateManager = require('./stage-gate-manager');

class WorkflowRuleEngine {
  constructor() {
    this.configPath = '.kiro/workflow-rules/workflow-rules.json';
    this.preCommitChecker = new PreCommitChecker();
    this.stageGateManager = new StageGateManager();
    
    this.defaultRules = {
      triggers: {
        'pre_commit': {
          name: '预提交触发器',
          description: '在代码提交前触发的规则',
          rules: [
            {
              id: 'run_pre_commit_checks',
              name: '运行预提交检查',
              action: 'pre_commit_check',
              enabled: true,
              blocking: true
            }
          ]
        },
        'task_start': {
          name: '任务开始触发器',
          description: '在开始新任务时触发的规则',
          rules: [
            {
              id: 'validate_prerequisites',
              name: '验证前置条件',
              action: 'stage_gate_check',
              enabled: true,
              blocking: true,
              parameters: {
                stage: 'development'
              }
            }
          ]
        },
        'feature_complete': {
          name: '功能完成触发器',
          description: '在功能完成时触发的规则',
          rules: [
            {
              id: 'run_full_tests',
              name: '运行完整测试',
              action: 'test_suite',
              enabled: true,
              blocking: false
            },
            {
              id: 'update_documentation',
              name: '更新文档',
              action: 'documentation_check',
              enabled: false,
              blocking: false
            }
          ]
        },
        'deployment_ready': {
          name: '部署就绪触发器',
          description: '在准备部署时触发的规则',
          rules: [
            {
              id: 'validate_deployment_gate',
              name: '验证部署门控',
              action: 'stage_gate_check',
              enabled: true,
              blocking: true,
              parameters: {
                stage: 'deployment'
              }
            }
          ]
        }
      },
      actions: {
        'pre_commit_check': {
          name: '预提交检查',
          handler: 'preCommitCheck'
        },
        'stage_gate_check': {
          name: '阶段门控检查',
          handler: 'stageGateCheck'
        },
        'test_suite': {
          name: '测试套件',
          handler: 'testSuite'
        },
        'documentation_check': {
          name: '文档检查',
          handler: 'documentationCheck'
        }
      }
    };
  }

  /**
   * 初始化规则引擎
   */
  async initialize() {
    try {
      // 确保配置目录存在
      await fs.mkdir('.kiro/workflow-rules', { recursive: true });
      
      // 创建默认配置文件
      try {
        await fs.access(this.configPath);
      } catch {
        await fs.writeFile(this.configPath, JSON.stringify(this.defaultRules, null, 2));
        console.log('✅ 创建工作流程规则配置文件');
      }

      // 初始化子系统
      await this.preCommitChecker.initialize();
      await this.stageGateManager.initialize();
      
    } catch (error) {
      console.error('❌ 工作流程规则引擎初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 执行工作流程规则
   */
  async executeRules(triggerName, context = {}) {
    console.log(`🔄 执行工作流程规则: ${triggerName}`);
    
    const config = await this.loadConfig();
    const trigger = config.triggers[triggerName];
    
    if (!trigger) {
      throw new Error(`未找到触发器: ${triggerName}`);
    }

    const result = {
      trigger: triggerName,
      timestamp: new Date().toISOString(),
      context,
      rules: {
        executed: [],
        passed: [],
        failed: [],
        skipped: []
      },
      overall: 'pending',
      blocking_failures: [],
      warnings: []
    };

    try {
      console.log(`  📋 触发器: ${trigger.name}`);
      console.log(`  📝 描述: ${trigger.description}`);
      
      // 执行所有规则
      for (const rule of trigger.rules) {
        if (!rule.enabled) {
          result.rules.skipped.push(rule.id);
          console.log(`    ⏭️ 跳过规则: ${rule.name} (已禁用)`);
          continue;
        }

        result.rules.executed.push(rule.id);
        console.log(`    🔍 执行规则: ${rule.name}`);

        try {
          const ruleResult = await this.executeRule(rule, context, config);
          
          if (ruleResult.passed) {
            result.rules.passed.push(rule.id);
            console.log(`      ✅ 规则通过: ${rule.name}`);
          } else {
            result.rules.failed.push(rule.id);
            
            if (rule.blocking) {
              result.blocking_failures.push({
                rule: rule.id,
                name: rule.name,
                message: ruleResult.message
              });
              console.log(`      ❌ 阻塞规则失败: ${rule.name}`);
            } else {
              result.warnings.push({
                rule: rule.id,
                name: rule.name,
                message: ruleResult.message
              });
              console.log(`      ⚠️ 非阻塞规则失败: ${rule.name}`);
            }
          }
          
        } catch (error) {
          result.rules.failed.push(rule.id);
          
          if (rule.blocking) {
            result.blocking_failures.push({
              rule: rule.id,
              name: rule.name,
              message: error.message
            });
            console.log(`      💥 阻塞规则错误: ${rule.name}`);
          } else {
            result.warnings.push({
              rule: rule.id,
              name: rule.name,
              message: error.message
            });
            console.log(`      ⚠️ 非阻塞规则错误: ${rule.name}`);
          }
        }
      }

      // 计算总体结果
      this.calculateOverallResult(result);
      
      // 生成报告
      this.generateRuleReport(result);
      
      return result;

    } catch (error) {
      result.overall = 'error';
      result.error = error.message;
      throw error;
    }
  }

  /**
   * 执行单个规则
   */
  async executeRule(rule, context, config) {
    const action = config.actions[rule.action];
    
    if (!action) {
      throw new Error(`未找到动作: ${rule.action}`);
    }

    const handler = this[action.handler];
    
    if (!handler || typeof handler !== 'function') {
      throw new Error(`未找到处理器: ${action.handler}`);
    }

    return await handler.call(this, rule, context);
  }

  /**
   * 预提交检查处理器
   */
  async preCommitCheck(rule, context) {
    try {
      const results = await this.preCommitChecker.runChecks();
      
      if (results.overall === 'passed') {
        return { passed: true, message: '预提交检查通过' };
      } else if (results.overall === 'warning') {
        return { passed: true, message: `预提交检查通过但有警告: ${results.summary.warnings} 个警告` };
      } else {
        return { passed: false, message: `预提交检查失败: ${results.summary.failed} 个失败` };
      }
      
    } catch (error) {
      return { passed: false, message: `预提交检查错误: ${error.message}` };
    }
  }

  /**
   * 阶段门控检查处理器
   */
  async stageGateCheck(rule, context) {
    try {
      const stage = rule.parameters?.stage || context.stage;
      
      if (!stage) {
        return { passed: false, message: '未指定检查阶段' };
      }

      const result = await this.stageGateManager.validateGate(stage, context);
      
      if (result.passed) {
        return { passed: true, message: `阶段门控 "${stage}" 验证通过` };
      } else {
        return { passed: false, message: `阶段门控 "${stage}" 验证失败: ${result.failures.join(', ')}` };
      }
      
    } catch (error) {
      return { passed: false, message: `阶段门控检查错误: ${error.message}` };
    }
  }

  /**
   * 测试套件处理器
   */
  async testSuite(rule, context) {
    try {
      const { execSync } = require('child_process');
      
      // 运行测试套件
      const testCommands = [
        'npm test -- --run',
        'npm run test:integration',
        'npm run test:e2e'
      ];

      const results = [];
      
      for (const command of testCommands) {
        try {
          const output = execSync(command, { 
            encoding: 'utf8',
            cwd: process.cwd(),
            timeout: 120000 
          });
          results.push({ command, status: 'passed', output });
        } catch (error) {
          results.push({ command, status: 'failed', error: error.message });
        }
      }

      const failedTests = results.filter(r => r.status === 'failed');
      
      if (failedTests.length === 0) {
        return { passed: true, message: '所有测试通过' };
      } else {
        return { passed: false, message: `${failedTests.length} 个测试套件失败` };
      }
      
    } catch (error) {
      return { passed: false, message: `测试套件执行错误: ${error.message}` };
    }
  }

  /**
   * 文档检查处理器
   */
  async documentationCheck(rule, context) {
    try {
      const docFiles = [
        'README.md',
        'CHANGELOG.md',
        '.kiro/specs/*/requirements.md',
        '.kiro/specs/*/design.md'
      ];

      const missingDocs = [];
      
      for (const docPattern of docFiles) {
        try {
          if (docPattern.includes('*')) {
            const glob = require('glob');
            const files = glob.sync(docPattern);
            if (files.length === 0) {
              missingDocs.push(docPattern);
            }
          } else {
            await fs.access(docPattern);
          }
        } catch {
          missingDocs.push(docPattern);
        }
      }

      if (missingDocs.length === 0) {
        return { passed: true, message: '文档检查通过' };
      } else {
        return { passed: false, message: `缺少文档: ${missingDocs.join(', ')}` };
      }
      
    } catch (error) {
      return { passed: false, message: `文档检查错误: ${error.message}` };
    }
  }

  /**
   * 计算总体结果
   */
  calculateOverallResult(result) {
    if (result.blocking_failures.length > 0) {
      result.overall = 'failed';
    } else if (result.warnings.length > 0) {
      result.overall = 'warning';
    } else if (result.rules.passed.length > 0) {
      result.overall = 'passed';
    } else {
      result.overall = 'skipped';
    }
  }

  /**
   * 生成规则报告
   */
  generateRuleReport(result) {
    console.log('\n🔄 工作流程规则执行报告');
    console.log('='.repeat(50));
    console.log(`触发器: ${result.trigger}`);
    console.log(`状态: ${this.getStatusIcon(result.overall)} ${result.overall.toUpperCase()}`);
    console.log(`时间: ${new Date(result.timestamp).toLocaleString()}`);
    
    console.log('\n规则执行统计:');
    console.log(`  ✅ 通过: ${result.rules.passed.length}`);
    console.log(`  ❌ 失败: ${result.rules.failed.length}`);
    console.log(`  ⏭️ 跳过: ${result.rules.skipped.length}`);
    
    if (result.blocking_failures.length > 0) {
      console.log('\n阻塞性失败:');
      result.blocking_failures.forEach(failure => {
        console.log(`  ❌ ${failure.name}: ${failure.message}`);
      });
    }
    
    if (result.warnings.length > 0) {
      console.log('\n警告信息:');
      result.warnings.forEach(warning => {
        console.log(`  ⚠️ ${warning.name}: ${warning.message}`);
      });
    }
    
    console.log('='.repeat(50));
  }

  /**
   * 获取状态图标
   */
  getStatusIcon(status) {
    const icons = {
      passed: '✅',
      failed: '❌',
      warning: '⚠️',
      skipped: '⏭️',
      error: '💥',
      pending: '⏳'
    };
    return icons[status] || '❓';
  }

  /**
   * 加载配置
   */
  async loadConfig() {
    try {
      const configData = await fs.readFile(this.configPath, 'utf8');
      return { ...this.defaultRules, ...JSON.parse(configData) };
    } catch {
      return this.defaultRules;
    }
  }

  /**
   * 获取可用触发器
   */
  async getTriggers() {
    const config = await this.loadConfig();
    return Object.keys(config.triggers);
  }

  /**
   * 获取触发器信息
   */
  async getTriggerInfo(triggerName) {
    const config = await this.loadConfig();
    return config.triggers[triggerName];
  }

  /**
   * 启用/禁用规则
   */
  async toggleRule(triggerName, ruleId, enabled) {
    const config = await this.loadConfig();
    
    if (config.triggers[triggerName]) {
      const rule = config.triggers[triggerName].rules.find(r => r.id === ruleId);
      if (rule) {
        rule.enabled = enabled;
        await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
        return true;
      }
    }
    
    return false;
  }
}

module.exports = WorkflowRuleEngine;