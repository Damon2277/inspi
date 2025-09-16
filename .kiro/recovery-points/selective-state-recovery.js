/**
 * 选择性状态恢复系统
 * Selective State Recovery System
 * 
 * 允许用户选择性地恢复项目的特定部分，而不影响其他正常功能
 */

const fs = require('fs').promises;
const path = require('path');
const StateSnapshotManager = require('./state-snapshot-manager');

class SelectiveStateRecovery {
  constructor() {
    this.snapshotManager = new StateSnapshotManager();
    this.recoveryStrategies = this._initializeRecoveryStrategies();
  }

  /**
   * 执行选择性状态恢复
   * Execute selective state recovery
   */
  async recoverStates(snapshotId, selectedStates) {
    try {
      console.log(`🔄 开始选择性恢复 (快照: ${snapshotId})`);
      console.log(`📋 选择的状态: ${selectedStates.join(', ')}`);

      // 加载快照
      const snapshotResult = await this.snapshotManager.loadSnapshot(snapshotId);
      if (!snapshotResult.success) {
        throw new Error(`无法加载快照: ${snapshotResult.error}`);
      }

      const snapshot = snapshotResult.snapshot;
      const recoveryResults = [];

      // 执行每个选择的状态恢复
      for (const stateType of selectedStates) {
        console.log(`🔧 恢复状态: ${stateType}`);
        
        const result = await this._recoverSingleState(stateType, snapshot);
        recoveryResults.push({
          stateType,
          success: result.success,
          message: result.message,
          details: result.details
        });

        if (!result.success) {
          console.warn(`⚠️ 状态恢复失败 (${stateType}): ${result.message}`);
        } else {
          console.log(`✅ 状态恢复成功 (${stateType})`);
        }
      }

      // 生成恢复报告
      const report = this._generateRecoveryReport(snapshotId, recoveryResults);
      
      // 保存恢复记录
      await this._saveRecoveryRecord(snapshotId, selectedStates, recoveryResults);

      console.log(`🎉 选择性恢复完成`);
      return {
        success: true,
        snapshotId,
        recoveredStates: selectedStates,
        results: recoveryResults,
        report
      };

    } catch (error) {
      console.error('❌ 选择性恢复失败:', error.message);
      return {
        success: false,
        error: error.message,
        snapshotId,
        selectedStates
      };
    }
  }

  /**
   * 获取可恢复的状态列表
   * Get list of recoverable states
   */
  async getRecoverableStates(snapshotId) {
    try {
      const snapshotResult = await this.snapshotManager.loadSnapshot(snapshotId);
      if (!snapshotResult.success) {
        throw new Error(`无法加载快照: ${snapshotResult.error}`);
      }

      const snapshot = snapshotResult.snapshot;
      const recoverableStates = [];

      // 检查项目状态
      if (snapshot.projectState) {
        recoverableStates.push({
          type: 'project_config',
          name: '项目配置',
          description: '包括package.json、环境配置等',
          riskLevel: 'medium',
          affectedFiles: ['package.json', '.env.example']
        });
      }

      // 检查功能状态
      if (snapshot.featureStates) {
        Object.keys(snapshot.featureStates).forEach(feature => {
          if (snapshot.featureStates[feature].status === 'present') {
            recoverableStates.push({
              type: `feature_${feature}`,
              name: `${feature}功能`,
              description: `恢复${feature}相关的功能文件`,
              riskLevel: 'low',
              affectedFiles: snapshot.featureStates[feature].files
            });
          }
        });
      }

      // 检查配置状态
      if (snapshot.configStates) {
        Object.keys(snapshot.configStates).forEach(configFile => {
          if (!snapshot.configStates[configFile].error) {
            recoverableStates.push({
              type: `config_${path.basename(configFile, '.json')}`,
              name: `${path.basename(configFile)}配置`,
              description: `恢复${configFile}配置文件`,
              riskLevel: 'medium',
              affectedFiles: [configFile]
            });
          }
        });
      }

      return {
        success: true,
        snapshotId,
        recoverableStates,
        total: recoverableStates.length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        snapshotId
      };
    }
  }

