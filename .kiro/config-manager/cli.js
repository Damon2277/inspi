#!/usr/bin/env node

/**
 * 配置管理 CLI
 * Configuration Manager CLI
 */

const ConfigurationManager = require('./index');

class ConfigManagerCLI {
  constructor() {
    this.configManager = new ConfigurationManager();
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0];

    try {
      switch (command) {
        case 'init':
          await this.initConfig();
          break;
        case 'get':
          await this.getConfig(args[1], args[2]);
          break;
        case 'set':
          await this.setConfig(args[1], args[2], args[3]);
          break;
        case 'list':
          await this.listConfigs();
          break;
        case 'validate':
          await this.validateConfigs();
          break;
        case 'sync':
          await this.syncConfigs();
          break;
        case 'export':
          await this.exportConfigs(args[1]);
          break;
        case 'overview':
          await this.showOverview();
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

  async initConfig() {
    console.log('🔧 初始化配置管理系统...');
    
    const result = await this.configManager.initialize();
    
    if (result.success) {
      console.log('✅ 配置管理系统初始化成功!');
      
      if (result.validation && !result.validation.isValid) {
        console.log('\n⚠️ 配置验证发现问题:');
        result.validation.issues.forEach(issue => {
          console.log(`  • ${issue.config}: ${issue.message}`);
        });
      }
      
      if (result.validation && result.validation.warnings.length > 0) {
        console.log('\n💡 配置警告:');
        result.validation.warnings.forEach(warning => {
          console.log(`  • ${warning.config}: ${warning.message}`);
        });
      }
    } else {
      console.error(`❌ 初始化失败: ${result.error}`);
      process.exit(1);
    }
  }

  async getConfig(configName, key) {
    if (!configName) {
      console.error('❌ 请指定配置名称');
      console.log('用法: get <配置名> [键名]');
      return;
    }

    await this.configManager.initialize();
    
    const value = await this.configManager.getConfig(configName, key);
    
    if (value !== null) {
      console.log(`📋 ${configName}${key ? `.${key}` : ''}:`);
      console.log(JSON.stringify(value, null, 2));
    } else {
      console.log(`❌ 配置不存在: ${configName}${key ? `.${key}` : ''}`);
    }
  }

  async setConfig(configName, key, value) {
    if (!configName || !key || value === undefined) {
      console.error('❌ 请提供完整的参数');
      console.log('用法: set <配置名> <键名> <值>');
      return;
    }

    await this.configManager.initialize();
    
    // 尝试解析JSON值
    let parsedValue;
    try {
      parsedValue = JSON.parse(value);
    } catch {
      parsedValue = value; // 保持字符串值
    }

    const result = await this.configManager.setConfig(configName, key, parsedValue);
    
    if (result.success) {
      console.log(`✅ 配置已更新: ${configName}.${key} = ${JSON.stringify(parsedValue)}`);
    } else {
      console.error(`❌ 配置更新失败: ${result.error}`);
    }
  }

  async listConfigs() {
    console.log('📋 配置列表:');
    
    await this.configManager.initialize();
    
    const overview = await this.configManager.getConfigurationOverview();
    
    if (overview.error) {
      console.error(`❌ 获取配置列表失败: ${overview.error}`);
      return;
    }

    console.log(`\n📊 配置概览 (${overview.totalConfigs} 个配置):`);
    
    Object.entries(overview.configs).forEach(([name, info]) => {
      const status = info.exists ? '✅' : '❌';
      console.log(`${status} ${name}`);
      console.log(`   路径: ${info.path}`);
      console.log(`   大小: ${info.size} 个键`);
      console.log(`   更新: ${info.lastUpdated}`);
      console.log('');
    });
  }

  async validateConfigs() {
    console.log('🔍 验证所有配置...');
    
    await this.configManager.initialize();
    
    const validation = await this.configManager.validateAllConfigurations();
    
    console.log(`\n📊 验证结果: ${validation.isValid ? '✅ 通过' : '❌ 失败'}`);
    
    if (validation.issues.length > 0) {
      console.log('\n❌ 发现问题:');
      validation.issues.forEach(issue => {
        console.log(`  • ${issue.config}: ${issue.message}`);
      });
    }
    
    if (validation.warnings.length > 0) {
      console.log('\n⚠️ 警告信息:');
      validation.warnings.forEach(warning => {
        console.log(`  • ${warning.config}: ${warning.message}`);
      });
    }

    console.log('\n📋 各配置详情:');
    Object.entries(validation.summary).forEach(([name, result]) => {
      const status = result.isValid ? '✅' : '❌';
      console.log(`${status} ${name}: ${result.isValid ? '正常' : `${result.issues.length} 个问题`}`);
    });
  }

  async syncConfigs() {
    console.log('🔄 同步配置变更...');
    
    await this.configManager.initialize();
    
    const syncResult = await this.configManager.syncConfigChanges();
    
    if (syncResult.success === false) {
      console.error(`❌ 同步失败: ${syncResult.error}`);
      return;
    }

    console.log(`✅ 同步完成:`);
    console.log(`  📝 已同步: ${syncResult.synced.length} 个配置`);
    console.log(`  ⚠️ 冲突: ${syncResult.conflicts.length} 个`);
    console.log(`  ❌ 错误: ${syncResult.errors.length} 个`);

    if (syncResult.synced.length > 0) {
      console.log('\n📝 已同步的配置:');
      syncResult.synced.forEach(item => {
        console.log(`  • ${item.config}: ${item.action}`);
      });
    }

    if (syncResult.conflicts.length > 0) {
      console.log('\n⚠️ 配置冲突:');
      syncResult.conflicts.forEach(conflict => {
        console.log(`  • ${conflict.config}: ${conflict.message}`);
      });
    }

    if (syncResult.errors.length > 0) {
      console.log('\n❌ 同步错误:');
      syncResult.errors.forEach(error => {
        console.log(`  • ${error.config}: ${error.error}`);
      });
    }
  }

  async exportConfigs(exportPath) {
    console.log('📦 导出所有配置...');
    
    await this.configManager.initialize();
    
    const result = await this.configManager.exportConfigurations(exportPath);
    
    if (result.success) {
      console.log(`✅ 配置导出成功:`);
      console.log(`  📁 文件: ${result.exportFile}`);
      console.log(`  📊 配置数: ${result.configCount} 个`);
    } else {
      console.error(`❌ 导出失败: ${result.error}`);
    }
  }

  async showOverview() {
    console.log('📊 配置系统概览');
    
    await this.configManager.initialize();
    
    const overview = await this.configManager.getConfigurationOverview();
    
    if (overview.error) {
      console.error(`❌ 获取概览失败: ${overview.error}`);
      return;
    }

    console.log(`\n🔧 配置管理系统状态:`);
    console.log(`  📋 总配置数: ${overview.totalConfigs}`);
    console.log(`  💾 已加载: ${overview.loadedConfigs}`);
    console.log(`  🕐 检查时间: ${new Date(overview.timestamp).toLocaleString()}`);

    console.log('\n📁 配置文件状态:');
    Object.entries(overview.configs).forEach(([name, info]) => {
      const status = info.exists ? '✅ 存在' : '❌ 缺失';
      console.log(`  ${name}: ${status} (${info.size} 个键)`);
    });

    // 显示系统集成状态
    console.log('\n🔗 系统集成状态:');
    const systems = ['version', 'quality', 'style', 'recovery', 'dashboard'];
    systems.forEach(system => {
      const config = overview.configs[system];
      const status = config && config.exists ? '🟢 正常' : '🔴 异常';
      console.log(`  ${system}: ${status}`);
    });
  }

  showHelp() {
    console.log(`
🔧 统一配置管理 CLI

用法: node cli.js <命令> [参数]

命令:
  init                     初始化配置管理系统
  get <配置名> [键名]       获取配置值
  set <配置名> <键名> <值>  设置配置值
  list                     列出所有配置
  validate                 验证所有配置
  sync                     同步配置变更
  export [路径]            导出所有配置
  overview                 显示系统概览
  help                     显示此帮助信息

配置名称:
  version                  版本管理配置
  quality                  质量检查配置
  style                    样式恢复配置
  recovery                 恢复点配置
  dashboard                仪表板配置
  main                     主配置文件

示例:
  node cli.js init                           # 初始化系统
  node cli.js get version strategy           # 获取版本策略
  node cli.js set quality enabled true      # 启用质量检查
  node cli.js list                          # 列出所有配置
  node cli.js validate                      # 验证配置
  node cli.js sync                          # 同步变更
  node cli.js export ./backup               # 导出配置

功能特性:
  📋 统一管理所有系统配置
  🔄 自动同步配置变更
  ✅ 配置验证和完整性检查
  📦 配置导出和备份
  🔔 配置变更通知
`);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const cli = new ConfigManagerCLI();
  cli.run().catch(error => {
    console.error('❌ CLI运行失败:', error.message);
    process.exit(1);
  });
}

module.exports = ConfigManagerCLI;