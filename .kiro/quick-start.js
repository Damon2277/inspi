#!/usr/bin/env node

/**
 * 项目管理规则增强系统 - 快速启动脚本
 * 提供选择性系统启用功能和基础环境检查
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProjectManagementQuickStart {
  constructor() {
    this.rootDir = process.cwd();
    this.kiroDir = path.join(this.rootDir, '.kiro');
    this.availableSystems = {
      'project-state': {
        name: '项目状态管理系统',
        description: '跟踪功能开发状态，防止状态混乱',
        path: path.join(this.kiroDir, 'project-state'),
        requirements: ['1.1', '1.2', '1.3', '1.4'],
        dependencies: []
      },
      'style-recovery': {
        name: '样式版本控制系统',
        description: '管理样式快照，提供回滚功能',
        path: path.join(this.kiroDir, 'style-recovery'),
        requirements: ['2.1', '2.2', '2.3', '2.4'],
        dependencies: ['playwright']
      },
      'workflow-rules': {
        name: '开发流程规范引擎',
        description: '强制执行开发流程和预提交检查',
        path: path.join(this.kiroDir, 'workflow-rules'),
        requirements: ['3.1', '3.2', '3.3'],
        dependencies: []
      },
      'quality-checks': {
        name: '自动化质量检查系统',
        description: '监控代码质量和功能完整性',
        path: path.join(this.kiroDir, 'quality-checks'),
        requirements: ['4.1', '4.2', '4.3', '4.4'],
        dependencies: ['jest']
      },
      'recovery-points': {
        name: '项目恢复和回滚系统',
        description: '创建恢复点，提供智能回滚功能',
        path: path.join(this.kiroDir, 'recovery-points'),
        requirements: ['5.1', '5.2', '5.3', '5.4'],
        dependencies: []
      },
      'dashboard': {
        name: '开发者仪表板',
        description: '项目健康监控和一键操作工具',
        path: path.join(this.kiroDir, 'dashboard'),
        requirements: ['1.1', '4.3', '4.4', '2.3', '5.1'],
        dependencies: ['express']
      }
    };
  }

  // 基础环境检查
  async checkEnvironment() {
    console.log('🔍 执行基础环境检查...\n');
    
    const checks = [];
    
    // 检查 Node.js 版本
    try {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      checks.push({
        name: 'Node.js 版本',
        status: majorVersion >= 16 ? 'pass' : 'fail',
        message: `当前版本: ${nodeVersion} ${majorVersion >= 16 ? '✅' : '❌ (需要 >= 16.0.0)'}`
      });
    } catch (error) {
      checks.push({
        name: 'Node.js 版本',
        status: 'fail',
        message: '❌ 无法检测 Node.js 版本'
      });
    }

    // 检查 npm/yarn
    try {
      execSync('npm --version', { stdio: 'pipe' });
      checks.push({
        name: '包管理器',
        status: 'pass',
        message: '✅ npm 可用'
      });
    } catch (error) {
      checks.push({
        name: '包管理器',
        status: 'fail',
        message: '❌ npm 不可用'
      });
    }

    // 检查 .kiro 目录
    checks.push({
      name: '.kiro 目录',
      status: fs.existsSync(this.kiroDir) ? 'pass' : 'fail',
      message: fs.existsSync(this.kiroDir) ? '✅ .kiro 目录存在' : '❌ .kiro 目录不存在'
    });

    // 检查 Git 仓库
    try {
      execSync('git status', { stdio: 'pipe', cwd: this.rootDir });
      checks.push({
        name: 'Git 仓库',
        status: 'pass',
        message: '✅ Git 仓库已初始化'
      });
    } catch (error) {
      checks.push({
        name: 'Git 仓库',
        status: 'fail',
        message: '❌ 不是 Git 仓库或 Git 不可用'
      });
    }

    // 检查项目结构
    const projectFiles = ['package.json', 'README.md'];
    const existingFiles = projectFiles.filter(file => 
      fs.existsSync(path.join(this.rootDir, file))
    );
    
    checks.push({
      name: '项目结构',
      status: existingFiles.length >= 1 ? 'pass' : 'warning',
      message: `${existingFiles.length >= 1 ? '✅' : '⚠️'} 找到 ${existingFiles.length}/${projectFiles.length} 个核心文件`
    });

    // 显示检查结果
    checks.forEach(check => {
      console.log(`${check.name}: ${check.message}`);
    });

    const failedChecks = checks.filter(check => check.status === 'fail');
    const warningChecks = checks.filter(check => check.status === 'warning');

    console.log('\n📊 环境检查总结:');
    console.log(`✅ 通过: ${checks.filter(c => c.status === 'pass').length}`);
    console.log(`⚠️ 警告: ${warningChecks.length}`);
    console.log(`❌ 失败: ${failedChecks.length}`);

    if (failedChecks.length > 0) {
      console.log('\n⚠️ 发现环境问题，建议修复后再继续。');
      return false;
    }

    if (warningChecks.length > 0) {
      console.log('\n⚠️ 存在警告项，但可以继续。');
    }

    console.log('\n✅ 环境检查完成！\n');
    return true;
  }

  // 显示可用系统
  displayAvailableSystems() {
    console.log('📋 可用的项目管理系统:\n');
    
    Object.entries(this.availableSystems).forEach(([key, system], index) => {
      const isInstalled = fs.existsSync(system.path);
      const status = isInstalled ? '✅ 已安装' : '⚪ 未安装';
      
      console.log(`${index + 1}. ${system.name}`);
      console.log(`   描述: ${system.description}`);
      console.log(`   状态: ${status}`);
      console.log(`   需求: ${system.requirements.join(', ')}`);
      if (system.dependencies.length > 0) {
        console.log(`   依赖: ${system.dependencies.join(', ')}`);
      }
      console.log('');
    });
  }

  // 检查系统依赖
  async checkSystemDependencies(systemKey) {
    const system = this.availableSystems[systemKey];
    if (!system || !system.dependencies.length) return true;

    console.log(`🔍 检查 ${system.name} 的依赖...\n`);
    
    for (const dep of system.dependencies) {
      try {
        switch (dep) {
          case 'playwright':
            execSync('npx playwright --version', { stdio: 'pipe' });
            console.log(`✅ ${dep} 可用`);
            break;
          case 'jest':
            execSync('npx jest --version', { stdio: 'pipe' });
            console.log(`✅ ${dep} 可用`);
            break;
          case 'express':
            require.resolve('express');
            console.log(`✅ ${dep} 可用`);
            break;
          default:
            console.log(`⚠️ 未知依赖: ${dep}`);
        }
      } catch (error) {
        console.log(`❌ ${dep} 不可用`);
        console.log(`   建议安装: npm install ${dep}`);
        return false;
      }
    }
    
    console.log('');
    return true;
  }

  // 启用系统
  async enableSystem(systemKey) {
    const system = this.availableSystems[systemKey];
    if (!system) {
      console.log(`❌ 未知系统: ${systemKey}`);
      process.exit(1);
    }

    console.log(`🚀 启用 ${system.name}...\n`);

    // 检查依赖
    const depsOk = await this.checkSystemDependencies(systemKey);
    if (!depsOk) {
      console.log(`❌ 依赖检查失败，无法启用 ${system.name}`);
      return false;
    }

    // 检查系统是否已存在
    if (fs.existsSync(system.path)) {
      console.log(`✅ ${system.name} 已经安装`);
      
      // 尝试运行系统测试
      try {
        const testFile = path.join(system.path, 'test-system.js');
        if (fs.existsSync(testFile)) {
          console.log('🧪 运行系统测试...');
          execSync(`node "${testFile}"`, { stdio: 'inherit', cwd: system.path });
          console.log(`✅ ${system.name} 测试通过`);
        }
      } catch (error) {
        console.log(`⚠️ ${system.name} 测试失败，但系统已安装`);
      }
      
      return true;
    }

    console.log(`⚠️ ${system.name} 尚未安装`);
    console.log(`   路径: ${system.path}`);
    console.log(`   请参考项目文档进行安装配置`);
    
    return false;
  }

  // 创建基础配置
  createBaseConfig() {
    console.log('⚙️ 创建基础配置...\n');
    
    // 确保 .kiro 目录存在
    if (!fs.existsSync(this.kiroDir)) {
      fs.mkdirSync(this.kiroDir, { recursive: true });
      console.log('✅ 创建 .kiro 目录');
    }

    // 创建基础配置文件
    const configPath = path.join(this.kiroDir, 'quick-start-config.json');
    const config = {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      enabledSystems: [],
      lastCheck: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        cwd: this.rootDir
      }
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('✅ 创建快速启动配置文件');

    // 创建使用说明
    const readmePath = path.join(this.kiroDir, 'QUICK_START_README.md');
    const readmeContent = `# 项目管理规则增强系统 - 快速启动指南

## 概述

本系统提供了一套完整的项目管理规则和开发流程增强工具，帮助解决开发过程中的常见问题。

## 可用系统

${Object.entries(this.availableSystems).map(([key, system]) => `
### ${system.name}
- **描述**: ${system.description}
- **需求**: ${system.requirements.join(', ')}
- **路径**: \`${system.path}\`
${system.dependencies.length > 0 ? `- **依赖**: ${system.dependencies.join(', ')}` : ''}
`).join('')}

## 使用方法

1. 运行环境检查:
   \`\`\`bash
   node .kiro/quick-start.js --check
   \`\`\`

2. 查看可用系统:
   \`\`\`bash
   node .kiro/quick-start.js --list
   \`\`\`

3. 启用特定系统:
   \`\`\`bash
   node .kiro/quick-start.js --enable <system-name>
   \`\`\`

4. 启用所有系统:
   \`\`\`bash
   node .kiro/quick-start.js --enable-all
   \`\`\`

## 系统要求

- Node.js >= 16.0.0
- npm 或 yarn
- Git 仓库
- 相关依赖包 (根据启用的系统而定)

## 故障排除

如果遇到问题，请：
1. 检查 Node.js 版本
2. 确保所有依赖已安装
3. 验证 Git 仓库状态
4. 查看系统日志文件

更多信息请参考主项目文档。
`;

    fs.writeFileSync(readmePath, readmeContent);
    console.log('✅ 创建快速启动说明文档');
    console.log('');
  }

  // 主执行函数
  async run() {
    const args = process.argv.slice(2);
    
    console.log('🚀 项目管理规则增强系统 - 快速启动\n');

    // 解析命令行参数
    if (args.includes('--help') || args.includes('-h')) {
      this.showHelp();
      return;
    }

    if (args.includes('--check')) {
      await this.checkEnvironment();
      return;
    }

    if (args.includes('--list')) {
      this.displayAvailableSystems();
      return;
    }

    const enableIndex = args.findIndex(arg => arg === '--enable');
    if (enableIndex !== -1 && args[enableIndex + 1]) {
      const systemKey = args[enableIndex + 1];
      await this.checkEnvironment();
      await this.enableSystem(systemKey);
      return;
    }

    if (args.includes('--enable-all')) {
      await this.checkEnvironment();
      console.log('🚀 启用所有可用系统...\n');
      
      for (const systemKey of Object.keys(this.availableSystems)) {
        await this.enableSystem(systemKey);
        console.log('');
      }
      return;
    }

    if (args.includes('--init')) {
      await this.checkEnvironment();
      this.createBaseConfig();
      return;
    }

    // 默认交互模式
    await this.interactiveMode();
  }

  // 交互模式
  async interactiveMode() {
    console.log('🎯 交互模式启动\n');
    
    // 执行环境检查
    const envOk = await this.checkEnvironment();
    if (!envOk) {
      console.log('❌ 环境检查失败，请修复问题后重试。');
      return;
    }

    // 显示可用系统
    this.displayAvailableSystems();

    console.log('💡 使用提示:');
    console.log('- 使用 --enable <system-name> 启用特定系统');
    console.log('- 使用 --enable-all 启用所有系统');
    console.log('- 使用 --check 仅执行环境检查');
    console.log('- 使用 --init 创建基础配置');
    console.log('- 使用 --help 查看完整帮助');
    console.log('\n示例: node .kiro/quick-start.js --enable project-state');
  }

  // 显示帮助信息
  showHelp() {
    console.log(`
项目管理规则增强系统 - 快速启动脚本

用法:
  node .kiro/quick-start.js [选项]

选项:
  --help, -h          显示此帮助信息
  --check             执行基础环境检查
  --list              显示所有可用系统
  --enable <system>   启用指定系统
  --enable-all        启用所有可用系统
  --init              创建基础配置文件

可用系统:
${Object.entries(this.availableSystems).map(([key, system]) => 
  `  ${key.padEnd(20)} ${system.name}`
).join('\n')}

示例:
  node .kiro/quick-start.js --check
  node .kiro/quick-start.js --enable project-state
  node .kiro/quick-start.js --enable-all
  node .kiro/quick-start.js --init

更多信息请参考 .kiro/QUICK_START_README.md
`);
  }
}

// 执行脚本
if (require.main === module) {
  const quickStart = new ProjectManagementQuickStart();
  quickStart.run().catch(error => {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  });
}

module.exports = ProjectManagementQuickStart;