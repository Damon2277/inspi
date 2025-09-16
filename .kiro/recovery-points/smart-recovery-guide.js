/**
 * 智能恢复指导系统
 * Smart Recovery Guide System
 * 
 * 基于问题描述提供智能化的恢复建议和逐步指导
 */

class SmartRecoveryGuide {
  constructor() {
    this.knowledgeBase = this._initializeKnowledgeBase();
    this.recoveryPatterns = this._initializeRecoveryPatterns();
  }

  /**
   * 分析问题并提供恢复建议
   * Analyze issue and provide recovery recommendations
   */
  async analyzeIssueAndRecommend(issueDescription) {
    try {
      console.log(`🔍 分析问题: ${issueDescription}`);

      // 问题分类
      const issueType = this._classifyIssue(issueDescription);
      
      // 获取相关的恢复模式
      const relevantPatterns = this._findRelevantPatterns(issueType, issueDescription);
      
      // 生成恢复建议
      const recommendations = this._generateRecommendations(issueType, relevantPatterns);
      
      // 创建逐步指导
      const stepByStepGuide = this._createStepByStepGuide(issueType, recommendations);

      const result = {
        issueType,
        severity: this._assessSeverity(issueType, issueDescription),
        recommendations,
        stepByStepGuide,
        estimatedTime: this._estimateRecoveryTime(issueType),
        riskLevel: this._assessRiskLevel(issueType),
        alternativeOptions: this._getAlternativeOptions(issueType),
        preventionTips: this._getPreventionTips(issueType)
      };

      console.log(`✅ 分析完成，发现 ${recommendations.length} 个恢复建议`);
      return result;

    } catch (error) {
      console.error('❌ 问题分析失败:', error.message);
      return {
        error: error.message,
        fallbackRecommendations: this._getFallbackRecommendations()
      };
    }
  }

  /**
   * 获取特定问题类型的详细指导
   * Get detailed guidance for specific issue type
   */
  async getDetailedGuidance(issueType) {
    const guidance = this.knowledgeBase[issueType];
    
    if (!guidance) {
      return {
        error: `未知问题类型: ${issueType}`,
        availableTypes: Object.keys(this.knowledgeBase)
      };
    }

    return {
      issueType,
      description: guidance.description,
      commonCauses: guidance.commonCauses,
      diagnosticSteps: guidance.diagnosticSteps,
      recoverySteps: guidance.recoverySteps,
      verificationSteps: guidance.verificationSteps,
      relatedIssues: guidance.relatedIssues
    };
  }

  /**
   * 问题分类
   * Classify issue
   */
  _classifyIssue(description) {
    const desc = description.toLowerCase();
    
    // 样式相关问题
    if (desc.includes('样式') || desc.includes('css') || desc.includes('ui') || desc.includes('界面')) {
      return 'style_issue';
    }
    
    // 功能相关问题
    if (desc.includes('功能') || desc.includes('api') || desc.includes('接口') || desc.includes('不工作')) {
      return 'functionality_issue';
    }
    
    // 配置相关问题
    if (desc.includes('配置') || desc.includes('环境') || desc.includes('env') || desc.includes('设置')) {
      return 'configuration_issue';
    }
    
    // 依赖相关问题
    if (desc.includes('依赖') || desc.includes('包') || desc.includes('模块') || desc.includes('import')) {
      return 'dependency_issue';
    }
    
    // 数据相关问题
    if (desc.includes('数据') || desc.includes('数据库') || desc.includes('缓存') || desc.includes('存储')) {
      return 'data_issue';
    }
    
    // 性能相关问题
    if (desc.includes('慢') || desc.includes('性能') || desc.includes('卡顿') || desc.includes('响应')) {
      return 'performance_issue';
    }
    
    // 构建相关问题
    if (desc.includes('构建') || desc.includes('编译') || desc.includes('打包') || desc.includes('build')) {
      return 'build_issue';
    }
    
    return 'general_issue';
  }

