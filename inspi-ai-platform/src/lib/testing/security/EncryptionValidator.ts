/**
 * Encryption Validation Tester
 * 
 * 专门用于验证数据加密正确性的测试器
 * 包括加密算法测试、密钥管理测试、数据完整性验证等
 */
import crypto from 'crypto';

export interface EncryptionConfig {
  enableAlgorithmTests: boolean;
  enableKeyManagementTests: boolean;
  enableDataIntegrityTests: boolean;
  enablePerformanceTests: boolean;
  supportedAlgorithms: EncryptionAlgorithm[];
  keyStrengthRequirements: KeyStrengthConfig;
  testDataSets: TestDataSet[];
}

export interface EncryptionAlgorithm {
  name: string;
  type: 'symmetric' | 'asymmetric' | 'hash';
  keySize: number;
  blockSize?: number;
  mode?: string;
  padding?: string;
  description: string;
}

export interface KeyStrengthConfig {
  minimumSymmetricKeySize: number;
  minimumAsymmetricKeySize: number;
  requiredRandomness: number;
  keyRotationInterval: number;
}

export interface TestDataSet {
  name: string;
  data: string;
  size: number;
  type: 'text' | 'binary' | 'json' | 'xml';
  sensitivityLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface EncryptionTestResult {
  testName: string;
  algorithm: EncryptionAlgorithm;
  testType: 'algorithm' | 'key_management' | 'data_integrity' | 'performance';
  status: 'passed' | 'failed' | 'warning' | 'error';
  executionTime: number;
  details: EncryptionTestDetails;
  securityLevel: 'weak' | 'acceptable' | 'strong' | 'excellent';
  issues: EncryptionIssue[];
}

export interface EncryptionTestDetails {
  originalData: string;
  encryptedData?: string;
  decryptedData?: string;
  keyInfo: KeyInfo;
  performanceMetrics?: PerformanceMetrics;
  integrityCheck?: IntegrityCheckResult;
}

export interface KeyInfo {
  algorithm: string;
  keySize: number;
  keyStrength: number;
  generationMethod: string;
  isSecure: boolean;
}

export interface PerformanceMetrics {
  encryptionTime: number;
  decryptionTime: number;
  throughput: number;
  memoryUsage: number;
}

export interface IntegrityCheckResult {
  hashMatch: boolean;
  dataCorruption: boolean;
  tamperingDetected: boolean;
  checksumValid: boolean;
}

export interface EncryptionIssue {
  type: 'weak_key' | 'weak_algorithm' | 'poor_performance' | 'integrity_failure' | 'implementation_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
}

export class EncryptionValidator {
  private config: EncryptionConfig;

  constructor(config: EncryptionConfig) {
    this.config = config;
  }

  /**
   * 运行完整的加密验证测试套件
   */
  async runEncryptionTests(encryptionService: EncryptionService): Promise<EncryptionTestResult[]> {
    const results: EncryptionTestResult[] = [];

    // 算法测试
    if (this.config.enableAlgorithmTests) {
      const algorithmResults = await this.runAlgorithmTests(encryptionService);
      results.push(...algorithmResults);
    }

    // 密钥管理测试
    if (this.config.enableKeyManagementTests) {
      const keyManagementResults = await this.runKeyManagementTests(encryptionService);
      results.push(...keyManagementResults);
    }

    // 数据完整性测试
    if (this.config.enableDataIntegrityTests) {
      const integrityResults = await this.runDataIntegrityTests(encryptionService);
      results.push(...integrityResults);
    }

    // 性能测试
    if (this.config.enablePerformanceTests) {
      const performanceResults = await this.runPerformanceTests(encryptionService);
      results.push(...performanceResults);
    }

    return results;
  }

