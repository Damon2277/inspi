#!/usr/bin/env node

/**
 * 开发者仪表板 CLI
 * Developer Dashboard CLI
 */

const DeveloperDashboard = require('./index');

class DashboardCLI {
  constructor() {
    this.dashboard = new DeveloperDashboard();
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0];

    try {
      switch (command) {
        case 'start':
          await this.startDashboard();
          break;
        case 'stop':
          await this.stopDashboard();
          break;
        case 'status':
          await this.showStatus();
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

  async startDashboard() {
    console.log('🚀 启动开发者仪表板...');
    
    const result = await this.dashboard.start();
    
    if (result.success) {
      console.log(`✅ 仪表板启动成功!`);
      console.log(`📊 访问地址: ${result.url}`);
      console.log(`🔧 按 Ctrl+C 停止服务`);
      
      // 处理优雅关闭
      process.on('SIGINT', async () => {
        console.log('\n⏹️ 正在停止仪表板...');
        await this.dashboard.stop();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        console.log('\n⏹️ 正在停止仪表板...');
        await this.dashboard.stop();
        process.exit(0);
      });

    } else {
      console.error(`❌ 仪表板启动失败: ${result.error}`);
      process.exit(1);
    }
  }

  async stopDashboard() {
    console.log('⏹️ 停止开发者仪表板...');
    await this.dashboard.stop();
    console.log('✅ 仪表板已停止');
  }

  async showStatus() {
    try {
      const health = await this.dashboard.getSystemHealth();
      
      console.log('\n📊 系统状态概览:');
      console.log(`整体状态: ${this.getStatusEmoji(health.overall)} ${health.overall.toUpperCase()}`);
      
      if (health.systems) {
        console.log('\n🔧 各系统状态:');
        Object.entries(health.systems).forEach(([name, system]) => {
          console.log(`  ${this.getSystemEmoji(name)} ${this.getSystemDisplayName(name)}: ${this.getStatusEmoji(system.status)} ${system.status}`);
        });
      }

      if (health.alerts && health.alerts.length > 0) {
        console.log('\n⚠️ 警报:');
        health.alerts.forEach(alert => {
          console.log(`  • ${alert}`);
        });
      }

    } catch (error) {
      console.error('❌ 获取状态失败:', error.message);
    }
  }

  showHelp() {
    console.log(`
🚀 开发者仪表板 CLI

用法: node cli.js <命令>

命令:
  start                启动仪表板服务器
  stop                 停止仪表板服务器
  status               显示系统状态
  help                 显示此帮助信息

示例:
  node cli.js start    # 启动仪表板
  node cli.js status   # 查看系统状态

环境变量:
  DASHBOARD_PORT       仪表板端口 (默认: 3001)

访问地址:
  http://localhost:3001

功能特性:
  📊 实时系统健康监控
  🔧 一键快速操作
  📈 项目状态可视化
  📋 操作历史记录
  🎯 智能恢复指导
`);
  }

  getStatusEmoji(status) {
    const emojis = {
      'healthy': '🟢',
      'warning': '🟡',
      'critical': '🔴',
      'error': '💥',
      'unknown': '❓'
    };
    return emojis[status] || '❓';
  }

  getSystemEmoji(systemName) {
    const emojis = {
      'recovery': '🔄',
      'quality': '✅',
      'style': '🎨'
    };
    return emojis[systemName] || '🔧';
  }

  getSystemDisplayName(systemName) {
    const names = {
      'recovery': '恢复系统',
      'quality': '质量检查',
      'style': '样式恢复'
    };
    return names[systemName] || systemName;
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const cli = new DashboardCLI();
  cli.run().catch(error => {
    console.error('❌ CLI运行失败:', error.message);
    process.exit(1);
  });
}

module.exports = DashboardCLI;