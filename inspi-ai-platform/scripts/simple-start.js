#!/usr/bin/env node

/**
 * 简化的测试环境启动脚本
 * 专注于快速启动开发服务器
 */

const { spawn } = require('child_process')
const { exec } = require('child_process')

console.log('🚀 启动 inspi-ai-platform 测试环境...\n')

// 查找可用端口
function findAvailablePort(startPort = 3000) {
  return new Promise((resolve) => {
    const checkPort = (port) => {
      exec(`lsof -ti:${port}`, (error) => {
        if (error) {
          // 端口可用
          resolve(port)
        } else {
          // 端口被占用，检查下一个
          checkPort(port + 1)
        }
      })
    }
    checkPort(startPort)
  })
}

// 启动开发服务器
async function startDevServer() {
  try {
    const port = await findAvailablePort(3000)
    console.log(`📡 使用端口: ${port}`)
    
    console.log('🌐 启动 Next.js 开发服务器...')
    
    const app = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: port.toString(),
        NODE_ENV: 'development'
      }
    })
    
    // 等待一段时间让服务器启动
    setTimeout(() => {
      console.log('\n🎉 测试环境启动完成!')
      console.log(`📊 测试仪表板: http://localhost:${port}/test-dashboard`)
      console.log(`🏠 主页: http://localhost:${port}`)
      console.log(`🔍 API健康检查: http://localhost:${port}/api/health`)
      console.log(`📈 测试状态API: http://localhost:${port}/api/test-status`)
      console.log('\n⚡ 快速验证:')
      console.log(`   curl http://localhost:${port}/api/health`)
      console.log('\n🛑 停止服务: Ctrl+C')
    }, 5000)
    
    // 处理进程退出
    process.on('SIGINT', () => {
      console.log('\n🛑 正在关闭测试环境...')
      app.kill('SIGINT')
      process.exit(0)
    })
    
    app.on('error', (error) => {
      console.error('❌ 启动失败:', error.message)
      process.exit(1)
    })
    
    app.on('exit', (code) => {
      if (code !== 0) {
        console.error(`❌ 进程异常退出，代码: ${code}`)
      }
      process.exit(code)
    })
    
  } catch (error) {
    console.error('❌ 启动失败:', error.message)
    process.exit(1)
  }
}

// 启动
startDevServer()