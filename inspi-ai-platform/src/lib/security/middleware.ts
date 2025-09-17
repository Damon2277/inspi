/**
 * 内容安全验证中间件
 */

import { NextRequest, NextResponse } from 'next/server';
import { defaultContentValidator, ContentValidator, VALIDATOR_PRESETS } from './contentValidator';
import { ContentFilterOptions } from './types';

export interface SecurityMiddlewareOptions {
  /** 验证器配置 */
  validatorOptions?: ContentFilterOptions;
  /** 需要验证的字段名 */
  fieldsToValidate?: string[];
  /** 是否返回详细错误信息 */
  includeDetails?: boolean;
  /** 自定义错误响应 */
  customErrorResponse?: (issues: any[]) => NextResponse;
}

/**
 * 创建内容安全验证中间件
 */
export function createSecurityMiddleware(options: SecurityMiddlewareOptions = {}) {
  const {
    validatorOptions = VALIDATOR_PRESETS.STANDARD,
    fieldsToValidate = ['content', 'message', 'description', 'title'],
    includeDetails = false,
    customErrorResponse
  } = options;

  const validator = new ContentValidator(validatorOptions);

  return async function securityMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    try {
      // 只对POST、PUT、PATCH请求进行验证
      if (!['POST', 'PUT', 'PATCH'].includes(request.method)) {
        return handler(request);
      }

      // 获取请求体
      const body = await request.json().catch(() => ({}));
      
      // 验证指定字段
      const allIssues: any[] = [];
      const cleanedBody: any = { ...body };

      for (const field of fieldsToValidate) {
        if (body[field] && typeof body[field] === 'string') {
          const result = validator.validate(body[field]);
          
          if (!result.isValid) {
            allIssues.push({
              field,
              issues: result.issues,
              riskLevel: result.riskLevel
            });
          }
          
          // 使用清理后的内容
          cleanedBody[field] = result.cleanContent;
        }
      }

      // 如果有错误，返回错误响应
      if (allIssues.length > 0) {
        if (customErrorResponse) {
          return customErrorResponse(allIssues);
        }

        return NextResponse.json({
          success: false,
          error: '内容验证失败',
          details: includeDetails ? allIssues : undefined
        }, { status: 400 });
      }

      // 创建新的请求对象，包含清理后的内容
      const cleanedRequest = new NextRequest(request.url, {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify(cleanedBody)
      });

      return handler(cleanedRequest);
    } catch (error) {
      console.error('Security middleware error:', error);
      return NextResponse.json({
        success: false,
        error: '内容验证过程中发生错误'
      }, { status: 500 });
    }
  };
}

/**
 * 预定义的中间件配置
 */
export const SECURITY_MIDDLEWARE_PRESETS = {
  // 用户内容验证（如评论、帖子）
  USER_CONTENT: createSecurityMiddleware({
    validatorOptions: VALIDATOR_PRESETS.STANDARD,
    fieldsToValidate: ['content', 'message', 'description'],
    includeDetails: true
  }),

  // 管理员内容验证
  ADMIN_CONTENT: createSecurityMiddleware({
    validatorOptions: VALIDATOR_PRESETS.RELAXED,
    fieldsToValidate: ['content', 'message', 'description', 'title'],
    includeDetails: true
  }),

  // 公开内容验证（如首页展示）
  PUBLIC_CONTENT: createSecurityMiddleware({
    validatorOptions: VALIDATOR_PRESETS.STRICT,
    fieldsToValidate: ['content', 'title', 'description'],
    includeDetails: false
  })
};

/**
 * API路由装饰器 - 简化中间件使用
 */
export function withSecurity(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options?: SecurityMiddlewareOptions
) {
  const middleware = createSecurityMiddleware(options);
  
  return async function securedHandler(req: NextRequest): Promise<NextResponse> {
    return middleware(req, handler);
  };
}

/**
 * 验证单个字段的工具函数
 */
export function validateField(
  content: string,
  options?: ContentFilterOptions
) {
  const validator = new ContentValidator(options);
  return validator.validate(content);
}

/**
 * 快速内容清理工具函数
 */
export function cleanContent(
  content: string,
  options?: ContentFilterOptions
): string {
  const validator = new ContentValidator(options);
  return validator.clean(content);
}