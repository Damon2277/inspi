#!/usr/bin/env node

/**
 * 项目状态恢复系统 CLI
 * Project State Recovery System CLI
 */

const ProjectStateRecoverySystem = require('./index');

class RecoverySystemCLI {
  constructor() {
    this.system = new ProjectStateRecoverySystem();
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0];

    try {
      switch (command) {
        case 'snapshot':
          await this.createSnapshot(args.slice(1));
          break;
        case 'list':
          await this.listSnapshots();
          break;
        case 'diagnose':
          await this.diagnoseHealth();
          break;
        case 'recover':
          await this.recoverStates(args.slice(1));
          break;
        case 'guide':
          await this.getRecoveryGuide(args.slice(1));
          break;
        case 'preview':
          await this.previewRecovery(args.slice(1));
          break;
        case 'help':
        default:
          this.showHelp();
          break;
      }
    } catch (error) {
      console.error('❌ 命令执行失败:', error.message);
      process.exit(1);
    }
  }

  async createSnapshot(args) {
    const reason = args.join(' ') || 'Manual snapshot via CLI';
    
    console.log('📸 创建项目状态快照...');
    const result = await this.system.createStateSnapshot({
      reason,
      type: 'manual'
    });

    if (result.success) {
      console.log(`✅ 快照创建成功: ${result.snapshotId}`);
      console.log(`📁 文件路径: ${result.filepath}`);
    } else {
      console.error(`❌ 快照创建失败: ${result.error}`);
    }
  }

  async listSnapshots() {
    console.log('📋 获取快照列表...');
    const result = await this.system.stateManager.listSnapshots();

    if (result.success) {
      console.log(`\n📊 共找到 ${result.total} 个快照:\n`);
      
      result.snapshots.forEach((snapshot, index) => {
        const date = new Date(snapshot.timestamp).toLocaleString('zh-CN');
        const type = snapshot.isAutomatic ? '自动' : '手动';
        
        console.log(`${index + 1}. ${snapshot.id}`);
        console.log(`   时间: ${date}`);
        console.log(`   类型: ${type}`);
        console.log(`   原因: ${snapshot.reason}`);
        console.log(`   大小: ${snapshot.size} 字节`);
        console.log('');
      });
    } else {
      console.error(`❌ 获取快照列表失败: ${result.error}`);
    }
  }

  async diagnoseHealth() {
    console.log('🔍 执行项目健康诊断...');
    const diagnosis = await this.system.diagnoseProjectHealth();

    console.log(`\n🏥 项目健康状态: ${this.getHealthEmoji(diagnosis.overallHealth)} ${diagnosis.overallHealth.toUpperCase()}`);
    console.log(`📅 诊断时间: ${new Date(diagnosis.timestamp).toLocaleString('zh-CN')}\n`);

    if (diagnosis.issues.length > 0) {
      console.log('⚠️ 发现的问题:');
      diagnosis.issues.forEach((issue, index) => {
        const severity = this.getSeverityEmoji(issue.severity);
        console.log(`${index + 1}. ${severity} ${issue.description}`);
        if (issue.file) console.log(`   文件: ${issue.file}`);
        if (issue.path) console.log(`   路径: ${issue.path}`);
      });
      console.log('');
    }

    if (diagnosis.recommendations.length > 0) {
      console.log('💡 建议:');
      diagnosis.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec.description}`);
        console.log(`   操作: ${rec.action}`);
        console.log(`   优先级: ${rec.priority}`);
      });
      console.log('');
    }

    if (diagnosis.recoveryOptions.length > 0) {
      console.log('🔧 恢复选项:');
      diagnosis.recoveryOptions.forEach((option, index) => {
        console.log(`${index + 1}. ${option.description}`);
        console.log(`   风险: ${option.risk}`);
        console.log(`   预计时间: ${option.estimatedTime}`);
      });
    }
  }

  async recoverStates(args) {
    if (args.length < 2) {
      console.error('❌ 用法: recover <快照ID> <状态类型1> [状态类型2] ...');
      return;
    }

    const snapshotId = args[0];
    const selectedStates = args.slice(1);

    console.log(`🔄 开始恢复状态...`);
    console.log(`📸 快照: ${snapshotId}`);
    console.log(`📋 状态: ${selectedStates.join(', ')}`);

    const result = await this.system.recoverSelectedStates(snapshotId, selectedStates);

    if (result.success) {
      console.log('\n✅ 恢复完成!');
      console.log(`📊 成功: ${result.results.filter(r => r.success).length}/${result.results.length}`);
      
      result.results.forEach(r => {
        const status = r.success ? '✅' : '❌';
        console.log(`${status} ${r.stateType}: ${r.message}`);
      });

      if (result.report) {
        console.log(`\n📈 成功率: ${result.report.summary.successRate}`);
      }
    } else {
      console.error(`❌ 恢复失败: ${result.error}`);
    }
  }

  async getRecoveryGuide(args) {
    if (args.length === 0) {
      console.error('❌ 用法: guide <问题描述>');
      return;
    }

    const issueDescription = args.join(' ');
    console.log(`🔍 分析问题: "${issueDescription}"`);

    const guidance = await this.system.getRecoveryRecommendations(issueDescription);

    if (guidance.error) {
      console.error(`❌ 分析失败: ${guidance.error}`);
      return;
    }

    console.log(`\n🏷️ 问题类型: ${guidance.issueType}`);
    console.log(`⚠️ 严重程度: ${guidance.severity}`);
    console.log(`⏱️ 预计时间: ${guidance.estimatedTime}`);
    console.log(`🎯 风险级别: ${guidance.riskLevel}\n`);

    if (guidance.recommendations.length > 0) {
      console.log('💡 恢复建议:');
      guidance.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec.description} (${rec.priority}优先级)`);
        console.log(`   操作: ${rec.action}`);
        console.log(`   风险: ${rec.riskLevel}`);
        console.log(`   时间: ${rec.estimatedTime}`);
        console.log('');
      });
    }

    if (guidance.stepByStepGuide) {
      console.log('📋 逐步指导:');
      guidance.stepByStepGuide.steps.forEach(step => {
        console.log(`${step.step}. ${step.title}`);
        console.log(`   ${step.description}`);
        if (step.actions) {
          step.actions.forEach(action => {
            console.log(`   • ${action}`);
          });
        }
        if (step.expectedResult) {
          console.log(`   ✅ 预期结果: ${step.expectedResult}`);
        }
        console.log('');
      });
    }
  }

  async previewRecovery(args) {
    if (args.length < 2) {
      console.error('❌ 用法: preview <快照ID> <状态类型1> [状态类型2] ...');
      return;
    }

    const snapshotId = args[0];
    const selectedStates = args.slice(1);

    console.log('🔍 预览恢复影响...');
    const result = await this.system.selectiveRecovery.previewRecoveryImpact(snapshotId, selectedStates);

    if (result.success) {
      const impact = result.impact;
      
      console.log(`\n📊 恢复影响预览:`);
      console.log(`📸 快照: ${impact.snapshotId}`);
      console.log(`📋 状态: ${impact.selectedStates.join(', ')}`);
      console.log(`📁 影响文件: ${impact.affectedFiles.length} 个`);
      console.log(`⏱️ 预计时间: ${impact.estimatedTime}`);
      
      if (impact.affectedFiles.length > 0) {
        console.log('\n📁 受影响的文件:');
        impact.affectedFiles.forEach(file => {
          console.log(`   • ${file}`);
        });
      }

      if (impact.potentialRisks.length > 0) {
        console.log('\n⚠️ 潜在风险:');
        impact.potentialRisks.forEach(risk => {
          console.log(`   • ${risk}`);
        });
      }

      if (impact.recommendations.length > 0) {
        console.log('\n💡 建议:');
        impact.recommendations.forEach(rec => {
          console.log(`   • ${rec}`);
        });
      }
    } else {
      console.error(`❌ 预览失败: ${result.error}`);
    }
  }

  getHealthEmoji(health) {
    const emojis = {
      'healthy': '🟢',
      'warning': '🟡',
      'critical': '🔴',
      'error': '💥'
    };
    return emojis[health] || '❓';
  }

  getSeverityEmoji(severity) {
    const emojis = {
      'low': '🟢',
      'warning': '🟡',
      'medium': '🟡',
      'high': '🟠',
      'critical': '🔴'
    };
    return emojis[severity] || '❓';
  }

  showHelp() {
    console.log(`
🔧 项目状态恢复系统 CLI

用法: node cli.js <命令> [参数]

命令:
  snapshot [原因]              创建项目状态快照
  list                        列出所有快照
  diagnose                    执行项目健康诊断
  recover <快照ID> <状态...>   恢复选定的状态
  guide <问题描述>            获取恢复指导
  preview <快照ID> <状态...>   预览恢复影响
  help                        显示此帮助信息

示例:
  node cli.js snapshot "功能开发完成前的备份"
  node cli.js list
  node cli.js diagnose
  node cli.js recover state-1234567890 project_config feature_auth
  node cli.js guide "样式显示异常"
  node cli.js preview state-1234567890 project_config

状态类型:
  project_config              项目配置 (package.json等)
  feature_auth                认证功能
  feature_ai                  AI功能
  feature_ui                  UI功能
  feature_cache               缓存功能
  config_version              版本配置
  config_quality-checks       质量检查配置
`);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const cli = new RecoverySystemCLI();
  cli.run().catch(error => {
    console.error('❌ CLI运行失败:', error.message);
    process.exit(1);
  });
}

module.exports = RecoverySystemCLI;