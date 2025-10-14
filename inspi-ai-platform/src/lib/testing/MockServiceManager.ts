/**
 * Mock服务管理系统
 * 提供统一的Mock服务注册、管理和验证功能
 */

import { logger } from '@/shared/utils/logger';

export interface MockService {
  name: string;
  version: string;
  isActive: boolean;
  reset(): void;
  verify(): Promise<boolean>;
  getStatus(): MockServiceStatus;
}

export interface MockServiceStatus {
  name: string;
  version: string;
  isActive: boolean;
  callCount: number;
  lastCalled?: Date;
  errors: string[];
}

export interface MockServiceConfig {
  name: string;
  autoReset?: boolean;
  trackCalls?: boolean;
  validateConsistency?: boolean;
}

/**
 * Mock服务注册和管理器
 */
export class MockServiceManager {
  private static instance: MockServiceManager;
  private services: Map<string, MockService> = new Map();
  private configs: Map<string, MockServiceConfig> = new Map();
  private callHistory: Map<string, MockCall[]> = new Map();

  private constructor() {}

  static getInstance(): MockServiceManager {
    if (!MockServiceManager.instance) {
      MockServiceManager.instance = new MockServiceManager();
    }
    return MockServiceManager.instance;
  }

  /**
   * 注册Mock服务
   */
  registerMock(service: MockService, config?: MockServiceConfig): void {
    const serviceName = service.name;

    if (this.services.has(serviceName)) {
      logger.warn(`Mock service ${serviceName} already registered, replacing...`);
    }

    this.services.set(serviceName, service);

    if (config) {
      this.configs.set(serviceName, config);
    }

    this.callHistory.set(serviceName, []);

    logger.info(`Mock service registered: ${serviceName}`, {
      version: service.version,
      config: config || {},
    });
  }

  /**
   * 获取Mock服务
   */
  getMock<T extends MockService>(name: string): T | null {
    const service = this.services.get(name);
    if (!service) {
      logger.warn(`Mock service not found: ${name}`);
      return null;
    }

    // 记录调用
    this.recordCall(name, 'getMock');

    return service as T;
  }

  /**
   * 检查服务是否已注册
   */
  hasMock(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * 重置所有Mock服务
   */
  resetAllMocks(): void {
    for (const [name, service] of this.services) {
      try {
        service.reset();
        this.callHistory.set(name, []);
        logger.debug(`Reset mock service: ${name}`);
      } catch (error) {
        logger.error(`Failed to reset mock service: ${name}`, { error });
      }
    }

    logger.info('All mock services reset');
  }

  /**
   * 重置特定Mock服务
   */
  resetMock(name: string): void {
    const service = this.services.get(name);
    if (!service) {
      logger.warn(`Cannot reset non-existent mock service: ${name}`);
      return;
    }

    try {
      service.reset();
      this.callHistory.set(name, []);
      logger.debug(`Reset mock service: ${name}`);
    } catch (error) {
      logger.error(`Failed to reset mock service: ${name}`, { error });
    }
  }

  /**
   * 验证所有Mock服务的一致性
   */
  async verifyAllMocks(): Promise<MockVerificationResult> {
    const results: MockServiceVerificationResult[] = [];
    let allValid = true;

    for (const [name, service] of this.services) {
      try {
        const isValid = await service.verify();
        const status = service.getStatus();

        results.push({
          serviceName: name,
          isValid,
          status,
          errors: status.errors,
        });

        if (!isValid) {
          allValid = false;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          serviceName: name,
          isValid: false,
          status: service.getStatus(),
          errors: [errorMessage],
        });
        allValid = false;
      }
    }

    return {
      allValid,
      results,
      timestamp: new Date(),
    };
  }

  /**
   * 验证特定Mock服务
   */
  async verifyMock(name: string): Promise<MockServiceVerificationResult> {
    const service = this.services.get(name);
    if (!service) {
      return {
        serviceName: name,
        isValid: false,
        status: {
          name,
          version: 'unknown',
          isActive: false,
          callCount: 0,
          errors: ['Service not found'],
        },
        errors: ['Service not found'],
      };
    }

    try {
      const isValid = await service.verify();
      const status = service.getStatus();

      return {
        serviceName: name,
        isValid,
        status,
        errors: status.errors,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        serviceName: name,
        isValid: false,
        status: service.getStatus(),
        errors: [errorMessage],
      };
    }
  }

  /**
   * 获取所有Mock服务状态
   */
  getAllMockStatus(): MockServiceStatus[] {
    const statuses: MockServiceStatus[] = [];

    for (const service of this.services.values()) {
      statuses.push(service.getStatus());
    }

    return statuses;
  }

  /**
   * 获取调用历史
   */
  getCallHistory(serviceName?: string): Map<string, MockCall[]> {
    if (serviceName) {
      const history = this.callHistory.get(serviceName);
      return new Map(history ? [[serviceName, history]] : []);
    }

    return new Map(this.callHistory);
  }

  /**
   * 清理所有Mock服务
   */
  cleanup(): void {
    this.resetAllMocks();
    this.services.clear();
    this.configs.clear();
    this.callHistory.clear();

    logger.info('Mock service manager cleaned up');
  }

  /**
   * 记录服务调用
   */
  private recordCall(serviceName: string, method: string, args?: any[]): void {
    const config = this.configs.get(serviceName);
    if (!config?.trackCalls) {
      return;
    }

    const history = this.callHistory.get(serviceName) || [];
    history.push({
      method,
      args,
      timestamp: new Date(),
    });

    // 限制历史记录数量
    if (history.length > 1000) {
      history.shift();
    }

    this.callHistory.set(serviceName, history);
  }

  /**
   * 获取管理器统计信息
   */
  getStats(): MockManagerStats {
    return {
      totalServices: this.services.size,
      activeServices: Array.from(this.services.values()).filter(s => s.isActive).length,
      totalCalls: Array.from(this.callHistory.values()).reduce((sum, calls) => sum + calls.length, 0),
      servicesWithErrors: Array.from(this.services.values()).filter(s => s.getStatus().errors.length > 0).length,
    };
  }
}

// 类型定义
export interface MockCall {
  method: string;
  args?: any[];
  timestamp: Date;
}

export interface MockVerificationResult {
  allValid: boolean;
  results: MockServiceVerificationResult[];
  timestamp: Date;
}

export interface MockServiceVerificationResult {
  serviceName: string;
  isValid: boolean;
  status: MockServiceStatus;
  errors: string[];
}

export interface MockManagerStats {
  totalServices: number;
  activeServices: number;
  totalCalls: number;
  servicesWithErrors: number;
}

// 单例实例
export const mockServiceManager = MockServiceManager.getInstance();