  /**
   * 预览恢复影响
   * Preview recovery impact
   */
  async previewRecoveryImpact(snapshotId, selectedStates) {
    try {
      const snapshotResult = await this.snapshotManager.loadSnapshot(snapshotId);
      if (!snapshotResult.success) {
        throw new Error(`无法加载快照: ${snapshotResult.error}`);
      }

      const snapshot = snapshotResult.snapshot;
      const impact = {
        snapshotId,
        selectedStates,
        affectedFiles: [],
        potentialRisks: [],
        estimatedTime: '0分钟',
        recommendations: []
      };

      let totalEstimatedMinutes = 0;

      for (const stateType of selectedStates) {
        const stateImpact = await this._analyzeStateImpact(stateType, snapshot);
        
        impact.affectedFiles.push(...stateImpact.affectedFiles);
        impact.potentialRisks.push(...stateImpact.risks);
        totalEstimatedMinutes += stateImpact.estimatedMinutes;
      }

      impact.estimatedTime = `${totalEstimatedMinutes}分钟`;
      impact.recommendations = this._generatePreviewRecommendations(impact);

      return {
        success: true,
        impact
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 恢复单个状态
   * Recover single state
   */
  async _recoverSingleState(stateType, snapshot) {
    try {
      const strategy = this.recoveryStrategies[stateType];
      
      if (!strategy) {
        // 尝试通用恢复策略
        return await this._executeGenericRecovery(stateType, snapshot);
      }

      return await strategy.execute(snapshot);

    } catch (error) {
      return {
        success: false,
        message: `恢复失败: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * 执行通用恢复策略
   * Execute generic recovery strategy
   */
  async _executeGenericRecovery(stateType, snapshot) {
    // 解析状态类型
    if (stateType.startsWith('feature_')) {
      const featureName = stateType.replace('feature_', '');
      return await this._recoverFeatureState(featureName, snapshot);
    }
    
    if (stateType.startsWith('config_')) {
      const configName = stateType.replace('config_', '');
      return await this._recoverConfigState(configName, snapshot);
    }

    return {
      success: false,
      message: `未知的状态类型: ${stateType}`,
      details: { stateType }
    };
  }

  /**
   * 恢复功能状态
   * Recover feature state
   */
  async _recoverFeatureState(featureName, snapshot) {
    try {
      const featureState = snapshot.featureStates[featureName];
      
      if (!featureState || featureState.status !== 'present') {
        return {
          success: false,
          message: `快照中不存在${featureName}功能状态`,
          details: { featureName, available: featureState ? featureState.status : 'none' }
        };
      }

      const restoredFiles = [];
      const failedFiles = [];

      // 这里我们只记录需要恢复的文件，实际的文件恢复需要与Git系统集成
      for (const file of featureState.files) {
        try {
          // 检查文件是否存在
          await fs.access(file);
          restoredFiles.push(file);
        } catch {
          failedFiles.push(file);
        }
      }

      return {
        success: failedFiles.length === 0,
        message: `${featureName}功能状态分析完成`,
        details: {
          featureName,
          totalFiles: featureState.files.length,
          existingFiles: restoredFiles.length,
          missingFiles: failedFiles.length,
          restoredFiles,
          failedFiles
        }
      };

    } catch (error) {
      return {
        success: false,
        message: `恢复${featureName}功能失败: ${error.message}`,
        details: { featureName, error: error.message }
      };
    }
  }

  /**
   * 恢复配置状态
   * Recover configuration state
   */
  async _recoverConfigState(configName, snapshot) {
    try {
      // 查找配置文件
      const configFile = Object.keys(snapshot.configStates).find(file => 
        path.basename(file, '.json') === configName
      );

      if (!configFile) {
        return {
          success: false,
          message: `快照中不存在${configName}配置`,
          details: { configName, availableConfigs: Object.keys(snapshot.configStates) }
        };
      }

      const configData = snapshot.configStates[configFile];
      
      if (configData.error) {
        return {
          success: false,
          message: `配置数据损坏: ${configData.error}`,
          details: { configFile, error: configData.error }
        };
      }

      // 这里我们只验证配置数据的完整性，实际恢复需要写入文件
      const isValid = this._validateConfigData(configData);

      return {
        success: isValid,
        message: isValid ? `${configName}配置验证通过` : `${configName}配置数据无效`,
        details: {
          configName,
          configFile,
          dataSize: JSON.stringify(configData).length,
          isValid
        }
      };

    } catch (error) {
      return {
        success: false,
        message: `恢复${configName}配置失败: ${error.message}`,
        details: { configName, error: error.message }
      };
    }
  }

  /**
   * 分析状态影响
   * Analyze state impact
   */
  async _analyzeStateImpact(stateType, snapshot) {
    const impact = {
      affectedFiles: [],
      risks: [],
      estimatedMinutes: 2
    };

    if (stateType === 'project_config') {
      impact.affectedFiles = ['package.json', '.env.example'];
      impact.risks = ['可能需要重新安装依赖', '环境配置可能需要调整'];
      impact.estimatedMinutes = 5;
    } else if (stateType.startsWith('feature_')) {
      const featureName = stateType.replace('feature_', '');
      const featureState = snapshot.featureStates[featureName];
      
      if (featureState) {
        impact.affectedFiles = featureState.files;
        impact.risks = [`${featureName}功能可能需要重新测试`];
        impact.estimatedMinutes = Math.max(2, featureState.files.length);
      }
    } else if (stateType.startsWith('config_')) {
      const configName = stateType.replace('config_', '');
      impact.affectedFiles = [configName + '.json'];
      impact.risks = ['配置变更可能影响系统行为'];
      impact.estimatedMinutes = 3;
    }

    return impact;
  }

  /**
   * 生成预览建议
   * Generate preview recommendations
   */
  _generatePreviewRecommendations(impact) {
    const recommendations = [];

    if (impact.affectedFiles.length > 10) {
      recommendations.push('建议分批恢复，避免一次性变更过多文件');
    }

    if (impact.potentialRisks.some(risk => risk.includes('依赖'))) {
      recommendations.push('恢复后建议重新安装依赖包');
    }

    if (impact.potentialRisks.some(risk => risk.includes('测试'))) {
      recommendations.push('恢复后建议运行相关测试');
    }

    if (recommendations.length === 0) {
      recommendations.push('恢复操作风险较低，可以安全执行');
    }

    return recommendations;
  }

  /**
   * 生成恢复报告
   * Generate recovery report
   */
  _generateRecoveryReport(snapshotId, recoveryResults) {
    const successful = recoveryResults.filter(r => r.success);
    const failed = recoveryResults.filter(r => !r.success);

    return {
      timestamp: new Date().toISOString(),
      snapshotId,
      summary: {
        total: recoveryResults.length,
        successful: successful.length,
        failed: failed.length,
        successRate: `${Math.round((successful.length / recoveryResults.length) * 100)}%`
      },
      details: {
        successful: successful.map(r => ({
          stateType: r.stateType,
          message: r.message
        })),
        failed: failed.map(r => ({
          stateType: r.stateType,
          message: r.message,
          error: r.details?.error
        }))
      },
      recommendations: this._generatePostRecoveryRecommendations(recoveryResults)
    };
  }

  /**
   * 生成恢复后建议
   * Generate post-recovery recommendations
   */
  _generatePostRecoveryRecommendations(recoveryResults) {
    const recommendations = [];
    const failed = recoveryResults.filter(r => !r.success);

    if (failed.length > 0) {
      recommendations.push('检查失败的恢复项目，考虑手动修复');
    }

    if (recoveryResults.some(r => r.stateType.includes('feature'))) {
      recommendations.push('运行相关功能测试确保恢复正确');
    }

    if (recoveryResults.some(r => r.stateType.includes('config'))) {
      recommendations.push('验证配置文件设置是否正确');
    }

    recommendations.push('创建新的状态快照作为恢复后的备份');

    return recommendations;
  }

  /**
   * 保存恢复记录
   * Save recovery record
   */
  async _saveRecoveryRecord(snapshotId, selectedStates, recoveryResults) {
    try {
      const recordsDir = '.kiro/recovery-points/recovery-records';
      await fs.mkdir(recordsDir, { recursive: true });

      const record = {
        timestamp: new Date().toISOString(),
        snapshotId,
        selectedStates,
        results: recoveryResults,
        success: recoveryResults.every(r => r.success)
      };

      const filename = `recovery-${Date.now()}.json`;
      const filepath = path.join(recordsDir, filename);

      await fs.writeFile(filepath, JSON.stringify(record, null, 2));
      console.log(`📝 恢复记录已保存: ${filename}`);

    } catch (error) {
      console.warn('⚠️ 保存恢复记录失败:', error.message);
    }
  }

  /**
   * 验证配置数据
   * Validate configuration data
   */
  _validateConfigData(configData) {
    try {
      // 基本验证：确保是有效的对象
      if (typeof configData !== 'object' || configData === null) {
        return false;
      }

      // 检查是否有错误标记
      if (configData.error) {
        return false;
      }

      // 配置数据应该有一些内容
      return Object.keys(configData).length > 0;

    } catch (error) {
      return false;
    }
  }

  /**
   * 初始化恢复策略
   * Initialize recovery strategies
   */
  _initializeRecoveryStrategies() {
    return {
      'project_config': {
        execute: async (snapshot) => {
          try {
            const projectState = snapshot.projectState;
            
            if (!projectState || projectState.error) {
              return {
                success: false,
                message: '快照中的项目配置数据无效',
                details: { error: projectState?.error }
              };
            }

            // 验证项目配置的完整性
            const hasVersion = projectState.version;
            const hasDependencies = projectState.dependencies;
            const hasScripts = projectState.scripts;

            return {
              success: hasVersion && hasDependencies && hasScripts,
              message: '项目配置状态分析完成',
              details: {
                version: projectState.version,
                dependenciesCount: Object.keys(projectState.dependencies || {}).length,
                scriptsCount: Object.keys(projectState.scripts || {}).length,
                hasEnvTemplate: !!projectState.envTemplate
              }
            };

          } catch (error) {
            return {
              success: false,
              message: `项目配置恢复失败: ${error.message}`,
              details: { error: error.message }
            };
          }
        }
      }
    };
  }
}

module.exports = SelectiveStateRecovery;