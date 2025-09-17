/**
 * 防作弊检测中间件
 * 在用户注册和邀请过程中进行实时防作弊检测
 */

import { NextRequest, NextResponse } from 'next/server'
import { FraudDetectionServiceImpl, RegistrationAttempt } from '../services/FraudDetectionService'
import { DeviceFingerprintGenerator, ClientDeviceInfo } from '../utils/deviceFingerprint'
import { DatabaseService } from '../database'

export interface FraudDetectionContext {
  ip: string
  userAgent: string
  headers: Record<string, string | string[] | undefined>
  body?: any
  deviceInfo?: ClientDeviceInfo
}

export interface FraudDetectionOptions {
  skipIPCheck?: boolean
  skipDeviceCheck?: boolean
  skipBatchCheck?: boolean
  customRules?: string[]
}

/**
 * 防作弊检测中间件
 */
export class FraudDetectionMiddleware {
  private fraudDetectionService: FraudDetectionServiceImpl
  private db: DatabaseService

  constructor() {
    this.db = new DatabaseService()
    this.fraudDetectionService = new FraudDetectionServiceImpl(this.db)
  }

  /**
   * 注册防作弊检测中间件
   */
  async checkRegistration(
    context: FraudDetectionContext,
    email: string,
    inviteCode?: string,
    options: FraudDetectionOptions = {}
  ): Promise<{
    allowed: boolean
    riskLevel: 'low' | 'medium' | 'high'
    reasons: string[]
    actions: string[]
    requiresReview: boolean
  }> {
    try {
      // 获取真实IP地址
      const ip = this.extractRealIP(context)
      
      // 生成设备指纹
      const deviceFingerprint = context.deviceInfo 
        ? DeviceFingerprintGenerator.generateFingerprint(context.deviceInfo)
        : DeviceFingerprintGenerator.generateFromHeaders(context.headers)

      // 构建注册尝试对象
      const attempt: RegistrationAttempt = {
        ip,
        userAgent: context.userAgent,
        email,
        inviteCode,
        deviceFingerprint,
        timestamp: new Date()
      }

      // 获取邀请人ID（如果有邀请码）
      let inviterId: string | undefined
      if (inviteCode) {
        inviterId = await this.getInviterIdByCode(inviteCode)
      }

      // 执行综合风险评估
      const result = await this.fraudDetectionService.assessRegistrationRisk(attempt, inviterId)

      // 记录IP频率
      await this.recordIPActivity(ip, 'registration')

      // 检查是否需要人工审核
      const requiresReview = result.actions.some(action => action.type === 'review') || 
                           result.riskLevel === 'high'

      return {
        allowed: result.isValid,
        riskLevel: result.riskLevel,
        reasons: result.reasons,
        actions: result.actions.map(action => `${action.type}: ${action.description}`),
        requiresReview
      }
    } catch (error) {
      console.error('Fraud detection middleware error:', error)
      
      // 出错时默认允许，但记录错误
      return {
        allowed: true,
        riskLevel: 'low',
        reasons: ['检测系统暂时不可用'],
        actions: [],
        requiresReview: false
      }
    }
  }

  /**
   * 邀请防作弊检测中间件
   */
  async checkInvitation(
    context: FraudDetectionContext,
    inviterId: string,
    inviteeEmail: string,
    options: FraudDetectionOptions = {}
  ): Promise<{
    allowed: boolean
    riskLevel: 'low' | 'medium' | 'high'
    reasons: string[]
    requiresReview: boolean
  }> {
    try {
      const ip = this.extractRealIP(context)

      // 检查用户是否被禁止
      const isBanned = await this.fraudDetectionService.isUserBanned(inviterId)
      if (isBanned) {
        return {
          allowed: false,
          riskLevel: 'high',
          reasons: ['用户已被禁止参与邀请活动'],
          requiresReview: false
        }
      }

      // 检查自我邀请
      const selfInviteResult = await this.fraudDetectionService.checkSelfInvitation(
        inviterId, 
        inviteeEmail, 
        ip
      )

      // 检查IP频率
      const ipResult = await this.fraudDetectionService.checkIPFrequency(ip)

      // 记录IP活动
      await this.recordIPActivity(ip, 'invitation', inviterId)

      // 综合评估
      const highRisk = !selfInviteResult.isValid || !ipResult.isValid
      const mediumRisk = selfInviteResult.riskLevel === 'medium' || ipResult.riskLevel === 'medium'

      let finalRiskLevel: 'low' | 'medium' | 'high' = 'low'
      if (highRisk) {
        finalRiskLevel = 'high'
      } else if (mediumRisk) {
        finalRiskLevel = 'medium'
      }

      const allReasons = [...selfInviteResult.reasons, ...ipResult.reasons]

      return {
        allowed: !highRisk,
        riskLevel: finalRiskLevel,
        reasons: allReasons,
        requiresReview: finalRiskLevel !== 'low'
      }
    } catch (error) {
      console.error('Invitation fraud detection error:', error)
      
      return {
        allowed: true,
        riskLevel: 'low',
        reasons: ['检测系统暂时不可用'],
        requiresReview: false
      }
    }
  }

