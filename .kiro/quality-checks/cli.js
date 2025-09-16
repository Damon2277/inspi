#!/usr/bin/env node

/**
 * 质量检查系统命令行工具
 */

const QualityCheckSystem = require('./index');
const path = require('path');

// 解析命令行参数
const args = process.argv.slice(2);
const command = args[0] || 'check';

// 配置选项
const config = {
  projectRoot: process.cwd(),
  enableCodeQuality: true,
  enableFunctionalValidation: true,
  enableIntelligentWarnings: true,
  reportingEnabled: true
};

// 解析额外参数
args.forEach((arg, index) => {
  if (arg === '--no-code-quality') {
    config.enableCodeQuality = false;
  } else if (arg === '--no-functional') {
    config.enableFunctionalValidation = false;
  } else if (arg === '--no-warnings') {
    config.enableIntelligentWarnings = false;
  } else if (arg === '--no-reports') {
    config.reportingEnabled = false;
  } else if (arg === '--pre-commit') {
    config.mode = 'pre-commit';
  }
});

async function main() {
  const qualitySystem = new QualityCheckSystem(config);

  try {
    switch (command) {
      case 'check':
      case 'run':
        console.log('🚀 Starting quality check system...\n');
        const results = await qualitySystem.runFullQualityCheck();
        
        console.log(`\n📊 Quality Check Complete`);
        console.log(`Overall Status: ${results.overallStatus.toUpperCase()}`);
        
        if (results.overallStatus === 'failed') {
          process.exit(1);
        }
        break;

      case 'pre-commit':
        console.log('🔍 Running pre-commit quality checks...\n');
        await qualitySystem.runPreCommitChecks();
        break;

      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Quality check failed:', error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
📊 Quality Check System CLI

Usage:
  node .kiro/quality-checks/cli.js [command] [options]

Commands:
  check, run     Run full quality check (default)
  pre-commit     Run pre-commit quality checks
  help           Show this help message

Options:
  --no-code-quality      Skip code quality checks
  --no-functional        Skip functional validation
  --no-warnings          Skip intelligent warnings
  --no-reports           Skip report generation
  --pre-commit           Run in pre-commit mode (fail fast)

Examples:
  node .kiro/quality-checks/cli.js
  node .kiro/quality-checks/cli.js check
  node .kiro/quality-checks/cli.js pre-commit
  node .kiro/quality-checks/cli.js check --no-warnings
`);
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { main, showHelp };