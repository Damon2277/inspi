/**
 * 基础Mock服务类
 * 提供所有Mock服务的通用功能
 */

import { MockService, MockServiceStatus } from '../MockServiceManager';
import { logger } from '@/lib/utils/logger';

export abstract class BaseMockService implements MockService {
  public readonly name: string;
  public readonly version: string;
  public isActive: boolean = true;
  
  protected callCount: number = 0;
  protected lastCalled?: Date;
  protected errors: string[] = [];
  protected mockData: Map<string, any> = new Map();
  protected responses: Map<string, any> = new Map();

  constructor(name: string, version: string = '1.0.0') {
    this.name = name;
    this.version = version;
  }

  /**
   * 重置Mock服务状态
   */
  reset(): void {
    this.callCount = 0;
    this.lastCalled = undefined;
    this.errors = [];
    this.mockData.clear();
    this.responses.clear();
    this.isActive = true;
    
    this.onReset();
    
    logger.debug(`Mock service reset: ${this.name}`);
  }

  /**
   * 验证Mock服务状态
   */
  async verify(): Promise<boolean> {
    try {
      const isValid = await this.onVerify();
      
      if (!isValid) {
        this.addError('Verification failed');
      }
      
      return isValid;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown verification error';
      this.addError(`Verification error: ${errorMessage}`);
      return false;
    }
  }

  /**
   * 获取服务状态
   */
  getStatus(): MockServiceStatus {
    return {
      name: this.name,
      version: this.version,
      isActive: this.isActive,
      callCount: this.callCount,
      lastCalled: this.lastCalled,
      errors: [...this.errors]
    };
  }

  /**
   * 设置Mock响应
   */
  setMockResponse(key: string, response: any): void {
    this.responses.set(key, response);
    logger.debug(`Mock response set for ${this.name}:${key}`);
  }

  /**
   * 获取Mock响应
   */
  getMockResponse(key: string): any {
    return this.responses.get(key);
  }

  /**
   * 检查是否有Mock响应
   */
  hasMockResponse(key: string): boolean {
    return this.responses.has(key);
  }

  /**
   * 设置Mock数据
   */
  setMockData(key: string, data: any): void {
    this.mockData.set(key, data);
    logger.debug(`Mock data set for ${this.name}:${key}`);
  }

  /**
   * 获取Mock数据
   */
  getMockData(key: string): any {
    return this.mockData.get(key);
  }

  /**
   * 记录方法调用
   */
  protected recordCall(method: string, args?: any[]): void {
    this.callCount++;
    this.lastCalled = new Date();
    
    logger.debug(`Mock service call: ${this.name}.${method}`, {
      callCount: this.callCount,
      args: args ? JSON.stringify(args).substring(0, 200) : undefined
    });
  }

  /**
   * 添加错误
   */
  protected addError(error: string): void {
    this.errors.push(error);
    
    // 限制错误数量
    if (this.errors.length > 100) {
      this.errors.shift();
    }
    
    logger.warn(`Mock service error: ${this.name} - ${error}`);
  }

  /**
   * 清除错误
   */
  protected clearErrors(): void {
    this.errors = [];
  }

  /**
   * 生成请求键
   */
  protected generateRequestKey(method: string, args: any[]): string {
    const argsString = JSON.stringify(args);
    return `${method}:${this.simpleHash(argsString)}`;
  }

  /**
   * 简单哈希函数
   */
  protected simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 模拟网络延迟
   */
  protected async simulateDelay(min: number = 50, max: number = 200): Promise<void> {
    const delay = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 验证参数
   */
  protected validateArgs(args: any[], expectedTypes: string[]): boolean {
    if (args.length !== expectedTypes.length) {
      return false;
    }

    return args.every((arg, index) => {
      const expectedType = expectedTypes[index];
      const actualType = typeof arg;
      
      if (expectedType === 'array') {
        return Array.isArray(arg);
      }
      
      if (expectedType === 'object') {
        return actualType === 'object' && arg !== null && !Array.isArray(arg);
      }
      
      return actualType === expectedType;
    });
  }

  /**
   * 子类重写：重置时的自定义逻辑
   */
  protected onReset(): void {
    // 子类可以重写此方法
  }

  /**
   * 子类重写：验证时的自定义逻辑
   */
  protected abstract onVerify(): Promise<boolean>;

  /**
   * 激活服务
   */
  activate(): void {
    this.isActive = true;
    logger.debug(`Mock service activated: ${this.name}`);
  }

  /**
   * 停用服务
   */
  deactivate(): void {
    this.isActive = false;
    logger.debug(`Mock service deactivated: ${this.name}`);
  }

  /**
   * 检查服务是否激活
   */
  protected ensureActive(): void {
    if (!this.isActive) {
      throw new Error(`Mock service ${this.name} is not active`);
    }
  }
}