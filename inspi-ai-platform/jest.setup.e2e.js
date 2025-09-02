/**
 * Jest E2E测试环境设置
 * 用于端到端测试
 */
import { setupServer } from 'msw/node'
import { rest } from 'msw'

// 创建MSW服务器用于API模拟
const server = setupServer(
  // 默认的API模拟
  rest.get('/api/health', (req, res, ctx) => {
    return res(ctx.json({ status: 'ok' }))
  })
)

// 在所有测试开始前启动服务器
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn',
  })
  console.log('🚀 MSW server started for E2E tests')
})

// 每个测试后重置处理器
afterEach(() => {
  server.resetHandlers()
})

// 在所有测试结束后关闭服务器
afterAll(() => {
  server.close()
  console.log('🛑 MSW server stopped')
})

// 导出服务器实例供测试使用
export { server }