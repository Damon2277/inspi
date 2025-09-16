/**
 * 项目状态恢复和智能指导系统 - 主入口
 * Project State Recovery and Smart Guidance System - Main Entry
 * 
 * 与版本管理系统互补，专注于：
 * 1. 项目状态快照（非Git版本）
 * 2. 智能恢复指导
 * 3. 选择性功能恢复
 */

const StateSnapshotManager = require('./state-snapshot-manager');
const SmartRecoveryGuide = require('./smart-recovery-guide');
const SelectiveStateRecovery = require('./selective-state-recovery');
const RecoveryDecisionTree = require('./recovery-decision-tree');
const RecoveryValidator = require('./recovery-validator');

class ProjectStateRecoverySystem {
  constructor() {
    this.stateManager = new StateSnapshotManager();
    this.recoveryGuide = new SmartRecoveryGuide();
    this.selectiveRecovery = new SelectiveStateRecovery();
    this.decisionTree = new RecoveryDecisionTree();
    this.validator = new RecoveryValidator();
  }

  /**
   * 创建项目状态快照（非Git版本）
   * Create project state snapshot (non-Git version)
   */
  async createStateSnapshot(options = {}) {
    const snapshot = {
      id: `state-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: options.type || 'manual',
      reason: options.reason || 'Manual snapshot',
      projectState: await this._captureProjectState(),
      featureStates: await this._captureFeatureStates(),
      configStates: await this._captureConfigStates(),
      isAutomatic: options.isAutomatic || false
    };

    return await this.stateManager.saveSnapshot(snapshot);
  }

  /**
   * 获取智能恢复建议
   * Get smart recovery recommendations
   */
  async getRecoveryRecommendations(issueDescription) {
    return await this.recoveryGuide.analyzeIssueAndRecommend(issueDescription);
  }

  /**
   * 执行选择性状态恢复
   * Execute selective state recovery
   */
  async recoverSelectedStates(snapshotId, selectedStates) {
    return await this.selectiveRecovery.recoverStates(snapshotId, selectedStates);
  }

  /**
   * 获取智能恢复决策路径
   * Get smart recovery decision path
   */
  async getRecoveryDecisionPath(issueDescription, context = {}) {
    // 构建问题上下文
    const issueContext = {
      description: issueDescription,
      issueType: this._classifyIssue(issueDescription),
      severity: this._assessSeverity(issueDescription),
      hasSnapshots: await this._checkSnapshotsAvailable(),
      timeConstraint: context.timeConstraint || 'normal',
      riskTolerance: context.riskTolerance || 'medium',
      affectedComponents: context.affectedComponents || [],
      ...context
    };

    return await this.decisionTree.getRecoveryPath(issueContext);
  }

  /**
   * 获取逐步恢复指导
   * Get step-by-step recovery guidance
   */
  async getStepByStepGuidance(issueDescription, context = {}) {
    const decisionPathResult = await this.getRecoveryDecisionPath(issueDescription, context);
    
    if (!decisionPathResult.success) {
      return decisionPathResult;
    }

    const issueContext = {
      description: issueDescription,
      issueType: this._classifyIssue(issueDescription),
      severity: this._assessSeverity(issueDescription),
      ...context
    };

    return await this.decisionTree.getStepByStepGuidance(decisionPathResult.decisionPath, issueContext);
  }

  /**
   * 执行完整的恢复流程（带验证）
   * Execute complete recovery process with validation
   */
  async executeRecoveryWithValidation(issueDescription, context = {}) {
    try {
      console.log('🚀 开始完整恢复流程...');

      // 1. 获取恢复决策路径
      const decisionResult = await this.getRecoveryDecisionPath(issueDescription, context);
      if (!decisionResult.success) {
        throw new Error(`决策分析失败: ${decisionResult.error}`);
      }

      const recoveryPlan = decisionResult.decisionPath;
      console.log(`📋 恢复策略: ${recoveryPlan.strategy}`);

      // 2. 恢复前验证
      const currentState = await this._getCurrentSystemState();
      const preValidation = await this.validator.validatePreRecovery(recoveryPlan, currentState);
      
      if (!preValidation.results.passed) {
        return {
          success: false,
          phase: 'pre_validation',
          error: '恢复前验证失败',
          validation: preValidation,
          blockers: preValidation.results.blockers
        };
      }

      console.log(`✅ 恢复前验证通过 (${preValidation.results.score}/${preValidation.results.maxScore})`);

      // 3. 获取详细指导
      const guidanceResult = await this.getStepByStepGuidance(issueDescription, context);
      if (!guidanceResult.success) {
        throw new Error(`获取恢复指导失败: ${guidanceResult.error}`);
      }

      const guidance = guidanceResult.guidance;

      // 4. 执行恢复过程（带监控）
      let recoveryResult = null;
      const monitoring = await this.validator.monitorRecoveryProcess(
        { ...recoveryPlan, steps: guidance.steps },
        (progress) => {
          console.log(`📊 进度: ${progress.step}/${progress.total} - ${progress.stepName}`);
        }
      );

      // 5. 模拟恢复执行结果
      recoveryResult = {
        success: monitoring.progress.failedSteps.length === 0,
        completedSteps: monitoring.progress.completedSteps.length,
        failedSteps: monitoring.progress.failedSteps.length,
        duration: monitoring.progress.metrics.actualDuration,
        monitoring
      };

      // 6. 恢复后验证
      const postValidation = await this.validator.validatePostRecovery(
        recoveryPlan, 
        recoveryResult, 
        await this._getCurrentSystemState()
      );

      console.log(`✅ 恢复后验证完成 (${postValidation.results.score}/${postValidation.results.maxScore})`);

      // 7. 生成验证报告
      const reportResult = await this.validator.generateValidationReport();

      return {
        success: recoveryResult.success && postValidation.results.passed,
        phase: 'completed',
        recoveryPlan,
        guidance,
        recoveryResult,
        preValidation,
        postValidation,
        monitoring,
        report: reportResult.success ? reportResult.report : null,
        recommendations: [
          ...preValidation.results.recommendations,
          ...postValidation.results.recommendations
        ]
      };

    } catch (error) {
      console.error('❌ 完整恢复流程失败:', error.message);
      return {
        success: false,
        phase: 'error',
        error: error.message
      };
    }
  }

  /**
   * 项目健康诊断
   * Project health diagnosis
   */
  async diagnoseProjectHealth() {
    const diagnosis = {
      timestamp: new Date().toISOString(),
      overallHealth: 'unknown',
      issues: [],
      recommendations: [],
      recoveryOptions: []
    };

    // 检查项目状态一致性
    const stateConsistency = await this._checkStateConsistency();
    diagnosis.issues.push(...stateConsistency.issues);

    // 检查功能完整性
    const featureIntegrity = await this._checkFeatureIntegrity();
    diagnosis.issues.push(...featureIntegrity.issues);

    // 生成恢复建议
    if (diagnosis.issues.length === 0) {
      diagnosis.overallHealth = 'healthy';
    } else if (diagnosis.issues.some(issue => issue.severity === 'critical')) {
      diagnosis.overallHealth = 'critical';
      diagnosis.recoveryOptions = await this._generateCriticalRecoveryOptions();
    } else {
      diagnosis.overallHealth = 'warning';
      diagnosis.recommendations = await this._generateHealthRecommendations(diagnosis.issues);
    }

    return diagnosis;
  }

  /**
   * 捕获当前项目状态
   * Capture current project state
   */
  async _captureProjectState() {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      // 读取项目配置文件状态
      const packageJson = JSON.parse(await fs.readFile('inspi-ai-platform/package.json', 'utf8'));
      const envExample = await fs.readFile('inspi-ai-platform/.env.example', 'utf8').catch(() => '');
      
      return {
        version: packageJson.version,
        dependencies: packageJson.dependencies,
        devDependencies: packageJson.devDependencies,
        scripts: packageJson.scripts,
        envTemplate: envExample,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { error: error.message, timestamp: new Date().toISOString() };
    }
  }

  /**
   * 捕获功能状态
   * Capture feature states
   */
  async _captureFeatureStates() {
    const fs = require('fs').promises;
    const path = require('path');

    const features = {
      auth: { status: 'unknown', files: [] },
      ai: { status: 'unknown', files: [] },
      ui: { status: 'unknown', files: [] },
      cache: { status: 'unknown', files: [] }
    };

    try {
      // 检查认证功能
      const authFiles = [
        'inspi-ai-platform/src/app/api/auth/verify-email/route.ts',
        'inspi-ai-platform/src/app/api/auth/send-verification/route.ts'
      ];
      
      for (const file of authFiles) {
        try {
          await fs.access(file);
          features.auth.files.push(file);
          features.auth.status = 'present';
        } catch {}
      }

      // 检查AI功能
      const aiFiles = [
        'inspi-ai-platform/src/app/api/magic/generate/route.ts',
        'inspi-ai-platform/src/lib/ai/geminiService.ts'
      ];
      
      for (const file of aiFiles) {
        try {
          await fs.access(file);
          features.ai.files.push(file);
          features.ai.status = 'present';
        } catch {}
      }

      // 检查UI功能
      const uiFiles = [
        'inspi-ai-platform/src/app/page.tsx',
        'inspi-ai-platform/src/app/create/page.tsx'
      ];
      
      for (const file of uiFiles) {
        try {
          await fs.access(file);
          features.ui.files.push(file);
          features.ui.status = 'present';
        } catch {}
      }

      // 检查缓存功能
      const cacheFiles = [
        'inspi-ai-platform/src/lib/cache/redis.ts',
        'inspi-ai-platform/src/lib/cache/simple-redis.ts'
      ];
      
      for (const file of cacheFiles) {
        try {
          await fs.access(file);
          features.cache.files.push(file);
          features.cache.status = 'present';
        } catch {}
      }

    } catch (error) {
      console.warn('Error capturing feature states:', error.message);
    }

    return features;
  }

  /**
   * 捕获配置状态
   * Capture configuration states
   */
  async _captureConfigStates() {
    const fs = require('fs').promises;
    
    const configs = {};

    try {
      // 读取各种配置文件
      const configFiles = [
        'inspi-ai-platform/version.config.json',
        '.kiro/quality-checks/config.json'
      ];

      for (const file of configFiles) {
        try {
          const content = await fs.readFile(file, 'utf8');
          configs[file] = JSON.parse(content);
        } catch (error) {
          configs[file] = { error: error.message };
        }
      }
    } catch (error) {
      configs.error = error.message;
    }

    return configs;
  }

  /**
   * 分类问题类型
   * Classify issue type
   */
  _classifyIssue(description) {
    const desc = description.toLowerCase();
    
    if (desc.includes('样式') || desc.includes('css') || desc.includes('ui')) {
      return 'style_issue';
    } else if (desc.includes('功能') || desc.includes('api') || desc.includes('接口')) {
      return 'functionality_issue';
    } else if (desc.includes('配置') || desc.includes('环境') || desc.includes('设置')) {
      return 'configuration_issue';
    } else if (desc.includes('依赖') || desc.includes('包') || desc.includes('模块')) {
      return 'dependency_issue';
    } else if (desc.includes('数据') || desc.includes('数据库') || desc.includes('缓存')) {
      return 'data_issue';
    } else if (desc.includes('慢') || desc.includes('性能') || desc.includes('卡顿')) {
      return 'performance_issue';
    } else if (desc.includes('构建') || desc.includes('编译') || desc.includes('打包')) {
      return 'build_issue';
    }
    
    return 'general_issue';
  }

  /**
   * 评估问题严重程度
   * Assess issue severity
   */
  _assessSeverity(description) {
    const desc = description.toLowerCase();
    const criticalKeywords = ['崩溃', '无法启动', '完全不工作', '数据丢失'];
    const highKeywords = ['主要功能', '用户无法', '严重影响'];
    const mediumKeywords = ['部分功能', '偶尔出现', '性能问题'];
    
    if (criticalKeywords.some(keyword => desc.includes(keyword))) {
      return 'critical';
    } else if (highKeywords.some(keyword => desc.includes(keyword))) {
      return 'high';
    } else if (mediumKeywords.some(keyword => desc.includes(keyword))) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * 检查快照是否可用
   * Check if snapshots are available
   */
  async _checkSnapshotsAvailable() {
    try {
      const result = await this.stateManager.listSnapshots();
      return result.success && result.total > 0;
    } catch {
      return false;
    }
  }

  /**
   * 获取当前系统状态
   * Get current system state
   */
  async _getCurrentSystemState() {
    return {
      timestamp: new Date().toISOString(),
      projectState: await this._captureProjectState(),
      featureStates: await this._captureFeatureStates(),
      configStates: await this._captureConfigStates()
    };
  }

  /**
   * 检查状态一致性
   * Check state consistency
   */
  async _checkStateConsistency() {
    const issues = [];
    
    try {
      const fs = require('fs').promises;
      
      // 检查package.json是否存在
      try {
        await fs.access('inspi-ai-platform/package.json');
      } catch {
        issues.push({
          type: 'missing_file',
          severity: 'critical',
          description: 'package.json文件缺失',
          file: 'inspi-ai-platform/package.json'
        });
      }

      // 检查关键目录结构
      const criticalDirs = [
        'inspi-ai-platform/src',
        'inspi-ai-platform/src/app',
        'inspi-ai-platform/src/lib'
      ];

      for (const dir of criticalDirs) {
        try {
          const stat = await fs.stat(dir);
          if (!stat.isDirectory()) {
            issues.push({
              type: 'invalid_structure',
              severity: 'critical',
              description: `${dir} 不是目录`,
              path: dir
            });
          }
        } catch {
          issues.push({
            type: 'missing_directory',
            severity: 'critical',
            description: `关键目录 ${dir} 缺失`,
            path: dir
          });
        }
      }

    } catch (error) {
      issues.push({
        type: 'system_error',
        severity: 'critical',
        description: `状态检查失败: ${error.message}`,
        error: error.message
      });
    }

    return { issues };
  }

  /**
   * 检查功能完整性
   * Check feature integrity
   */
  async _checkFeatureIntegrity() {
    const issues = [];
    
    try {
      const featureStates = await this._captureFeatureStates();
      
      // 检查关键功能是否存在
      if (featureStates.auth.status === 'unknown' || featureStates.auth.files.length === 0) {
        issues.push({
          type: 'missing_feature',
          severity: 'warning',
          description: '认证功能文件缺失或不完整',
          feature: 'auth'
        });
      }

      if (featureStates.ai.status === 'unknown' || featureStates.ai.files.length === 0) {
        issues.push({
          type: 'missing_feature',
          severity: 'warning',
          description: 'AI功能文件缺失或不完整',
          feature: 'ai'
        });
      }

      if (featureStates.ui.status === 'unknown' || featureStates.ui.files.length === 0) {
        issues.push({
          type: 'missing_feature',
          severity: 'critical',
          description: 'UI功能文件缺失或不完整',
          feature: 'ui'
        });
      }

    } catch (error) {
      issues.push({
        type: 'integrity_check_error',
        severity: 'warning',
        description: `功能完整性检查失败: ${error.message}`,
        error: error.message
      });
    }

    return { issues };
  }

  /**
   * 生成关键恢复选项
   * Generate critical recovery options
   */
  async _generateCriticalRecoveryOptions() {
    return [
      {
        type: 'full_restore',
        description: '从最近的稳定快照完全恢复',
        risk: 'medium',
        estimatedTime: '5-10分钟'
      },
      {
        type: 'selective_restore',
        description: '选择性恢复关键功能',
        risk: 'low',
        estimatedTime: '2-5分钟'
      },
      {
        type: 'manual_fix',
        description: '手动修复指导',
        risk: 'low',
        estimatedTime: '10-30分钟'
      }
    ];
  }

  /**
   * 生成健康建议
   * Generate health recommendations
   */
  async _generateHealthRecommendations(issues) {
    const recommendations = [];

    for (const issue of issues) {
      switch (issue.type) {
        case 'missing_feature':
          recommendations.push({
            type: 'restore_feature',
            description: `恢复${issue.feature}功能文件`,
            priority: 'medium',
            action: `从快照恢复${issue.feature}相关文件`
          });
          break;
        case 'missing_file':
          recommendations.push({
            type: 'restore_file',
            description: `恢复缺失文件: ${issue.file}`,
            priority: 'high',
            action: `从最近快照恢复${issue.file}`
          });
          break;
        case 'missing_directory':
          recommendations.push({
            type: 'restore_structure',
            description: `重建目录结构: ${issue.path}`,
            priority: 'high',
            action: `创建目录并恢复相关文件`
          });
          break;
      }
    }

    return recommendations;
  }
}

module.exports = ProjectStateRecoverySystem;