  /**
   * 运行加密算法测试
   */
  private async runAlgorithmTests(encryptionService: EncryptionService): Promise<EncryptionTestResult[]> {
    const results: EncryptionTestResult[] = [];

    for (const algorithm of this.config.supportedAlgorithms) {
      for (const testData of this.config.testDataSets) {
        const result = await this.testAlgorithm(algorithm, testData, encryptionService);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * 测试单个加密算法
   */
  private async testAlgorithm(algorithm: EncryptionAlgorithm, testData: TestDataSet, encryptionService: EncryptionService): Promise<EncryptionTestResult> {
    const startTime = Date.now();
    const issues: EncryptionIssue[] = [];

    try {
      // 生成密钥
      const keyInfo = await this.generateTestKey(algorithm);
      
      // 加密数据
      const encryptedData = await encryptionService.encrypt(testData.data, algorithm.name, keyInfo);
      
      // 解密数据
      const decryptedData = await encryptionService.decrypt(encryptedData, algorithm.name, keyInfo);
      
      // 验证结果
      const encryptionWorked = encryptedData !== testData.data;
      const decryptionWorked = decryptedData === testData.data;
      
      const executionTime = Date.now() - startTime;
      
      // 检查算法强度
      const securityLevel = this.assessAlgorithmSecurity(algorithm);
      if (securityLevel === 'weak') {
        issues.push({
          type: 'weak_algorithm',
          severity: 'high',
          description: `算法 ${algorithm.name} 安全强度不足`,
          recommendation: '使用更强的加密算法'
        });
      }

      // 检查密钥强度
      if (!keyInfo.isSecure) {
        issues.push({
          type: 'weak_key',
          severity: 'critical',
          description: '密钥强度不足或生成方法不安全',
          recommendation: '使用更强的密钥生成方法'
        });
      }

      const status = encryptionWorked && decryptionWorked && issues.length === 0 ? 'passed' : 
                    issues.some(i => i.severity === 'critical') ? 'failed' : 'warning';

      return {
        testName: `Algorithm Test - ${algorithm.name} with ${testData.name}`,
        algorithm,
        testType: 'algorithm',
        status,
        executionTime,
        details: {
          originalData: testData.data,
          encryptedData,
          decryptedData,
          keyInfo
        },
        securityLevel,
        issues
      };
    } catch (error) {
      issues.push({
        type: 'implementation_error',
        severity: 'critical',
        description: `加密算法实现错误: ${error}`,
        recommendation: '检查加密服务实现'
      });

      return {
        testName: `Algorithm Test - ${algorithm.name} with ${testData.name}`,
        algorithm,
        testType: 'algorithm',
        status: 'error',
        executionTime: Date.now() - startTime,
        details: {
          originalData: testData.data,
          keyInfo: { algorithm: algorithm.name, keySize: 0, keyStrength: 0, generationMethod: 'unknown', isSecure: false }
        },
        securityLevel: 'weak',
        issues
      };
    }
  }

  /**
   * 运行密钥管理测试
   */
  private async runKeyManagementTests(encryptionService: EncryptionService): Promise<EncryptionTestResult[]> {
    const results: EncryptionTestResult[] = [];

    // 测试密钥生成
    results.push(await this.testKeyGeneration(encryptionService));
    
    // 测试密钥强度
    results.push(await this.testKeyStrength(encryptionService));
    
    // 测试密钥轮换
    results.push(await this.testKeyRotation(encryptionService));
    
    // 测试密钥存储
    results.push(await this.testKeyStorage(encryptionService));

    return results;
  }

  /**
   * 测试密钥生成
   */
  private async testKeyGeneration(encryptionService: EncryptionService): Promise<EncryptionTestResult> {
    const startTime = Date.now();
    const issues: EncryptionIssue[] = [];

    try {
      const keys: string[] = [];
      
      // 生成多个密钥测试随机性
      for (let i = 0; i < 10; i++) {
        const key = await encryptionService.generateKey('AES-256');
        keys.push(key);
      }

      // 检查密钥唯一性
      const uniqueKeys = new Set(keys);
      if (uniqueKeys.size !== keys.length) {
        issues.push({
          type: 'weak_key',
          severity: 'critical',
          description: '密钥生成缺乏随机性，存在重复密钥',
          recommendation: '改进密钥生成的随机性'
        });
      }

      // 检查密钥长度
      const keyLength = Buffer.from(keys[0], 'base64').length * 8;
      if (keyLength < this.config.keyStrengthRequirements.minimumSymmetricKeySize) {
        issues.push({
          type: 'weak_key',
          severity: 'high',
          description: `密钥长度 ${keyLength} 位不足，建议至少 ${this.config.keyStrengthRequirements.minimumSymmetricKeySize} 位`,
          recommendation: '增加密钥长度'
        });
      }

      return {
        testName: 'Key Generation Test',
        algorithm: { name: 'AES-256', type: 'symmetric', keySize: 256, description: 'Key generation test' },
        testType: 'key_management',
        status: issues.length === 0 ? 'passed' : issues.some(i => i.severity === 'critical') ? 'failed' : 'warning',
        executionTime: Date.now() - startTime,
        details: {
          originalData: 'key generation test',
          keyInfo: {
            algorithm: 'AES-256',
            keySize: keyLength,
            keyStrength: this.calculateKeyStrength(keys[0]),
            generationMethod: 'crypto.randomBytes',
            isSecure: keyLength >= this.config.keyStrengthRequirements.minimumSymmetricKeySize
          }
        },
        securityLevel: this.assessKeySecurityLevel(keyLength),
        issues
      };
    } catch (error) {
      return {
        testName: 'Key Generation Test',
        algorithm: { name: 'AES-256', type: 'symmetric', keySize: 256, description: 'Key generation test' },
        testType: 'key_management',
        status: 'error',
        executionTime: Date.now() - startTime,
        details: {
          originalData: 'key generation test',
          keyInfo: { algorithm: 'AES-256', keySize: 0, keyStrength: 0, generationMethod: 'unknown', isSecure: false }
        },
        securityLevel: 'weak',
        issues: [{
          type: 'implementation_error',
          severity: 'critical',
          description: `密钥生成失败: ${error}`,
          recommendation: '检查密钥生成实现'
        }]
      };
    }
  }

  /**
   * 测试密钥强度
   */
  private async testKeyStrength(encryptionService: EncryptionService): Promise<EncryptionTestResult> {
    const startTime = Date.now();
    const issues: EncryptionIssue[] = [];

    try {
      // 测试弱密钥
      const weakKeys = ['password', '123456', 'admin', 'qwerty'];
      
      for (const weakKey of weakKeys) {
        const strength = this.calculateKeyStrength(weakKey);
        if (strength < this.config.keyStrengthRequirements.requiredRandomness) {
          issues.push({
            type: 'weak_key',
            severity: 'critical',
            description: `检测到弱密钥: ${weakKey}`,
            recommendation: '禁止使用弱密钥，实施密钥强度检查'
          });
        }
      }

      // 测试强密钥
      const strongKey = await encryptionService.generateKey('AES-256');
      const strongKeyStrength = this.calculateKeyStrength(strongKey);

      return {
        testName: 'Key Strength Test',
        algorithm: { name: 'AES-256', type: 'symmetric', keySize: 256, description: 'Key strength test' },
        testType: 'key_management',
        status: issues.length === 0 ? 'passed' : 'failed',
        executionTime: Date.now() - startTime,
        details: {
          originalData: 'key strength test',
          keyInfo: {
            algorithm: 'AES-256',
            keySize: 256,
            keyStrength: strongKeyStrength,
            generationMethod: 'secure random',
            isSecure: strongKeyStrength >= this.config.keyStrengthRequirements.requiredRandomness
          }
        },
        securityLevel: strongKeyStrength >= this.config.keyStrengthRequirements.requiredRandomness ? 'strong' : 'weak',
        issues
      };
    } catch (error) {
      return {
        testName: 'Key Strength Test',
        algorithm: { name: 'AES-256', type: 'symmetric', keySize: 256, description: 'Key strength test' },
        testType: 'key_management',
        status: 'error',
        executionTime: Date.now() - startTime,
        details: {
          originalData: 'key strength test',
          keyInfo: { algorithm: 'AES-256', keySize: 0, keyStrength: 0, generationMethod: 'unknown', isSecure: false }
        },
        securityLevel: 'weak',
        issues: [{
          type: 'implementation_error',
          severity: 'critical',
          description: `密钥强度测试失败: ${error}`,
          recommendation: '检查密钥强度验证实现'
        }]
      };
    }
  }

  /**
   * 测试密钥轮换
   */
  private async testKeyRotation(encryptionService: EncryptionService): Promise<EncryptionTestResult> {
    const startTime = Date.now();
    const issues: EncryptionIssue[] = [];

    try {
      const testData = 'key rotation test data';
      
      // 生成初始密钥
      const oldKey = await encryptionService.generateKey('AES-256');
      const encryptedWithOldKey = await encryptionService.encrypt(testData, 'AES-256', { key: oldKey });
      
      // 轮换密钥
      const newKey = await encryptionService.generateKey('AES-256');
      
      // 验证新密钥可以加密
      const encryptedWithNewKey = await encryptionService.encrypt(testData, 'AES-256', { key: newKey });
      
      // 验证旧密钥仍可解密历史数据
      const decryptedWithOldKey = await encryptionService.decrypt(encryptedWithOldKey, 'AES-256', { key: oldKey });
      
      // 验证新密钥可以解密新数据
      const decryptedWithNewKey = await encryptionService.decrypt(encryptedWithNewKey, 'AES-256', { key: newKey });

      const rotationWorked = decryptedWithOldKey === testData && decryptedWithNewKey === testData;

      if (!rotationWorked) {
        issues.push({
          type: 'implementation_error',
          severity: 'high',
          description: '密钥轮换后数据解密失败',
          recommendation: '检查密钥轮换实现'
        });
      }

      return {
        testName: 'Key Rotation Test',
        algorithm: { name: 'AES-256', type: 'symmetric', keySize: 256, description: 'Key rotation test' },
        testType: 'key_management',
        status: rotationWorked ? 'passed' : 'failed',
        executionTime: Date.now() - startTime,
        details: {
          originalData: testData,
          encryptedData: encryptedWithNewKey,
          decryptedData: decryptedWithNewKey,
          keyInfo: {
            algorithm: 'AES-256',
            keySize: 256,
            keyStrength: this.calculateKeyStrength(newKey),
            generationMethod: 'secure random',
            isSecure: true
          }
        },
        securityLevel: 'strong',
        issues
      };
    } catch (error) {
      return {
        testName: 'Key Rotation Test',
        algorithm: { name: 'AES-256', type: 'symmetric', keySize: 256, description: 'Key rotation test' },
        testType: 'key_management',
        status: 'error',
        executionTime: Date.now() - startTime,
        details: {
          originalData: 'key rotation test',
          keyInfo: { algorithm: 'AES-256', keySize: 0, keyStrength: 0, generationMethod: 'unknown', isSecure: false }
        },
        securityLevel: 'weak',
        issues: [{
          type: 'implementation_error',
          severity: 'critical',
          description: `密钥轮换测试失败: ${error}`,
          recommendation: '检查密钥轮换实现'
        }]
      };
    }
  }

  /**
   * 测试密钥存储
   */
  private async testKeyStorage(encryptionService: EncryptionService): Promise<EncryptionTestResult> {
    const startTime = Date.now();
    const issues: EncryptionIssue[] = [];

    try {
      // 生成测试密钥
      const key = await encryptionService.generateKey('AES-256');
      
      // 存储密钥
      await encryptionService.storeKey('test-key-id', key);
      
      // 检索密钥
      const retrievedKey = await encryptionService.retrieveKey('test-key-id');
      
      // 验证密钥一致性
      const keysMatch = key === retrievedKey;
      
      if (!keysMatch) {
        issues.push({
          type: 'implementation_error',
          severity: 'critical',
          description: '密钥存储和检索不一致',
          recommendation: '检查密钥存储实现'
        });
      }

      // 测试密钥删除
      await encryptionService.deleteKey('test-key-id');
      
      try {
        await encryptionService.retrieveKey('test-key-id');
        issues.push({
          type: 'implementation_error',
          severity: 'medium',
          description: '已删除的密钥仍可访问',
          recommendation: '确保密钥删除的彻底性'
        });
      } catch {
        // 预期行为：密钥应该不存在
      }

      return {
        testName: 'Key Storage Test',
        algorithm: { name: 'AES-256', type: 'symmetric', keySize: 256, description: 'Key storage test' },
        testType: 'key_management',
        status: keysMatch && issues.length === 0 ? 'passed' : 'failed',
        executionTime: Date.now() - startTime,
        details: {
          originalData: 'key storage test',
          keyInfo: {
            algorithm: 'AES-256',
            keySize: 256,
            keyStrength: this.calculateKeyStrength(key),
            generationMethod: 'secure random',
            isSecure: true
          }
        },
        securityLevel: 'strong',
        issues
      };
    } catch (error) {
      return {
        testName: 'Key Storage Test',
        algorithm: { name: 'AES-256', type: 'symmetric', keySize: 256, description: 'Key storage test' },
        testType: 'key_management',
        status: 'error',
        executionTime: Date.now() - startTime,
        details: {
          originalData: 'key storage test',
          keyInfo: { algorithm: 'AES-256', keySize: 0, keyStrength: 0, generationMethod: 'unknown', isSecure: false }
        },
        securityLevel: 'weak',
        issues: [{
          type: 'implementation_error',
          severity: 'critical',
          description: `密钥存储测试失败: ${error}`,
          recommendation: '检查密钥存储实现'
        }]
      };
    }
  }

  /**
   * 运行数据完整性测试
   */
  private async runDataIntegrityTests(encryptionService: EncryptionService): Promise<EncryptionTestResult[]> {
    const results: EncryptionTestResult[] = [];

    for (const testData of this.config.testDataSets) {
      const result = await this.testDataIntegrity(testData, encryptionService);
      results.push(result);
    }

    return results;
  }

  /**
   * 测试数据完整性
   */
  private async testDataIntegrity(testData: TestDataSet, encryptionService: EncryptionService): Promise<EncryptionTestResult> {
    const startTime = Date.now();
    const issues: EncryptionIssue[] = [];

    try {
      const key = await encryptionService.generateKey('AES-256');
      
      // 加密数据
      const encryptedData = await encryptionService.encrypt(testData.data, 'AES-256', { key });
      
      // 计算原始数据哈希
      const originalHash = crypto.createHash('sha256').update(testData.data).digest('hex');
      
      // 解密数据
      const decryptedData = await encryptionService.decrypt(encryptedData, 'AES-256', { key });
      
      // 计算解密数据哈希
      const decryptedHash = crypto.createHash('sha256').update(decryptedData).digest('hex');
      
      // 验证完整性
      const integrityCheck: IntegrityCheckResult = {
        hashMatch: originalHash === decryptedHash,
        dataCorruption: testData.data !== decryptedData,
        tamperingDetected: false,
        checksumValid: true
      };

      // 测试篡改检测
      const tamperedData = encryptedData.slice(0, -10) + 'tampered123';
      try {
        await encryptionService.decrypt(tamperedData, 'AES-256', { key });
        issues.push({
          type: 'integrity_failure',
          severity: 'critical',
          description: '未能检测到数据篡改',
          recommendation: '实施数据完整性验证机制'
        });
      } catch {
        integrityCheck.tamperingDetected = true;
      }

      if (!integrityCheck.hashMatch || integrityCheck.dataCorruption) {
        issues.push({
          type: 'integrity_failure',
          severity: 'critical',
          description: '数据完整性验证失败',
          recommendation: '检查加密解密实现'
        });
      }

      return {
        testName: `Data Integrity Test - ${testData.name}`,
        algorithm: { name: 'AES-256', type: 'symmetric', keySize: 256, description: 'Data integrity test' },
        testType: 'data_integrity',
        status: issues.length === 0 ? 'passed' : 'failed',
        executionTime: Date.now() - startTime,
        details: {
          originalData: testData.data,
          encryptedData,
          decryptedData,
          keyInfo: {
            algorithm: 'AES-256',
            keySize: 256,
            keyStrength: this.calculateKeyStrength(key),
            generationMethod: 'secure random',
            isSecure: true
          },
          integrityCheck
        },
        securityLevel: 'strong',
        issues
      };
    } catch (error) {
      return {
        testName: `Data Integrity Test - ${testData.name}`,
        algorithm: { name: 'AES-256', type: 'symmetric', keySize: 256, description: 'Data integrity test' },
        testType: 'data_integrity',
        status: 'error',
        executionTime: Date.now() - startTime,
        details: {
          originalData: testData.data,
          keyInfo: { algorithm: 'AES-256', keySize: 0, keyStrength: 0, generationMethod: 'unknown', isSecure: false }
        },
        securityLevel: 'weak',
        issues: [{
          type: 'implementation_error',
          severity: 'critical',
          description: `数据完整性测试失败: ${error}`,
          recommendation: '检查加密服务实现'
        }]
      };
    }
  }

  /**
   * 运行性能测试
   */
  private async runPerformanceTests(encryptionService: EncryptionService): Promise<EncryptionTestResult[]> {
    const results: EncryptionTestResult[] = [];

    for (const algorithm of this.config.supportedAlgorithms) {
      for (const testData of this.config.testDataSets) {
        const result = await this.testEncryptionPerformance(algorithm, testData, encryptionService);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * 测试加密性能
   */
  private async testEncryptionPerformance(algorithm: EncryptionAlgorithm, testData: TestDataSet, encryptionService: EncryptionService): Promise<EncryptionTestResult> {
    const startTime = Date.now();
    const issues: EncryptionIssue[] = [];

    try {
      const key = await this.generateTestKey(algorithm);
      
      // 测试加密性能
      const encryptStartTime = process.hrtime.bigint();
      const encryptedData = await encryptionService.encrypt(testData.data, algorithm.name, key);
      const encryptEndTime = process.hrtime.bigint();
      const encryptionTime = Number(encryptEndTime - encryptStartTime) / 1000000; // 转换为毫秒

      // 测试解密性能
      const decryptStartTime = process.hrtime.bigint();
      const decryptedData = await encryptionService.decrypt(encryptedData, algorithm.name, key);
      const decryptEndTime = process.hrtime.bigint();
      const decryptionTime = Number(decryptEndTime - decryptStartTime) / 1000000; // 转换为毫秒

      // 计算吞吐量
      const throughput = (testData.size / (encryptionTime + decryptionTime)) * 1000; // bytes per second

      const performanceMetrics: PerformanceMetrics = {
        encryptionTime,
        decryptionTime,
        throughput,
        memoryUsage: process.memoryUsage().heapUsed
      };

      // 性能阈值检查
      const maxAcceptableTime = 1000; // 1秒
      if (encryptionTime > maxAcceptableTime || decryptionTime > maxAcceptableTime) {
        issues.push({
          type: 'poor_performance',
          severity: 'medium',
          description: `加密/解密性能较差: 加密${encryptionTime}ms, 解密${decryptionTime}ms`,
          recommendation: '优化加密算法实现或考虑使用更高效的算法'
        });
      }

      return {
        testName: `Performance Test - ${algorithm.name} with ${testData.name}`,
        algorithm,
        testType: 'performance',
        status: issues.length === 0 ? 'passed' : 'warning',
        executionTime: Date.now() - startTime,
        details: {
          originalData: testData.data,
          encryptedData,
          decryptedData,
          keyInfo: key,
          performanceMetrics
        },
        securityLevel: 'strong',
        issues
      };
    } catch (error) {
      return {
        testName: `Performance Test - ${algorithm.name} with ${testData.name}`,
        algorithm,
        testType: 'performance',
        status: 'error',
        executionTime: Date.now() - startTime,
        details: {
          originalData: testData.data,
          keyInfo: { algorithm: algorithm.name, keySize: 0, keyStrength: 0, generationMethod: 'unknown', isSecure: false }
        },
        securityLevel: 'weak',
        issues: [{
          type: 'implementation_error',
          severity: 'critical',
          description: `性能测试失败: ${error}`,
          recommendation: '检查加密服务实现'
        }]
      };
    }
  }

  // 辅助方法
  private async generateTestKey(algorithm: EncryptionAlgorithm): Promise<KeyInfo> {
    const keyBuffer = crypto.randomBytes(algorithm.keySize / 8);
    const key = keyBuffer.toString('base64');
    
    return {
      algorithm: algorithm.name,
      keySize: algorithm.keySize,
      keyStrength: this.calculateKeyStrength(key),
      generationMethod: 'crypto.randomBytes',
      isSecure: algorithm.keySize >= this.config.keyStrengthRequirements.minimumSymmetricKeySize,
      key
    };
  }

  private calculateKeyStrength(key: string): number {
    // 简化的密钥强度计算
    const entropy = this.calculateEntropy(key);
    return Math.min(entropy * key.length, 256);
  }

  private calculateEntropy(str: string): number {
    const freq: Record<string, number> = {};
    for (const char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }
    
    let entropy = 0;
    const len = str.length;
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    
    return entropy;
  }

  private assessAlgorithmSecurity(algorithm: EncryptionAlgorithm): 'weak' | 'acceptable' | 'strong' | 'excellent' {
    if (algorithm.keySize >= 256) return 'excellent';
    if (algorithm.keySize >= 128) return 'strong';
    if (algorithm.keySize >= 64) return 'acceptable';
    return 'weak';
  }

  private assessKeySecurityLevel(keySize: number): 'weak' | 'acceptable' | 'strong' | 'excellent' {
    if (keySize >= 256) return 'excellent';
    if (keySize >= 128) return 'strong';
    if (keySize >= 64) return 'acceptable';
    return 'weak';
  }

  /**
   * 生成加密验证报告
   */
  generateEncryptionReport(results: EncryptionTestResult[]): EncryptionReport {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.status === 'passed').length;
    const failedTests = results.filter(r => r.status === 'failed').length;
    const warningTests = results.filter(r => r.status === 'warning').length;
    const errorTests = results.filter(r => r.status === 'error').length;

    const securityLevels = {
      excellent: results.filter(r => r.securityLevel === 'excellent').length,
      strong: results.filter(r => r.securityLevel === 'strong').length,
      acceptable: results.filter(r => r.securityLevel === 'acceptable').length,
      weak: results.filter(r => r.securityLevel === 'weak').length
    };

    const allIssues = results.flatMap(r => r.issues);
    const criticalIssues = allIssues.filter(i => i.severity === 'critical').length;
    const highIssues = allIssues.filter(i => i.severity === 'high').length;
    const mediumIssues = allIssues.filter(i => i.severity === 'medium').length;
    const lowIssues = allIssues.filter(i => i.severity === 'low').length;

    return {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        warningTests,
        errorTests,
        passRate: (passedTests / totalTests) * 100
      },
      securityLevels,
      issueDistribution: {
        critical: criticalIssues,
        high: highIssues,
        medium: mediumIssues,
        low: lowIssues
      },
      testResults: results,
      recommendations: this.generateEncryptionRecommendations(results),
      timestamp: new Date()
    };
  }

  private generateEncryptionRecommendations(results: EncryptionTestResult[]): string[] {
    const recommendations: string[] = [];
    const allIssues = results.flatMap(r => r.issues);

    if (allIssues.some(i => i.type === 'weak_algorithm')) {
      recommendations.push('升级到更强的加密算法');
    }

    if (allIssues.some(i => i.type === 'weak_key')) {
      recommendations.push('加强密钥生成和管理策略');
    }

    if (allIssues.some(i => i.type === 'poor_performance')) {
      recommendations.push('优化加密性能或选择更高效的算法');
    }

    if (allIssues.some(i => i.type === 'integrity_failure')) {
      recommendations.push('实施数据完整性验证机制');
    }

    if (allIssues.some(i => i.type === 'implementation_error')) {
      recommendations.push('修复加密服务实现问题');
    }

    if (recommendations.length === 0) {
      recommendations.push('加密实现安全性良好，继续保持当前标准');
    }

    return recommendations;
  }
}

// 加密服务接口
export interface EncryptionService {
  encrypt(data: string, algorithm: string, keyInfo: any): Promise<string>;
  decrypt(encryptedData: string, algorithm: string, keyInfo: any): Promise<string>;
  generateKey(algorithm: string): Promise<string>;
  storeKey(keyId: string, key: string): Promise<void>;
  retrieveKey(keyId: string): Promise<string>;
  deleteKey(keyId: string): Promise<void>;
}

export interface EncryptionReport {
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    warningTests: number;
    errorTests: number;
    passRate: number;
  };
  securityLevels: {
    excellent: number;
    strong: number;
    acceptable: number;
    weak: number;
  };
  issueDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  testResults: EncryptionTestResult[];
  recommendations: string[];
  timestamp: Date;
}