/**
 * Playwright 全局清理
 * 在所有测试结束后执行
 */

import { chromium, FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 开始全局测试清理...')
  
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  
  try {
    // 清理测试数据
    console.log('🗑️ 清理测试数据...')
    await cleanupTestData(page)
    
    // 生成测试报告
    console.log('📊 生成测试报告...')
    await generateTestReport()
    
    console.log('✅ 全局清理完成')
    
  } catch (error) {
    console.error('❌ 全局清理失败:', error)
  } finally {
    await context.close()
    await browser.close()
  }
}

/**
 * 清理测试数据
 */
async function cleanupTestData(page: any) {
  try {
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/test/cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'cleanup-test-data'
          })
        })
        return res.ok
      } catch {
        return false
      }
    })
    
    if (response) {
      console.log('✅ 测试数据清理成功')
    }
  } catch (error) {
    console.warn('⚠️ 测试数据清理跳过:', error)
  }
}

/**
 * 生成测试报告
 */
async function generateTestReport() {
  try {
    // 这里可以添加自定义报告生成逻辑
    console.log('📈 测试报告将在测试完成后生成')
  } catch (error) {
    console.warn('⚠️ 报告生成失败:', error)
  }
}

export default globalTeardown