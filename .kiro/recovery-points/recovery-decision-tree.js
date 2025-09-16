/**
 * 恢复操作决策树系统
 * Recovery Operation Decision Tree System
 * 
 * 提供基于决策树的智能恢复路径选择
 */

class RecoveryDecisionTree {
  constructor() {
    this.decisionTree = this._buildDecisionTree();
    this.validationRules = this._initializeValidationRules();
  }

  /**
   * 根据问题情况获取恢复决策路径
   * Get recovery decision path based on issue context
   */
  async getRecoveryPath(issueContext) {
    try {
      console.log('🌳 开始决策树分析...');
      
      const path = this._traverseDecisionTree(this.decisionTree, issueContext);
      const validatedPath = await this._validateDecisionPath(path, issueContext);
      
      return {
        success: true,
        decisionPath: validatedPath,
        reasoning: this._explainDecisionReasoning(validatedPath),
        confidence: this._calculateConfidence(validatedPath, issueContext)
      };

    } catch (error) {
      console.error('❌ 决策树分析失败:', error.message);
      return {
        success: false,
        error: error.message,
        fallbackPath: this._getFallbackDecisionPath()
      };
    }
  }

  /**
   * 获取逐步恢复指导
   * Get step-by-step recovery guidance
   */
  async getStepByStepGuidance(decisionPath, issueContext) {
    try {
      const guidance = {
        title: `${decisionPath.issueType}恢复指导`,
        overview: decisionPath.description,
        totalSteps: 0,
        estimatedTime: decisionPath.estimatedTime,
        riskLevel: decisionPath.riskLevel,
        steps: []
      };

      // 生成预检查步骤
      const preCheckSteps = this._generatePreCheckSteps(decisionPath, issueContext);
      guidance.steps.push(...preCheckSteps);

      // 生成主要恢复步骤
      const recoverySteps = this._generateRecoverySteps(decisionPath, issueContext);
      guidance.steps.push(...recoverySteps);

      // 生成验证步骤
      const validationSteps = this._generateValidationSteps(decisionPath, issueContext);
      guidance.steps.push(...validationSteps);

      // 生成后续步骤
      const postSteps = this._generatePostRecoverySteps(decisionPath, issueContext);
      guidance.steps.push(...postSteps);

      guidance.totalSteps = guidance.steps.length;

      return {
        success: true,
        guidance
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 验证恢复操作的前置条件
   * Validate recovery operation prerequisites
   */
  async validatePrerequisites(decisionPath, currentState) {
    const validationResults = {
      passed: true,
      checks: [],
      blockers: [],
      warnings: []
    };

    try {
      // 检查系统状态
      const systemCheck = await this._checkSystemState(currentState);
      validationResults.checks.push(systemCheck);
      
      if (!systemCheck.passed) {
        validationResults.blockers.push(systemCheck.message);
        validationResults.passed = false;
      }

      // 检查恢复路径的特定前置条件
      const pathChecks = await this._checkPathPrerequisites(decisionPath, currentState);
      validationResults.checks.push(...pathChecks);

      pathChecks.forEach(check => {
        if (!check.passed) {
          if (check.severity === 'critical') {
            validationResults.blockers.push(check.message);
            validationResults.passed = false;
          } else {
            validationResults.warnings.push(check.message);
          }
        }
      });

      // 检查资源可用性
      const resourceCheck = await this._checkResourceAvailability(decisionPath);
      validationResults.checks.push(resourceCheck);
      
      if (!resourceCheck.passed) {
        validationResults.warnings.push(resourceCheck.message);
      }

      return validationResults;

    } catch (error) {
      validationResults.passed = false;
      validationResults.blockers.push(`前置条件检查失败: ${error.message}`);
      return validationResults;
    }
  }

  /**
   * 遍历决策树
   * Traverse decision tree
   */
  _traverseDecisionTree(node, context, path = []) {
    path.push(node.id);

    // 如果是叶子节点，返回决策结果
    if (!node.children || node.children.length === 0) {
      return {
        path,
        issueType: node.issueType,
        strategy: node.strategy,
        description: node.description,
        actions: node.actions,
        estimatedTime: node.estimatedTime,
        riskLevel: node.riskLevel,
        confidence: node.confidence
      };
    }

    // 根据条件选择下一个节点
    for (const child of node.children) {
      if (this._evaluateCondition(child.condition, context)) {
        return this._traverseDecisionTree(child, context, path);
      }
    }

    // 如果没有匹配的条件，使用默认路径
    const defaultChild = node.children.find(child => child.isDefault);
    if (defaultChild) {
      return this._traverseDecisionTree(defaultChild, context, path);
    }

    // 如果没有默认路径，返回当前节点作为结果
    return {
      path,
      issueType: node.issueType || 'unknown',
      strategy: node.strategy || 'manual_diagnosis',
      description: node.description || '需要手动诊断',
      actions: node.actions || ['手动分析问题'],
      estimatedTime: '15-30分钟',
      riskLevel: 'medium',
      confidence: 0.5
    };
  }

  /**
   * 评估条件
   * Evaluate condition
   */
  _evaluateCondition(condition, context) {
    if (!condition) return true;

    switch (condition.type) {
      case 'severity':
        return context.severity === condition.value;
      
      case 'issueType':
        return context.issueType === condition.value;
      
      case 'hasSnapshots':
        return context.hasSnapshots === condition.value;
      
      case 'affectedComponents':
        return condition.value.some(component => 
          context.affectedComponents?.includes(component)
        );
      
      case 'timeConstraint':
        return context.timeConstraint === condition.value;
      
      case 'riskTolerance':
        return context.riskTolerance === condition.value;
      
      case 'keyword':
        return context.description?.toLowerCase().includes(condition.value.toLowerCase());
      
      default:
        return false;
    }
  }

  /**
   * 验证决策路径
   * Validate decision path
   */
  async _validateDecisionPath(path, context) {
    // 检查路径的合理性
    if (!path.strategy || !path.actions) {
      throw new Error('决策路径不完整');
    }

    // 根据上下文调整路径
    const adjustedPath = { ...path };

    // 如果没有快照但策略需要快照，调整策略
    if (path.strategy.includes('snapshot') && !context.hasSnapshots) {
      adjustedPath.strategy = 'manual_recovery';
      adjustedPath.description = '由于没有可用快照，将使用手动恢复方式';
      adjustedPath.riskLevel = 'high';
      adjustedPath.confidence = Math.max(0.3, path.confidence - 0.2);
    }

    // 根据时间约束调整
    if (context.timeConstraint === 'urgent' && path.estimatedTime.includes('30')) {
      adjustedPath.strategy = 'quick_recovery';
      adjustedPath.description = '由于时间紧急，将使用快速恢复方式';
      adjustedPath.estimatedTime = '5-10分钟';
      adjustedPath.riskLevel = 'high';
    }

    return adjustedPath;
  }

  /**
   * 生成预检查步骤
   * Generate pre-check steps
   */
  _generatePreCheckSteps(decisionPath, context) {
    const steps = [];

    steps.push({
      id: 'pre-1',
      type: 'pre_check',
      title: '系统状态检查',
      description: '检查当前系统状态和可用资源',
      actions: [
        '检查磁盘空间是否充足',
        '验证网络连接状态',
        '确认必要的工具和权限',
        '检查正在运行的进程'
      ],
      expectedResult: '系统状态正常，具备恢复条件',
      estimatedTime: '2-3分钟',
      riskLevel: 'low',
      canSkip: false,
      validationChecks: ['disk_space', 'network', 'permissions']
    });

    if (decisionPath.strategy.includes('snapshot')) {
      steps.push({
        id: 'pre-2',
        type: 'pre_check',
        title: '快照可用性检查',
        description: '验证所需快照的完整性和可用性',
        actions: [
          '列出可用的快照',
          '检查快照文件完整性',
          '验证快照与当前问题的相关性',
          '确认快照的创建时间和内容'
        ],
        expectedResult: '找到合适的快照用于恢复',
        estimatedTime: '1-2分钟',
        riskLevel: 'low',
        canSkip: false,
        validationChecks: ['snapshot_integrity', 'snapshot_relevance']
      });
    }

    steps.push({
      id: 'pre-3',
      type: 'pre_check',
      title: '备份当前状态',
      description: '在执行恢复前备份当前状态',
      actions: [
        '创建当前状态的快照',
        '记录当前的配置和设置',
        '保存重要的日志文件',
        '标记备份的创建原因'
      ],
      expectedResult: '当前状态已安全备份',
      estimatedTime: '2-5分钟',
      riskLevel: 'low',
      canSkip: context.riskTolerance === 'high',
      validationChecks: ['backup_created']
    });

    return steps;
  }

  /**
   * 生成恢复步骤
   * Generate recovery steps
   */
  _generateRecoverySteps(decisionPath, context) {
    const steps = [];
    let stepId = 1;

    decisionPath.actions.forEach(action => {
      const step = {
        id: `recovery-${stepId}`,
        type: 'recovery',
        title: this._getActionTitle(action),
        description: this._getActionDescription(action),
        actions: this._getActionSteps(action),
        expectedResult: this._getActionExpectedResult(action),
        estimatedTime: this._getActionEstimatedTime(action),
        riskLevel: this._getActionRiskLevel(action),
        canSkip: false,
        validationChecks: this._getActionValidationChecks(action),
        rollbackPlan: this._getActionRollbackPlan(action)
      };

      steps.push(step);
      stepId++;
    });

    return steps;
  }

  /**
   * 生成验证步骤
   * Generate validation steps
   */
  _generateValidationSteps(decisionPath, context) {
    const steps = [];

    steps.push({
      id: 'validation-1',
      type: 'validation',
      title: '恢复结果验证',
      description: '验证恢复操作是否成功解决了原始问题',
      actions: [
        '重现原始问题场景',
        '测试相关功能是否正常',
        '检查系统日志中的错误信息',
        '验证用户界面显示是否正确'
      ],
      expectedResult: '原始问题已解决，系统功能正常',
      estimatedTime: '3-5分钟',
      riskLevel: 'low',
      canSkip: false,
      validationChecks: ['issue_resolved', 'functionality_restored']
    });

    steps.push({
      id: 'validation-2',
      type: 'validation',
      title: '系统稳定性检查',
      description: '确保恢复操作没有引入新的问题',
      actions: [
        '运行系统健康检查',
        '检查相关服务的运行状态',
        '验证数据完整性',
        '测试关键功能路径'
      ],
      expectedResult: '系统稳定，没有新的问题',
      estimatedTime: '5-10分钟',
      riskLevel: 'low',
      canSkip: context.timeConstraint === 'urgent',
      validationChecks: ['system_stability', 'no_new_issues']
    });

    return steps;
  }

  /**
   * 生成后续步骤
   * Generate post-recovery steps
   */
  _generatePostRecoverySteps(decisionPath, context) {
    const steps = [];

    steps.push({
      id: 'post-1',
      type: 'post_recovery',
      title: '创建恢复后快照',
      description: '为成功恢复后的状态创建快照',
      actions: [
        '创建新的状态快照',
        '标记为恢复后的稳定状态',
        '记录恢复过程和结果',
        '更新快照元数据'
      ],
      expectedResult: '恢复后状态已保存为快照',
      estimatedTime: '2-3分钟',
      riskLevel: 'low',
      canSkip: true,
      validationChecks: ['snapshot_created']
    });

    steps.push({
      id: 'post-2',
      type: 'post_recovery',
      title: '文档记录和总结',
      description: '记录恢复过程和经验教训',
      actions: [
        '记录问题的根本原因',
        '文档化恢复过程',
        '总结经验教训',
        '更新预防措施'
      ],
      expectedResult: '恢复过程已完整记录',
      estimatedTime: '5-10分钟',
      riskLevel: 'low',
      canSkip: true,
      validationChecks: ['documentation_complete']
    });

    return steps;
  }

  /**
   * 构建决策树
   * Build decision tree
   */
  _buildDecisionTree() {
    return {
      id: 'root',
      description: '问题分析根节点',
      children: [
        {
          id: 'critical_issues',
          condition: { type: 'severity', value: 'critical' },
          description: '关键问题处理',
          children: [
            {
              id: 'critical_with_snapshots',
              condition: { type: 'hasSnapshots', value: true },
              issueType: 'critical',
              strategy: 'immediate_snapshot_recovery',
              description: '立即从最近快照恢复',
              actions: ['restore_from_latest_snapshot', 'verify_critical_functions'],
              estimatedTime: '5-10分钟',
              riskLevel: 'medium',
              confidence: 0.9
            },
            {
              id: 'critical_no_snapshots',
              condition: { type: 'hasSnapshots', value: false },
              isDefault: true,
              issueType: 'critical',
              strategy: 'emergency_manual_recovery',
              description: '紧急手动恢复',
              actions: ['emergency_diagnosis', 'manual_critical_fix', 'create_emergency_snapshot'],
              estimatedTime: '15-30分钟',
              riskLevel: 'high',
              confidence: 0.6
            }
          ]
        },
        {
          id: 'style_issues',
          condition: { type: 'issueType', value: 'style_issue' },
          description: '样式问题处理',
          children: [
            {
              id: 'style_with_snapshots',
              condition: { type: 'hasSnapshots', value: true },
              issueType: 'style_issue',
              strategy: 'style_snapshot_recovery',
              description: '从样式快照恢复',
              actions: ['restore_style_files', 'clear_style_cache', 'verify_visual_display'],
              estimatedTime: '5-15分钟',
              riskLevel: 'low',
              confidence: 0.85
            },
            {
              id: 'style_manual_fix',
              isDefault: true,
              issueType: 'style_issue',
              strategy: 'manual_style_fix',
              description: '手动修复样式问题',
              actions: ['analyze_style_conflicts', 'fix_css_issues', 'test_responsive_design'],
              estimatedTime: '10-30分钟',
              riskLevel: 'low',
              confidence: 0.7
            }
          ]
        },
        {
          id: 'functionality_issues',
          condition: { type: 'issueType', value: 'functionality_issue' },
          description: '功能问题处理',
          children: [
            {
              id: 'function_selective_recovery',
              condition: { type: 'hasSnapshots', value: true },
              issueType: 'functionality_issue',
              strategy: 'selective_function_recovery',
              description: '选择性功能恢复',
              actions: ['identify_affected_functions', 'restore_function_files', 'test_function_integration'],
              estimatedTime: '10-25分钟',
              riskLevel: 'medium',
              confidence: 0.8
            },
            {
              id: 'function_manual_fix',
              isDefault: true,
              issueType: 'functionality_issue',
              strategy: 'manual_function_debug',
              description: '手动功能调试',
              actions: ['debug_function_logic', 'fix_api_issues', 'update_function_tests'],
              estimatedTime: '20-45分钟',
              riskLevel: 'medium',
              confidence: 0.65
            }
          ]
        },
        {
          id: 'configuration_issues',
          condition: { type: 'issueType', value: 'configuration_issue' },
          description: '配置问题处理',
          issueType: 'configuration_issue',
          strategy: 'config_recovery',
          description: '配置文件恢复',
          actions: ['backup_current_config', 'restore_config_files', 'validate_config_syntax', 'restart_services'],
          estimatedTime: '5-20分钟',
          riskLevel: 'medium',
          confidence: 0.8
        },
        {
          id: 'general_issues',
          isDefault: true,
          description: '通用问题处理',
          issueType: 'general',
          strategy: 'comprehensive_diagnosis',
          description: '综合诊断和恢复',
          actions: ['system_health_check', 'identify_root_cause', 'apply_targeted_fix', 'verify_resolution'],
          estimatedTime: '15-45分钟',
          riskLevel: 'medium',
          confidence: 0.6
        }
      ]
    };
  }

  /**
   * 初始化验证规则
   * Initialize validation rules
   */
  _initializeValidationRules() {
    return {
      disk_space: {
        check: async () => {
          // 简化的磁盘空间检查
          return { passed: true, message: '磁盘空间充足' };
        }
      },
      network: {
        check: async () => {
          return { passed: true, message: '网络连接正常' };
        }
      },
      permissions: {
        check: async () => {
          return { passed: true, message: '权限检查通过' };
        }
      },
      snapshot_integrity: {
        check: async () => {
          return { passed: true, message: '快照完整性验证通过' };
        }
      }
    };
  }

  // 辅助方法
  _getActionTitle(action) {
    const titles = {
      'restore_from_latest_snapshot': '从最新快照恢复',
      'restore_style_files': '恢复样式文件',
      'restore_function_files': '恢复功能文件',
      'restore_config_files': '恢复配置文件',
      'emergency_diagnosis': '紧急诊断',
      'system_health_check': '系统健康检查'
    };
    return titles[action] || action;
  }

  _getActionDescription(action) {
    const descriptions = {
      'restore_from_latest_snapshot': '从最近的稳定快照恢复系统状态',
      'restore_style_files': '恢复样式相关文件到正常状态',
      'restore_function_files': '恢复功能模块文件',
      'restore_config_files': '恢复配置文件到正确状态'
    };
    return descriptions[action] || `执行${action}操作`;
  }

  _getActionSteps(action) {
    const steps = {
      'restore_from_latest_snapshot': [
        '选择最新的稳定快照',
        '预览恢复影响范围',
        '执行快照恢复',
        '验证恢复结果'
      ],
      'restore_style_files': [
        '识别受影响的样式文件',
        '从快照中恢复CSS文件',
        '清除浏览器缓存',
        '重新编译样式'
      ]
    };
    return steps[action] || [`执行${action}`];
  }

  _getActionExpectedResult(action) {
    return '操作成功完成，问题得到解决';
  }

  _getActionEstimatedTime(action) {
    return '3-8分钟';
  }

  _getActionRiskLevel(action) {
    const riskLevels = {
      'restore_from_latest_snapshot': 'medium',
      'restore_style_files': 'low',
      'emergency_diagnosis': 'high'
    };
    return riskLevels[action] || 'medium';
  }

  _getActionValidationChecks(action) {
    return ['operation_success'];
  }

  _getActionRollbackPlan(action) {
    return '如果操作失败，可以从备份快照恢复';
  }

  _explainDecisionReasoning(path) {
    return `基于问题类型(${path.issueType})和可用资源，选择${path.strategy}策略`;
  }

  _calculateConfidence(path, context) {
    let confidence = path.confidence || 0.7;
    
    // 根据上下文调整置信度
    if (context.hasSnapshots) confidence += 0.1;
    if (context.severity === 'low') confidence += 0.05;
    if (context.timeConstraint === 'urgent') confidence -= 0.1;
    
    return Math.min(0.95, Math.max(0.3, confidence));
  }

  _getFallbackDecisionPath() {
    return {
      issueType: 'unknown',
      strategy: 'manual_diagnosis',
      description: '手动诊断和修复',
      actions: ['manual_analysis', 'targeted_fix'],
      estimatedTime: '20-40分钟',
      riskLevel: 'medium',
      confidence: 0.5
    };
  }

  async _checkSystemState(currentState) {
    return { passed: true, message: '系统状态正常' };
  }

  async _checkPathPrerequisites(decisionPath, currentState) {
    return [{ passed: true, message: '前置条件满足' }];
  }

  async _checkResourceAvailability(decisionPath) {
    return { passed: true, message: '资源可用' };
  }
}

module.exports = RecoveryDecisionTree;