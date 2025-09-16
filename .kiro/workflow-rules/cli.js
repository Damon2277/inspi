#!/usr/bin/env node

/**
 * 工作流程规范引擎 CLI
 * Workflow Rules Engine CLI
 */

const { program } = require('commander');
const PreCommitChecker = require('./pre-commit-checker');
const StageGateManager = require('./stage-gate-manager');
const WorkflowManager = require('./index');

program
  .name('workflow-rules')
  .description('开发流程规范引擎命令行工具')
  .version('1.0.0');

// 预提交检查命令
program
  .command('pre-commit')
  .description('运行预提交检查')
  .option('-v, --verbose', '详细输出')
  .option('-f, --fix', '自动修复可修复的问题')
  .action(async (options) => {
    try {
      console.log('🚀 启动预提交检查...\n');
      
      const checker = new PreCommitChecker();
      await checker.initialize();
      
      const results = await checker.runChecks();
      
      if (results.overall === 'failed') {
        console.log('\n❌ 预提交检查失败，请修复问题后重试');
        process.exit(1);
      } else if (results.overall === 'warning') {
        console.log('\n⚠️ 预提交检查完成，但有警告');
        process.exit(0);
      } else {
        console.log('\n✅ 预提交检查通过');
        process.exit(0);
      }
      
    } catch (error) {
      console.error('❌ 预提交检查执行失败:', error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// 阶段门控检查命令
program
  .command('stage-gate <stage>')
  .description('验证开发阶段门控')
  .option('-c, --context <context>', '提供上下文信息', '{}')
  .action(async (stage, options) => {
    try {
      console.log(`🔍 验证阶段门控: ${stage}\n`);
      
      const gateManager = new StageGateManager();
      await gateManager.initialize();
      
      const context = JSON.parse(options.context);
      const result = await gateManager.validateGate(stage, context);
      
      if (result.passed) {
        console.log(`✅ 阶段门控 "${stage}" 验证通过`);
        process.exit(0);
      } else {
        console.log(`❌ 阶段门控 "${stage}" 验证失败`);
        result.failures.forEach(failure => {
          console.log(`  - ${failure}`);
        });
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ 阶段门控验证失败:', error.message);
      process.exit(1);
    }
  });

// 初始化命令
program
  .command('init')
  .description('初始化工作流程规范引擎')
  .action(async () => {
    try {
      console.log('🔧 初始化工作流程规范引擎...\n');
      
      const manager = new WorkflowManager();
      await manager.initialize();
      
      console.log('✅ 工作流程规范引擎初始化完成');
      console.log('\n可用命令:');
      console.log('  workflow-rules pre-commit    # 运行预提交检查');
      console.log('  workflow-rules stage-gate    # 验证阶段门控');
      console.log('  workflow-rules status        # 查看系统状态');
      
    } catch (error) {
      console.error('❌ 初始化失败:', error.message);
      process.exit(1);
    }
  });

// 状态查看命令
program
  .command('status')
  .description('查看工作流程规范引擎状态')
  .action(async () => {
    try {
      console.log('📊 工作流程规范引擎状态\n');
      
      // 检查配置文件
      const fs = require('fs').promises;
      
      try {
        await fs.access('.kiro/workflow-rules/pre-commit-config.json');
        console.log('✅ 预提交检查配置: 已配置');
      } catch {
        console.log('❌ 预提交检查配置: 未配置');
      }
      
      try {
        await fs.access('.kiro/workflow-rules/stage-gate-config.json');
        console.log('✅ 阶段门控配置: 已配置');
      } catch {
        console.log('❌ 阶段门控配置: 未配置');
      }
      
      // 检查最近的检查结果
      try {
        const resultsData = await fs.readFile('.kiro/workflow-rules/check-results.json', 'utf8');
        const results = JSON.parse(resultsData);
        console.log(`\n📋 最近检查结果:`);
        console.log(`  时间: ${new Date(results.timestamp).toLocaleString()}`);
        console.log(`  状态: ${results.overall}`);
        console.log(`  通过: ${results.summary.passed}`);
        console.log(`  失败: ${results.summary.failed}`);
        console.log(`  警告: ${results.summary.warnings}`);
      } catch {
        console.log('\n📋 最近检查结果: 无');
      }
      
    } catch (error) {
      console.error('❌ 获取状态失败:', error.message);
      process.exit(1);
    }
  });

// 配置命令
program
  .command('config')
  .description('配置工作流程规范引擎')
  .option('--show', '显示当前配置')
  .option('--edit', '编辑配置文件')
  .action(async (options) => {
    try {
      const fs = require('fs').promises;
      
      if (options.show) {
        console.log('📋 当前配置:\n');
        
        try {
          const configData = await fs.readFile('.kiro/workflow-rules/pre-commit-config.json', 'utf8');
          const config = JSON.parse(configData);
          console.log('预提交检查配置:');
          console.log(JSON.stringify(config, null, 2));
        } catch {
          console.log('预提交检查配置: 未找到');
        }
        
      } else if (options.edit) {
        console.log('📝 请手动编辑配置文件:');
        console.log('  预提交检查: .kiro/workflow-rules/pre-commit-config.json');
        console.log('  阶段门控: .kiro/workflow-rules/stage-gate-config.json');
        
      } else {
        console.log('请使用 --show 或 --edit 选项');
      }
      
    } catch (error) {
      console.error('❌ 配置操作失败:', error.message);
      process.exit(1);
    }
  });

program.parse();