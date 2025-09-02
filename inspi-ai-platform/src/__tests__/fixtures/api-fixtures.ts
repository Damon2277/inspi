/**
 * API响应相关测试数据工厂
 */

// 标准API响应格式
export interface MockApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  code?: string
  timestamp?: string
}

// 分页响应格式
export interface MockPaginatedResponse<T = any> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  message?: string
}

// 成功响应工厂
export const createSuccessResponse = <T>(data: T, message?: string): MockApiResponse<T> => ({
  success: true,
  data,
  message: message || 'Success',
  timestamp: new Date().toISOString(),
})

// 错误响应工厂
export const createErrorResponse = (
  error: string,
  code?: string,
  message?: string
): MockApiResponse => ({
  success: false,
  error,
  code,
  message: message || 'An error occurred',
  timestamp: new Date().toISOString(),
})

// 分页响应工厂
export const createPaginatedResponse = <T>(
  data: T[],
  page: number = 1,
  limit: number = 10,
  total?: number
): MockPaginatedResponse<T> => {
  const actualTotal = total || data.length
  const totalPages = Math.ceil(actualTotal / limit)
  
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total: actualTotal,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  }
}

// 认证相关API响应
export const createAuthSuccessResponse = (user: any, token: string) =>
  createSuccessResponse({
    user,
    token,
    refreshToken: `refresh-${token}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }, 'Authentication successful')

export const createAuthErrorResponse = (message: string = 'Authentication failed') =>
  createErrorResponse('AUTH_ERROR', 'UNAUTHORIZED', message)

// 验证错误响应
export const createValidationErrorResponse = (fields: Record<string, string>) =>
  createErrorResponse('VALIDATION_ERROR', 'BAD_REQUEST', 'Validation failed')

// 权限错误响应
export const createPermissionErrorResponse = (message: string = 'Permission denied') =>
  createErrorResponse('PERMISSION_ERROR', 'FORBIDDEN', message)

// 资源未找到响应
export const createNotFoundResponse = (resource: string = 'Resource') =>
  createErrorResponse('NOT_FOUND', 'NOT_FOUND', `${resource} not found`)

// 服务器错误响应
export const createServerErrorResponse = (message: string = 'Internal server error') =>
  createErrorResponse('SERVER_ERROR', 'INTERNAL_ERROR', message)

// 限流错误响应
export const createRateLimitResponse = (message: string = 'Rate limit exceeded') =>
  createErrorResponse('RATE_LIMIT', 'TOO_MANY_REQUESTS', message)

// 用户API响应
export const createUserResponse = (user: any) =>
  createSuccessResponse(user, 'User retrieved successfully')

export const createUsersResponse = (users: any[], page: number = 1, limit: number = 10) =>
  createPaginatedResponse(users, page, limit)

// 作品API响应
export const createWorkResponse = (work: any) =>
  createSuccessResponse(work, 'Work retrieved successfully')

export const createWorksResponse = (works: any[], page: number = 1, limit: number = 12) =>
  createPaginatedResponse(works, page, limit)

export const createWorkCreatedResponse = (work: any) =>
  createSuccessResponse(work, 'Work created successfully')

export const createWorkUpdatedResponse = (work: any) =>
  createSuccessResponse(work, 'Work updated successfully')

export const createWorkDeletedResponse = () =>
  createSuccessResponse(null, 'Work deleted successfully')

// AI生成API响应
export const createAiGenerationResponse = (cards: any[]) =>
  createSuccessResponse({
    cards,
    generationId: `gen-${Math.random().toString(36).substring(2, 15)}`,
    tokensUsed: Math.floor(Math.random() * 1000) + 500,
  }, 'Cards generated successfully')

export const createAiGenerationErrorResponse = (reason: string = 'Generation failed') =>
  createErrorResponse('AI_GENERATION_ERROR', 'SERVICE_ERROR', reason)

// 知识图谱API响应
export const createGraphResponse = (graph: any) =>
  createSuccessResponse(graph, 'Knowledge graph retrieved successfully')

export const createGraphUpdatedResponse = (graph: any) =>
  createSuccessResponse(graph, 'Knowledge graph updated successfully')

// 统计API响应
export const createStatsResponse = (stats: any) =>
  createSuccessResponse(stats, 'Statistics retrieved successfully')

// 搜索API响应
export const createSearchResponse = (results: any[], query: string, page: number = 1) =>
  createSuccessResponse({
    results,
    query,
    total: results.length,
    page,
    took: Math.floor(Math.random() * 100) + 10, // ms
  }, 'Search completed successfully')

// 上传API响应
export const createUploadResponse = (fileInfo: any) =>
  createSuccessResponse({
    ...fileInfo,
    uploadId: `upload-${Math.random().toString(36).substring(2, 15)}`,
    uploadedAt: new Date().toISOString(),
  }, 'File uploaded successfully')

export const createUploadErrorResponse = (reason: string = 'Upload failed') =>
  createErrorResponse('UPLOAD_ERROR', 'BAD_REQUEST', reason)

// 订阅API响应
export const createSubscriptionResponse = (subscription: any) =>
  createSuccessResponse(subscription, 'Subscription retrieved successfully')

export const createSubscriptionUpdatedResponse = (subscription: any) =>
  createSuccessResponse(subscription, 'Subscription updated successfully')

// 使用限制API响应
export const createUsageLimitResponse = (usage: any) =>
  createSuccessResponse(usage, 'Usage limits retrieved successfully')

export const createUsageLimitExceededResponse = (limit: string) =>
  createErrorResponse('USAGE_LIMIT_EXCEEDED', 'FORBIDDEN', `${limit} limit exceeded`)

// 健康检查API响应
export const createHealthCheckResponse = (status: 'healthy' | 'unhealthy' = 'healthy') =>
  createSuccessResponse({
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(Math.random() * 86400), // seconds
    version: '1.0.0',
    services: {
      database: status === 'healthy' ? 'connected' : 'disconnected',
      redis: status === 'healthy' ? 'connected' : 'disconnected',
      ai: status === 'healthy' ? 'available' : 'unavailable',
    },
  }, `System is ${status}`)

// 批量操作响应
export const createBatchResponse = (results: any[], errors: any[] = []) =>
  createSuccessResponse({
    results,
    errors,
    total: results.length + errors.length,
    successful: results.length,
    failed: errors.length,
  }, 'Batch operation completed')

// WebSocket消息格式
export const createWebSocketMessage = (type: string, data: any) => ({
  type,
  data,
  timestamp: new Date().toISOString(),
  id: `msg-${Math.random().toString(36).substring(2, 15)}`,
})

// 实时通知消息
export const createNotificationMessage = (notification: any) =>
  createWebSocketMessage('notification', notification)

// 实时更新消息
export const createUpdateMessage = (resource: string, data: any) =>
  createWebSocketMessage('update', { resource, data })