  /**
   * 查找相关的恢复模式
   * Find relevant recovery patterns
   */
  _findRelevantPatterns(issueType, description) {
    const patterns = this.recoveryPatterns[issueType] || [];
    
    // 基于描述关键词匹配更具体的模式
    return patterns.filter(pattern => {
      return pattern.keywords.some(keyword => 
        description.toLowerCase().includes(keyword.toLowerCase())
      );
    });
  }

  /**
   * 生成恢复建议
   * Generate recovery recommendations
   */
  _generateRecommendations(issueType, patterns) {
    const recommendations = [];
    
    // 基于模式生成建议
    patterns.forEach(pattern => {
      recommendations.push({
        type: pattern.type,
        priority: pattern.priority,
        description: pattern.description,
        action: pattern.action,
        riskLevel: pattern.riskLevel,
        estimatedTime: pattern.estimatedTime
      });
    });

    // 如果没有特定模式，使用通用建议
    if (recommendations.length === 0) {
      const generalRecommendations = this._getGeneralRecommendations(issueType);
      recommendations.push(...generalRecommendations);
    }

    // 按优先级排序
    return recommendations.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 创建逐步指导
   * Create step-by-step guide
   */
  _createStepByStepGuide(issueType, recommendations) {
    const guide = {
      title: `${this._getIssueTypeDisplayName(issueType)}恢复指导`,
      steps: []
    };

    // 通用第一步：诊断
    guide.steps.push({
      step: 1,
      title: '问题诊断',
      description: '首先确认问题的具体表现和影响范围',
      actions: [
        '记录具体的错误信息或异常表现',
        '确认问题是否可重现',
        '检查最近的代码变更',
        '查看相关日志文件'
      ],
      expectedResult: '明确问题的根本原因'
    });

    // 基于推荐方案生成步骤
    recommendations.forEach((rec, index) => {
      guide.steps.push({
        step: index + 2,
        title: rec.description,
        description: `执行${rec.type}类型的恢复操作`,
        actions: this._getActionSteps(rec.type, rec.action),
        riskLevel: rec.riskLevel,
        estimatedTime: rec.estimatedTime,
        expectedResult: this._getExpectedResult(rec.type)
      });
    });

    // 通用最后步骤：验证
    guide.steps.push({
      step: guide.steps.length + 1,
      title: '恢复验证',
      description: '验证问题是否已完全解决',
      actions: [
        '重新测试原始问题场景',
        '检查相关功能是否正常',
        '运行自动化测试（如果有）',
        '创建新的状态快照作为备份'
      ],
      expectedResult: '确认问题已完全解决且系统稳定'
    });

    return guide;
  }

  /**
   * 评估问题严重程度
   * Assess issue severity
   */
  _assessSeverity(issueType, description) {
    const criticalKeywords = ['崩溃', '无法启动', '完全不工作', '数据丢失', '安全'];
    const highKeywords = ['主要功能', '用户无法', '严重影响'];
    const mediumKeywords = ['部分功能', '偶尔出现', '性能问题'];
    
    const desc = description.toLowerCase();
    
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
   * 估算恢复时间
   * Estimate recovery time
   */
  _estimateRecoveryTime(issueType) {
    const timeEstimates = {
      'style_issue': '5-15分钟',
      'functionality_issue': '10-30分钟',
      'configuration_issue': '5-20分钟',
      'dependency_issue': '10-25分钟',
      'data_issue': '15-45分钟',
      'performance_issue': '20-60分钟',
      'build_issue': '10-30分钟',
      'general_issue': '10-30分钟'
    };
    
    return timeEstimates[issueType] || '10-30分钟';
  }

  /**
   * 评估风险级别
   * Assess risk level
   */
  _assessRiskLevel(issueType) {
    const riskLevels = {
      'style_issue': 'low',
      'functionality_issue': 'medium',
      'configuration_issue': 'medium',
      'dependency_issue': 'medium',
      'data_issue': 'high',
      'performance_issue': 'low',
      'build_issue': 'medium',
      'general_issue': 'medium'
    };
    
    return riskLevels[issueType] || 'medium';
  }

  /**
   * 获取替代选项
   * Get alternative options
   */
  _getAlternativeOptions(issueType) {
    const alternatives = {
      'style_issue': [
        '使用样式恢复系统回滚到之前版本',
        '手动修复CSS文件',
        '重新应用样式模板'
      ],
      'functionality_issue': [
        '从状态快照恢复相关功能文件',
        '使用Git回滚到工作版本',
        '重新实现功能模块'
      ],
      'configuration_issue': [
        '恢复配置文件到默认状态',
        '从环境模板重新生成配置',
        '手动修正配置参数'
      ]
    };
    
    return alternatives[issueType] || [
      '从最近的状态快照恢复',
      '使用版本管理系统回滚',
      '寻求技术支持'
    ];
  }

  /**
   * 获取预防建议
   * Get prevention tips
   */
  _getPreventionTips(issueType) {
    const tips = {
      'style_issue': [
        '修改样式前先创建快照',
        '使用版本控制跟踪CSS变更',
        '定期进行视觉回归测试'
      ],
      'functionality_issue': [
        '实现功能前先写测试',
        '定期创建功能状态快照',
        '使用功能开关进行渐进式发布'
      ],
      'configuration_issue': [
        '使用配置模板和验证',
        '定期备份配置文件',
        '建立配置变更审查流程'
      ]
    };
    
    return tips[issueType] || [
      '定期创建项目状态快照',
      '建立完善的测试流程',
      '保持良好的版本控制习惯'
    ];
  }

  /**
   * 初始化知识库
   * Initialize knowledge base
   */
  _initializeKnowledgeBase() {
    return {
      'style_issue': {
        description: '样式和UI相关问题',
        commonCauses: ['CSS文件损坏', '样式冲突', '响应式设计问题', '组件样式丢失'],
        diagnosticSteps: [
          '检查浏览器开发者工具中的样式',
          '查看CSS文件是否正确加载',
          '验证样式类名是否正确',
          '检查媒体查询是否生效'
        ],
        recoverySteps: [
          '从样式快照恢复CSS文件',
          '重新编译样式文件',
          '清除浏览器缓存',
          '验证样式文件路径'
        ],
        verificationSteps: [
          '在不同设备上测试显示效果',
          '检查所有页面的样式一致性',
          '验证交互元素的样式状态'
        ],
        relatedIssues: ['build_issue', 'configuration_issue']
      },
      
      'functionality_issue': {
        description: '功能和API相关问题',
        commonCauses: ['API接口错误', '业务逻辑问题', '数据处理异常', '组件功能失效'],
        diagnosticSteps: [
          '检查浏览器控制台错误',
          '验证API请求和响应',
          '测试功能的输入输出',
          '检查相关依赖是否正常'
        ],
        recoverySteps: [
          '从功能快照恢复相关文件',
          '重新部署功能模块',
          '修复API接口问题',
          '恢复数据库状态'
        ],
        verificationSteps: [
          '执行完整的功能测试',
          '验证API接口响应',
          '检查数据处理结果'
        ],
        relatedIssues: ['data_issue', 'configuration_issue']
      },
      
      'configuration_issue': {
        description: '配置和环境相关问题',
        commonCauses: ['环境变量错误', '配置文件损坏', '服务配置问题', '权限设置错误'],
        diagnosticSteps: [
          '检查环境变量设置',
          '验证配置文件格式',
          '查看服务启动日志',
          '检查文件权限设置'
        ],
        recoverySteps: [
          '恢复配置文件到正确状态',
          '重新设置环境变量',
          '修复服务配置',
          '调整文件权限'
        ],
        verificationSteps: [
          '重启相关服务',
          '验证配置生效',
          '测试系统功能'
        ],
        relatedIssues: ['build_issue', 'dependency_issue']
      }
    };
  }

  /**
   * 初始化恢复模式
   * Initialize recovery patterns
   */
  _initializeRecoveryPatterns() {
    return {
      'style_issue': [
        {
          type: 'snapshot_restore',
          priority: 'high',
          description: '从样式快照恢复',
          action: 'restore_style_snapshot',
          keywords: ['样式丢失', 'css', '显示异常'],
          riskLevel: 'low',
          estimatedTime: '2-5分钟'
        },
        {
          type: 'cache_clear',
          priority: 'medium',
          description: '清除样式缓存',
          action: 'clear_style_cache',
          keywords: ['缓存', '不更新', '旧样式'],
          riskLevel: 'low',
          estimatedTime: '1-2分钟'
        }
      ],
      
      'functionality_issue': [
        {
          type: 'function_restore',
          priority: 'high',
          description: '恢复功能文件',
          action: 'restore_function_files',
          keywords: ['功能不工作', 'api错误', '接口问题'],
          riskLevel: 'medium',
          estimatedTime: '5-15分钟'
        },
        {
          type: 'service_restart',
          priority: 'medium',
          description: '重启相关服务',
          action: 'restart_services',
          keywords: ['服务异常', '连接失败'],
          riskLevel: 'low',
          estimatedTime: '2-5分钟'
        }
      ],
      
      'configuration_issue': [
        {
          type: 'config_restore',
          priority: 'high',
          description: '恢复配置文件',
          action: 'restore_config_files',
          keywords: ['配置错误', '环境问题', '设置异常'],
          riskLevel: 'medium',
          estimatedTime: '3-10分钟'
        }
      ]
    };
  }

  /**
   * 获取通用建议
   * Get general recommendations
   */
  _getGeneralRecommendations(issueType) {
    return [
      {
        type: 'diagnostic',
        priority: 'high',
        description: '执行系统诊断',
        action: 'run_system_diagnostic',
        riskLevel: 'low',
        estimatedTime: '2-5分钟'
      },
      {
        type: 'snapshot_restore',
        priority: 'medium',
        description: '从最近快照恢复',
        action: 'restore_latest_snapshot',
        riskLevel: 'medium',
        estimatedTime: '5-15分钟'
      }
    ];
  }

  /**
   * 获取操作步骤
   * Get action steps
   */
  _getActionSteps(actionType, action) {
    const actionSteps = {
      'restore_style_snapshot': [
        '打开样式恢复系统',
        '选择最近的稳定样式快照',
        '预览恢复效果',
        '确认并执行恢复'
      ],
      'restore_function_files': [
        '识别受影响的功能文件',
        '从状态快照中选择相关文件',
        '备份当前文件（如需要）',
        '执行选择性文件恢复'
      ],
      'restore_config_files': [
        '定位问题配置文件',
        '从快照中恢复配置',
        '验证配置格式正确性',
        '重启相关服务'
      ]
    };
    
    return actionSteps[action] || [
      '分析问题具体情况',
      '选择合适的恢复方案',
      '执行恢复操作',
      '验证恢复结果'
    ];
  }

  /**
   * 获取预期结果
   * Get expected result
   */
  _getExpectedResult(actionType) {
    const results = {
      'snapshot_restore': '系统恢复到之前的稳定状态',
      'function_restore': '功能恢复正常工作',
      'config_restore': '配置问题得到解决',
      'cache_clear': '缓存问题得到清理',
      'service_restart': '服务重新正常运行'
    };
    
    return results[actionType] || '问题得到解决';
  }

  /**
   * 获取问题类型显示名称
   * Get issue type display name
   */
  _getIssueTypeDisplayName(issueType) {
    const displayNames = {
      'style_issue': '样式问题',
      'functionality_issue': '功能问题',
      'configuration_issue': '配置问题',
      'dependency_issue': '依赖问题',
      'data_issue': '数据问题',
      'performance_issue': '性能问题',
      'build_issue': '构建问题',
      'general_issue': '一般问题'
    };
    
    return displayNames[issueType] || '未知问题';
  }

  /**
   * 获取后备建议
   * Get fallback recommendations
   */
  _getFallbackRecommendations() {
    return [
      {
        type: 'manual_diagnosis',
        priority: 'high',
        description: '手动诊断问题',
        action: '详细检查错误日志和系统状态',
        riskLevel: 'low',
        estimatedTime: '10-20分钟'
      },
      {
        type: 'community_help',
        priority: 'medium',
        description: '寻求社区帮助',
        action: '在相关技术社区或论坛寻求帮助',
        riskLevel: 'low',
        estimatedTime: '30-60分钟'
      }
    ];
  }
}

module.exports = SmartRecoveryGuide;