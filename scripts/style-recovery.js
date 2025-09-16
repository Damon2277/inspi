#!/usr/bin/env node

/**
 * Style Recovery System Integration Script
 * 样式恢复系统集成脚本
 */

const { spawn } = require('child_process');
const path = require('path');

const cliPath = path.join(__dirname, '../.kiro/style-recovery/cli.js');
const projectRoot = path.join(__dirname, '..');

// 传递所有参数给CLI，并设置正确的项目根目录
const args = process.argv.slice(2);
args.push('-p', projectRoot);

const child = spawn('node', [cliPath, ...args], {
  stdio: 'inherit',
  cwd: path.dirname(cliPath)
});

child.on('exit', (code) => {
  process.exit(code);
});