  /**
   * 创建Express/Next.js中间件函数
   */
  createRegistrationMiddleware(options: FraudDetectionOptions = {}) {
    return async (req: NextRequest) => {
      try {
        const body = await req.json()
        const { email, inviteCode, deviceInfo } = body

        if (!email) {
          return NextResponse.json(
            { error: 'Email is required' },
            { status: 400 }
          )
        }

        const context: FraudDetectionContext = {
          ip: req.ip || '',
          userAgent: req.headers.get('user-agent') || '',
          headers: Object.fromEntries(req.headers.entries()),
          body,
          deviceInfo
        }

        const result = await this.checkRegistration(context, email, inviteCode, options)

        if (!result.allowed) {
          return NextResponse.json({
            error: 'Registration blocked due to security concerns',
            reasons: result.reasons,
            riskLevel: result.riskLevel,
            requiresReview: result.requiresReview
          }, { status: 403 })
        }

        if (result.requiresReview) {
          return NextResponse.json({
            message: 'Registration requires manual review',
            riskLevel: result.riskLevel,
            requiresReview: true
          }, { status: 202 })
        }

        // 继续正常流程
        return NextResponse.next()
      } catch (error) {
        console.error('Registration middleware error:', error)
        return NextResponse.next() // 出错时继续流程
      }
    }
  }

  /**
   * 创建邀请中间件函数
   */
  createInvitationMiddleware(options: FraudDetectionOptions = {}) {
    return async (req: NextRequest) => {
      try {
        const body = await req.json()
        const { inviterId, inviteeEmail } = body

        if (!inviterId || !inviteeEmail) {
          return NextResponse.json(
            { error: 'Inviter ID and invitee email are required' },
            { status: 400 }
          )
        }

        const context: FraudDetectionContext = {
          ip: req.ip || '',
          userAgent: req.headers.get('user-agent') || '',
          headers: Object.fromEntries(req.headers.entries()),
          body
        }

        const result = await this.checkInvitation(context, inviterId, inviteeEmail, options)

        if (!result.allowed) {
          return NextResponse.json({
            error: 'Invitation blocked due to security concerns',
            reasons: result.reasons,
            riskLevel: result.riskLevel
          }, { status: 403 })
        }

        if (result.requiresReview) {
          return NextResponse.json({
            message: 'Invitation requires manual review',
            riskLevel: result.riskLevel,
            requiresReview: true
          }, { status: 202 })
        }

        return NextResponse.next()
      } catch (error) {
        console.error('Invitation middleware error:', error)
        return NextResponse.next()
      }
    }
  }

  // 私有辅助方法

  /**
   * 提取真实IP地址
   */
  private extractRealIP(context: FraudDetectionContext): string {
    const headers = context.headers
    
    // 按优先级检查各种IP头
    const ipHeaders = [
      'cf-connecting-ip', // Cloudflare
      'x-real-ip',
      'x-forwarded-for',
      'x-client-ip',
      'x-forwarded',
      'x-cluster-client-ip',
      'forwarded-for',
      'forwarded'
    ]

    for (const header of ipHeaders) {
      const value = headers[header]
      if (value) {
        const ip = Array.isArray(value) ? value[0] : value
        // 取第一个IP（如果有多个）
        const firstIP = ip.split(',')[0].trim()
        if (this.isValidIP(firstIP)) {
          return firstIP
        }
      }
    }

    return context.ip || '127.0.0.1'
  }

  /**
   * 验证IP地址格式
   */
  private isValidIP(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip)
  }

  /**
   * 根据邀请码获取邀请人ID
   */
  private async getInviterIdByCode(inviteCode: string): Promise<string | undefined> {
    try {
      const query = `
        SELECT inviter_id 
        FROM invite_codes 
        WHERE code = ? AND is_active = 1
      `
      
      const result = await this.db.queryOne(query, [inviteCode])
      return result?.inviter_id
    } catch (error) {
      console.error('Failed to get inviter ID:', error)
      return undefined
    }
  }

  /**
   * 记录IP活动
   */
  private async recordIPActivity(
    ip: string, 
    actionType: 'registration' | 'invitation' | 'login',
    userId?: string
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO ip_frequency_records (ip, action_type, user_id)
        VALUES (?, ?, ?)
      `
      
      await this.db.execute(query, [ip, actionType, userId || null])
    } catch (error) {
      console.error('Failed to record IP activity:', error)
    }
  }
}

/**
 * 全局防作弊中间件实例
 */
export const fraudDetectionMiddleware = new FraudDetectionMiddleware()

/**
 * 防作弊检测装饰器
 */
export function withFraudDetection(options: FraudDetectionOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      // 这里可以添加装饰器逻辑
      // 目前先直接调用原方法
      return method.apply(this, args)
    }

    return descriptor
  }
}

/**
 * 防作弊检测结果类型
 */
export interface FraudDetectionResponse {
  success: boolean
  allowed: boolean
  riskLevel: 'low' | 'medium' | 'high'
  reasons: string[]
  actions: string[]
  requiresReview: boolean
  metadata?: Record<string, any>
}