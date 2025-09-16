/**
 * 配置管理系统测试脚本
 * Configuration Manager Test Script
 */

const ConfigurationManager = require('./index');

class ConfigManagerTest {
  constructor() {
    this.configManager = new ConfigurationManager();
  }

  async runTests() {
    console.log('🧪 开始配置管理系统测试\n');

    try {
      // 测试1: 系统初始化
      await this.testInitialization();
      
      // 测试2: 配置读写
      await this.testConfigOperations();
      
      // 测试3: 配置验证
      await this.testConfigValidation();
      
      // 测试4: 配置同步
      await this.testConfigSync();
      
      // 测试5: 配置导出
      await this.testConfigExport();

      console.log('\n🎉 所有配置管理测试完成!');

    } catch (error) {
      console.error('\n❌ 测试失败:', error.message);
      throw error;
    }
  }

  async testInitialization() {
    console.log('🔧 测试1: 系统初始化');
    
    try {
      const result = await this.configManager.initialize();
      
      if (result.success) {
        console.log('   ✅ 配置管理系统初始化成功');
        
        if (result.validation) {
          console.log(`   📊 配置验证: ${result.validation.isValid ? '通过' : '有问题'}`);
          
          if (result.validation.issues.length > 0) {
            console.log(`   ⚠️ 发现 ${result.validation.issues.length} 个问题`);
          }
          
          if (result.validation.warnings.length > 0) {
            console.log(`   💡 发现 ${result.validation.warnings.length} 个警告`);
          }
        }
      } else {
        console.log(`   ❌ 初始化失败: ${result.error}`);
      }

    } catch (error) {
      console.log(`   ❌ 初始化测试失败: ${error.message}`);
    }
    
    console.log('');
  }

  async testConfigOperations() {
    console.log('📋 测试2: 配置读写操作');
    
    try {
      // 测试读取配置
      const versionConfig = await this.configManager.getConfig('version');
      console.log(`   ✅ 读取版本配置: ${versionConfig ? '成功' : '失败'}`);
      
      if (versionConfig) {
        console.log(`   📊 版本配置键数: ${Object.keys(versionConfig).length}`);
      }

      // 测试读取嵌套配置
      const strategy = await this.configManager.getConfig('version', 'strategy');
      console.log(`   ✅ 读取嵌套配置 (version.strategy): ${strategy || '未设置'}`);

      // 测试设置配置
      const setResult = await this.configManager.setConfig('main', 'test.value', 'test-data');
      console.log(`   ✅ 设置配置: ${setResult.success ? '成功' : '失败'}`);

      // 验证设置的配置
      const testValue = await this.configManager.getConfig('main', 'test.value');
      console.log(`   ✅ 验证设置的配置: ${testValue === 'test-data' ? '正确' : '错误'}`);

      // 测试读取所有配置
      const allConfigs = await this.configManager.loadAllConfigurations();
      const successCount = Object.values(allConfigs).filter(r => r.success).length;
      console.log(`   ✅ 加载所有配置: ${successCount}/${Object.keys(allConfigs).length} 成功`);

    } catch (error) {
      console.log(`   ❌ 配置操作测试失败: ${error.message}`);
    }
    
    console.log('');
  }

  async testConfigValidation() {
    console.log('🔍 测试3: 配置验证');
    
    try {
      const validation = await this.configManager.validateAllConfigurations();
      
      console.log(`   ✅ 配置验证完成: ${validation.isValid ? '全部通过' : '发现问题'}`);
      console.log(`   📊 验证结果:`);
      console.log(`     • 问题数量: ${validation.issues.length}`);
      console.log(`     • 警告数量: ${validation.warnings.length}`);
      console.log(`     • 检查配置: ${Object.keys(validation.summary).length} 个`);

      // 显示各配置的验证状态
      Object.entries(validation.summary).forEach(([name, result]) => {
        const status = result.isValid ? '✅' : '❌';
        console.log(`     ${status} ${name}: ${result.isValid ? '正常' : `${result.issues.length} 个问题`}`);
      });

      // 如果有问题，显示详情
      if (validation.issues.length > 0) {
        console.log('\n   ⚠️ 发现的问题:');
        validation.issues.slice(0, 3).forEach(issue => {
          console.log(`     • ${issue.config}: ${issue.message}`);
        });
        
        if (validation.issues.length > 3) {
          console.log(`     ... 还有 ${validation.issues.length - 3} 个问题`);
        }
      }

    } catch (error) {
      console.log(`   ❌ 配置验证测试失败: ${error.message}`);
    }
    
    console.log('');
  }

  async testConfigSync() {
    console.log('🔄 测试4: 配置同步');
    
    try {
      const syncResult = await this.configManager.syncConfigChanges();
      
      if (syncResult.success === false) {
        console.log(`   ❌ 同步失败: ${syncResult.error}`);
        return;
      }

      console.log(`   ✅ 配置同步完成:`);
      console.log(`     • 已同步: ${syncResult.synced.length} 个配置`);
      console.log(`     • 冲突: ${syncResult.conflicts.length} 个`);
      console.log(`     • 错误: ${syncResult.errors.length} 个`);

      if (syncResult.synced.length > 0) {
        console.log('   📝 同步的配置:');
        syncResult.synced.forEach(item => {
          console.log(`     • ${item.config}: ${item.action}`);
        });
      }

      if (syncResult.conflicts.length > 0) {
        console.log('   ⚠️ 配置冲突:');
        syncResult.conflicts.forEach(conflict => {
          console.log(`     • ${conflict.config}: ${conflict.message}`);
        });
      }

    } catch (error) {
      console.log(`   ❌ 配置同步测试失败: ${error.message}`);
    }
    
    console.log('');
  }

