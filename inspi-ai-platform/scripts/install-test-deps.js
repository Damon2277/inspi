#!/usr/bin/env node
/**
 * 测试依赖安装脚本
 * 自动安装所有必需的测试依赖
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 开始安装测试依赖...')

// 检查package.json是否存在
const packageJsonPath = path.join(process.cwd(), 'package.json')
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ 未找到package.json文件')
  process.exit(1)
}

// 读取当前的package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

// 定义需要的测试依赖
const testDependencies = {
  '@types/jest': '^29.5.12',
  '@types/supertest': '^6.0.2',
  '@testing-library/user-event': '^14.5.2',
  'jest-environment-node': '^30.0.5',
  'mongodb-memory-server': '^10.1.2',
  'msw': '^2.6.8',
  'supertest': '^7.0.0',
  'ts-jest': '^29.2.5'
}

// 检查哪些依赖需要安装
const missingDeps = []
const currentDevDeps = packageJson.devDependencies || {}

for (const [dep, version] of Object.entries(testDependencies)) {
  if (!currentDevDeps[dep]) {
    missingDeps.push(`${dep}@${version}`)
  }
}

if (missingDeps.length === 0) {
  console.log('✅ 所有测试依赖已安装')
  process.exit(0)
}

console.log(`📦 需要安装 ${missingDeps.length} 个依赖:`)
missingDeps.forEach(dep => console.log(`  - ${dep}`))

try {
  // 安装缺失的依赖
  console.log('\n⏳ 正在安装依赖...')
  execSync(`npm install --save-dev ${missingDeps.join(' ')}`, {
    stdio: 'inherit',
    cwd: process.cwd()
  })
  
  console.log('\n✅ 测试依赖安装完成!')
  console.log('\n📋 可用的测试命令:')
  console.log('  npm run test          - 运行所有测试')
  console.log('  npm run test:unit     - 运行单元测试')
  console.log('  npm run test:integration - 运行集成测试')
  console.log('  npm run test:watch    - 监视模式运行测试')
  console.log('  npm run test:coverage - 运行测试并生成覆盖率报告')
  
} catch (error) {
  console.error('❌ 安装依赖时出错:', error.message)
  console.log('\n🔧 手动安装命令:')
  console.log(`npm install --save-dev ${missingDeps.join(' ')}`)
  process.exit(1)
}