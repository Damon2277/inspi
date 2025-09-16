#!/usr/bin/env node

/**
 * 测试配置管理CLI工具
 * 用于管理和操作测试配置
 */

// Import modules directly since we're in CommonJS context
const { TestConfigManager } = require('../src/lib/testing/TestConfigManager');
const { TestEnvironment } = require('../src/lib/testing/TestEnvironment');
const { JestConfigGenerator } = require('../src/lib/testing/JestConfigGenerator');
const fs = require('fs');
const path = require('path');

class TestConfigCLI {
  constructor() {
    this.configManager = TestConfigManager.getInstance();
    this.environment = TestEnvironment.getInstance();
    this.jestGenerator = new JestConfigGenerator();
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0];

    try {
      switch (command) {
        case 'init':
          await this.initConfig();
          break;
        case 'validate':
          await this.validateConfig();
          break;
        case 'generate':
          await this.generateJestConfig(args[1]);
          break;
        case 'status':
          await this.showStatus();
          break;
        case 'health':
          await this.healthCheck();
          break;
        case 'reset':
          await this.resetConfig();
          break;
        case 'update':
          await this.updateConfig(args.slice(1));
          break;
        case 'help':
        default:
          this.showHelp();
          break;
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }

  async initConfig() {
    console.log('🚀 Initializing test configuration...');
    
    // 检查是否已存在配置文件
    const configPath = path.join(process.cwd(), 'test.config.json');
    if (fs.existsSync(configPath)) {
      console.log('⚠️  Configuration file already exists');
      return;
    }

    // 创建默认配置
    const config = this.configManager.getConfig();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    console.log('✅ Test configuration initialized');
    console.log(`   Config file: ${configPath}`);
  }

  async validateConfig() {
    console.log('🔍 Validating test configuration...');
    
    const validation = this.configManager.validateConfig();
    
    if (validation.valid) {
      console.log('✅ Configuration is valid');
    } else {
      console.log('❌ Configuration validation failed:');
      validation.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
      process.exit(1);
    }
  }

  async generateJestConfig(type = 'unit') {
    console.log(`🔧 Generating Jest configuration for ${type} tests...`);
    
    if (!['unit', 'integration', 'e2e'].includes(type)) {
      throw new Error('Invalid test type. Use: unit, integration, or e2e');
    }

    const options = {
      type,
      coverage: true,
      ci: process.env.CI === 'true',
    };

    const configPath = this.jestGenerator.generateConfigFile(options);
    console.log('✅ Jest configuration generated');
    console.log(`   Config file: ${configPath}`);
  }

  async showStatus() {
    console.log('📊 Test Configuration Status');
    console.log('================================');
    
    // 配置状态
    const config = this.configManager.getConfig();
    console.log(`Coverage Threshold: ${config.coverage.threshold.statements}%`);
    console.log(`Test Timeout: ${config.execution.timeout}ms`);
    console.log(`Max Workers: ${config.execution.maxWorkers}`);
    console.log(`Parallel Execution: ${config.execution.parallel ? 'Enabled' : 'Disabled'}`);
    
    // 环境状态
    const envStatus = this.environment.getStatus();
    console.log(`\nEnvironment: ${envStatus.environment.type}`);
    console.log(`Platform: ${envStatus.environment.platform}`);
    console.log(`Node Version: ${envStatus.environment.nodeVersion}`);
    console.log(`CPUs: ${envStatus.environment.cpus}`);
    console.log(`CI: ${envStatus.environment.ci ? 'Yes' : 'No'}`);
    console.log(`Docker: ${envStatus.environment.docker ? 'Yes' : 'No'}`);
    console.log(`Initialized: ${envStatus.initialized ? 'Yes' : 'No'}`);
    console.log(`Uptime: ${Math.round(envStatus.uptime)}s`);
  }

  async healthCheck() {
    console.log('🏥 Running health check...');
    
    try {
      const result = await this.environment.initialize();
      
      if (result.success) {
        console.log('✅ Environment initialization successful');
      } else {
        console.log('❌ Environment initialization failed:');
        result.errors.forEach(error => console.log(`   - ${error}`));
      }

      if (result.warnings.length > 0) {
        console.log('⚠️  Warnings:');
        result.warnings.forEach(warning => console.log(`   - ${warning}`));
      }

      const health = await this.environment.healthCheck();
      
      console.log('\n🔍 Health Check Results:');
      health.checks.forEach(check => {
        const status = check.status === 'pass' ? '✅' : '❌';
        console.log(`   ${status} ${check.name}${check.message ? ': ' + check.message : ''}`);
      });

      if (health.healthy) {
        console.log('\n🎉 All systems healthy!');
      } else {
        console.log('\n⚠️  Some systems are not healthy');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      process.exit(1);
    }
  }

  async resetConfig() {
    console.log('🔄 Resetting configuration to defaults...');
    
    this.configManager.resetToDefaults();
    
    console.log('✅ Configuration reset to defaults');
  }

  async updateConfig(args) {
    if (args.length < 2) {
      console.log('❌ Usage: update <key> <value>');
      console.log('   Example: update coverage.threshold.statements 95');
      return;
    }

    const key = args[0];
    const value = args[1];

    console.log(`🔧 Updating configuration: ${key} = ${value}`);

    try {
      // 解析嵌套键
      const keys = key.split('.');
      const updates = {};
      let current = updates;

      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = {};
        current = current[keys[i]];
      }

      // 尝试解析值类型
      let parsedValue = value;
      if (value === 'true') parsedValue = true;
      else if (value === 'false') parsedValue = false;
      else if (!isNaN(value)) parsedValue = Number(value);

      current[keys[keys.length - 1]] = parsedValue;

      this.configManager.updateConfig(updates);
      
      console.log('✅ Configuration updated');
    } catch (error) {
      console.error('❌ Failed to update configuration:', error.message);
      process.exit(1);
    }
  }

  showHelp() {
    console.log(`
🧪 Test Configuration Manager

Usage: node scripts/test-config-manager.js <command> [options]

Commands:
  init                    Initialize test configuration
  validate               Validate current configuration
  generate <type>        Generate Jest config (unit|integration|e2e)
  status                 Show configuration and environment status
  health                 Run health check
  reset                  Reset configuration to defaults
  update <key> <value>   Update configuration value
  help                   Show this help message

Examples:
  node scripts/test-config-manager.js init
  node scripts/test-config-manager.js generate unit
  node scripts/test-config-manager.js update coverage.threshold.statements 95
  node scripts/test-config-manager.js health
`);
  }
}

// 运行CLI
if (require.main === module) {
  const cli = new TestConfigCLI();
  cli.run().catch(error => {
    console.error('❌ CLI Error:', error);
    process.exit(1);
  });
}

module.exports = TestConfigCLI;