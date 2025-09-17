/**
 * 健康检查API
 * 用于负载均衡器和监控系统检查应用状态
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/invitation/config/production'
import { logger } from '@/lib/utils/logger'

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  uptime: number
  version: string
  environment: string
  checks: {
    database: HealthCheck
    redis: HealthCheck
    memory: HealthCheck
    disk: HealthCheck
  }
  metrics: {
    responseTime: number
    memoryUsage: {
      used: number
      total: number
      percentage: number
    }
    cpuUsage: number
  }
}

interface HealthCheck {
  status: 'pass' | 'fail' | 'warn'
  responseTime: number
  message?: string
  details?: any
}

const startTime = Date.now()

export async function GET(request: NextRequest) {
  const checkStart = Date.now()
  
  try {
    const config = getConfig()
    
    // 执行各项健康检查
    const [databaseCheck, redisCheck, memoryCheck, diskCheck] = await Promise.allSettled([
      checkDatabase(),
      checkRedis(),
      checkMemory(),
      checkDisk()
    ])
    
    // 收集检查结果
    const checks = {
      database: getCheckResult(databaseCheck),
      redis: getCheckResult(redisCheck),
      memory: getCheckResult(memoryCheck),
      disk: getCheckResult(diskCheck)
    }
    
    // 计算整体状态
    const overallStatus = calculateOverallStatus(checks)
    
    // 收集指标
    const metrics = await collectMetrics()
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      version: process.env.VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      metrics: {
        ...metrics,
        responseTime: Date.now() - checkStart
      }
    }
    
    // 根据状态返回相应的HTTP状态码
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503
    
    return NextResponse.json(healthStatus, { status: httpStatus })
    
  } catch (error) {
    logger.error('Health check failed', { error })
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      version: process.env.VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      error: 'Health check failed',
      responseTime: Date.now() - checkStart
    }, { status: 503 })
  }
}

/**
 * 检查数据库连接
 */
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    // 这里应该使用实际的数据库连接检查
    // 为了演示，使用模拟检查
    await new Promise(resolve => setTimeout(resolve, 10))
    
    return {
      status: 'pass',
      responseTime: Date.now() - start,
      message: 'Database connection successful'
    }
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - start,
      message: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 检查Redis连接
 */
async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    // 这里应该使用实际的Redis连接检查
    // 为了演示，使用模拟检查
    await new Promise(resolve => setTimeout(resolve, 5))
    
    return {
      status: 'pass',
      responseTime: Date.now() - start,
      message: 'Redis connection successful'
    }
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - start,
      message: 'Redis connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 检查内存使用情况
 */
async function checkMemory(): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    const memoryUsage = process.memoryUsage()
    const totalMemory = memoryUsage.heapTotal
    const usedMemory = memoryUsage.heapUsed
    const memoryPercentage = (usedMemory / totalMemory) * 100
    
    let status: 'pass' | 'warn' | 'fail' = 'pass'
    let message = 'Memory usage normal'
    
    if (memoryPercentage > 90) {
      status = 'fail'
      message = 'Memory usage critical'
    } else if (memoryPercentage > 80) {
      status = 'warn'
      message = 'Memory usage high'
    }
    
    return {
      status,
      responseTime: Date.now() - start,
      message,
      details: {
        used: usedMemory,
        total: totalMemory,
        percentage: memoryPercentage
      }
    }
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - start,
      message: 'Memory check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 检查磁盘使用情况
 */
async function checkDisk(): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    // 这里应该使用实际的磁盘使用检查
    // 为了演示，使用模拟数据
    const diskUsage = {
      used: 50 * 1024 * 1024 * 1024, // 50GB
      total: 100 * 1024 * 1024 * 1024, // 100GB
      percentage: 50
    }
    
    let status: 'pass' | 'warn' | 'fail' = 'pass'
    let message = 'Disk usage normal'
    
    if (diskUsage.percentage > 95) {
      status = 'fail'
      message = 'Disk usage critical'
    } else if (diskUsage.percentage > 85) {
      status = 'warn'
      message = 'Disk usage high'
    }
    
    return {
      status,
      responseTime: Date.now() - start,
      message,
      details: diskUsage
    }
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - start,
      message: 'Disk check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 从Promise结果中提取健康检查结果
 */
function getCheckResult(result: PromiseSettledResult<HealthCheck>): HealthCheck {
  if (result.status === 'fulfilled') {
    return result.value
  } else {
    return {
      status: 'fail',
      responseTime: 0,
      message: 'Check failed',
      details: result.reason
    }
  }
}

/**
 * 计算整体健康状态
 */
function calculateOverallStatus(checks: Record<string, HealthCheck>): 'healthy' | 'unhealthy' | 'degraded' {
  const checkValues = Object.values(checks)
  
  // 如果有任何关键检查失败，状态为不健康
  if (checks.database.status === 'fail') {
    return 'unhealthy'
  }
  
  // 如果有任何检查失败，状态为不健康
  if (checkValues.some(check => check.status === 'fail')) {
    return 'unhealthy'
  }
  
  // 如果有警告，状态为降级
  if (checkValues.some(check => check.status === 'warn')) {
    return 'degraded'
  }
  
  // 所有检查都通过，状态为健康
  return 'healthy'
}

/**
 * 收集系统指标
 */
async function collectMetrics() {
  const memoryUsage = process.memoryUsage()
  
  // 计算CPU使用率（简化版本）
  const cpuUsage = await getCPUUsage()
  
  return {
    memoryUsage: {
      used: memoryUsage.heapUsed,
      total: memoryUsage.heapTotal,
      percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
    },
    cpuUsage
  }
}

/**
 * 获取CPU使用率
 */
async function getCPUUsage(): Promise<number> {
  return new Promise((resolve) => {
    const startUsage = process.cpuUsage()
    const startTime = Date.now()
    
    setTimeout(() => {
      const endUsage = process.cpuUsage(startUsage)
      const endTime = Date.now()
      const totalTime = (endTime - startTime) * 1000 // 转换为微秒
      const cpuPercent = ((endUsage.user + endUsage.system) / totalTime) * 100
      resolve(Math.min(cpuPercent, 100))
    }, 100)
  })
}