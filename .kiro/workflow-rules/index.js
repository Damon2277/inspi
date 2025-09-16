/**
 * 开发流程规范引擎 - 主入口
 * Development Workflow Rules Engine - Main Entry
 */

const PreCommitChecker = require('./pre-commit-checker');
const StageGateManager = require('./stage-gate-manager');
const WorkflowRuleEngine = require('./workflow-rule-engine');

class WorkflowManager {
  constructor() {
    this.preCommitChecker = new PreCommitChecker();
    this.stageGateManager = new StageGateManager();
    this.ruleEngine = new WorkflowRuleEngine();
  }

  /**
   * 初始化工作流程管理器
   */
  async initialize() {
    await this.preCommitChecker.initialize();
    await this.stageGateManager.initialize();
    await this.ruleEngine.initialize();
    console.log('✅ 工作流程管理器初始化完成');
  }

  /**
   * 执行预提交检查
   */
  async runPreCommitChecks() {
    return await this.preCommitChecker.runChecks();
  }

  /**
   * 验证开发阶段门控
   */
  async validateStageGate(stage, context) {
    return await this.stageGateManager.validateGate(stage, context);
  }

  /**
   * 执行工作流程规则
   */
  async executeWorkflowRules(trigger, context) {
    return await this.ruleEngine.executeRules(trigger, context);
  }
}

module.exports = WorkflowManager;