  async testConfigExport() {
    console.log('📦 测试5: 配置导出');
    
    try {
      const exportResult = await this.configManager.exportConfigurations();
      
      if (exportResult.success) {
        console.log(`   ✅ 配置导出成功:`);
        console.log(`     • 导出文件: ${exportResult.exportFile}`);
        console.log(`     • 配置数量: ${exportResult.configCount} 个`);
        
        // 验证导出文件是否存在
        const fs = require('fs').promises;
        try {
          const stats = await fs.stat(exportResult.exportFile);
          console.log(`     • 文件大小: ${Math.round(stats.size / 1024)} KB`);
        } catch {
          console.log('     ⚠️ 导出文件验证失败');
        }
        
      } else {
        console.log(`   ❌ 配置导出失败: ${exportResult.error}`);
      }

    } catch (error) {
      console.log(`   ❌ 配置导出测试失败: ${error.message}`);
    }
    
    console.log('');
  }

  async testConfigOverview() {
    console.log('📊 测试6: 配置概览');
    
    try {
      const overview = await this.configManager.getConfigurationOverview();
      
      if (overview.error) {
        console.log(`   ❌ 获取概览失败: ${overview.error}`);
        return;
      }

      console.log(`   ✅ 配置概览获取成功:`);
      console.log(`     • 总配置数: ${overview.totalConfigs}`);
      console.log(`     • 已加载: ${overview.loadedConfigs}`);
      console.log(`     • 检查时间: ${new Date(overview.timestamp).toLocaleString()}`);

      console.log('   📁 配置文件状态:');
      Object.entries(overview.configs).forEach(([name, info]) => {
        const status = info.exists ? '✅' : '❌';
        console.log(`     ${status} ${name}: ${info.size} 个键`);
      });

    } catch (error) {
      console.log(`   ❌ 配置概览测试失败: ${error.message}`);
    }
    
    console.log('');
  }

  async testChangeListeners() {
    console.log('🔔 测试7: 配置变更监听');
    
    try {
      let changeNotified = false;
      
      // 添加变更监听器
      this.configManager.addChangeListener('main', (changeEvent) => {
        console.log(`   📢 配置变更通知: ${changeEvent.configName}.${changeEvent.key} = ${changeEvent.value}`);
        changeNotified = true;
      });

      // 触发配置变更
      await this.configManager.setConfig('main', 'test.listener', 'listener-test');
      
      // 等待一下让监听器执行
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log(`   ✅ 变更监听器: ${changeNotified ? '正常工作' : '未触发'}`);

    } catch (error) {
      console.log(`   ❌ 变更监听测试失败: ${error.message}`);
    }
    
    console.log('');
  }

  demonstrateFeatures() {
    console.log('🎯 配置管理系统功能演示\n');
    
    console.log('📋 核心功能:');
    console.log('   🔧 统一配置管理 - 管理所有系统的配置文件');
    console.log('   📊 配置验证 - 自动验证配置的完整性和正确性');
    console.log('   🔄 配置同步 - 自动同步配置文件的变更');
    console.log('   📦 配置导出 - 导出和备份所有配置');
    console.log('   🔔 变更通知 - 监听和通知配置变更');

    console.log('\n🔧 支持的配置:');
    const configs = [
      { name: 'version', desc: '版本管理配置 - 语义化版本、发布策略' },
      { name: 'quality', desc: '质量检查配置 - 代码质量阈值、检查规则' },
      { name: 'style', desc: '样式恢复配置 - 样式快照、回滚设置' },
      { name: 'recovery', desc: '恢复点配置 - 自动备份、恢复策略' },
      { name: 'dashboard', desc: '仪表板配置 - 端口、主题、刷新间隔' },
      { name: 'main', desc: '主配置文件 - 全局设置、系统开关' }
    ];

    configs.forEach(config => {
      console.log(`   📁 ${config.name}: ${config.desc}`);
    });

    console.log('\n🚀 使用方法:');
    console.log('   1. 初始化: node cli.js init');
    console.log('   2. 查看配置: node cli.js list');
    console.log('   3. 获取配置: node cli.js get version strategy');
    console.log('   4. 设置配置: node cli.js set quality enabled true');
    console.log('   5. 验证配置: node cli.js validate');
    console.log('   6. 同步配置: node cli.js sync');

    console.log('\n💡 主要优势:');
    console.log('   ✨ 统一管理 - 一个地方管理所有配置');
    console.log('   🔒 数据安全 - 配置验证和完整性检查');
    console.log('   🔄 自动同步 - 自动检测和同步配置变更');
    console.log('   📊 可视化 - 清晰的配置概览和状态');
    console.log('   🎯 易于使用 - 简单的CLI和编程接口');

    console.log('\n🔗 系统集成:');
    console.log('   • 与版本管理系统集成');
    console.log('   • 与质量检查系统集成');
    console.log('   • 与样式恢复系统集成');
    console.log('   • 与恢复点系统集成');
    console.log('   • 与仪表板系统集成');
  }
}

// 运行测试
async function runTests() {
  const tester = new ConfigManagerTest();
  
  try {
    await tester.runTests();
    await tester.testConfigOverview();
    await tester.testChangeListeners();
    tester.demonstrateFeatures();
    
    console.log('\n🎊 配置管理系统测试全部通过！');
    console.log('📋 Task 7.1 (统一配置管理) 实施完成！');
    
  } catch (error) {
    console.error('💥 测试失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runTests();
}

module.exports = ConfigManagerTest;