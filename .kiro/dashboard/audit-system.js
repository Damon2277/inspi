/**
 * 操作历史和审计系统
 * Operation History and Audit System
 * 
 * 记录、跟踪和审计所有系统操作
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class AuditSystem {
  constructor() {
    this.auditLogPath = '.kiro/dashboard/audit-logs';
    this.operationLogPath = '.kiro/dashboard/operation-logs';
    this.currentSession = this._generateSessionId();
    this.operationQueue = [];
    this.isInitialized = false;
  }

  /**
   * 初始化审计系统
   * Initialize audit system
   */
  async initialize() {
    try {
      // 确保审计目录存在
      await fs.mkdir(this.auditLogPath, { recursive: true });
      await fs.mkdir(this.operationLogPath, { recursive: true });

      // 创建会话开始记录
      await this._logSessionStart();

      this.isInitialized = true;
      console.log('✅ 审计系统初始化完成');

    } catch (error) {
      console.error('❌ 审计系统初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 记录操作
   * Log operation
   */
  async logOperation(operation) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const logEntry = {
      id: this._generateOperationId(),
      sessionId: this.currentSession,
      timestamp: new Date().toISOString(),
      type: operation.type,
      action: operation.action,
      user: operation.user || 'system',
      source: operation.source || 'dashboard',
      parameters: operation.parameters || {},
      result: operation.result || {},
      status: operation.status || 'completed',
      duration: operation.duration || 0,
      ipAddress: operation.ipAddress || 'localhost',
      userAgent: operation.userAgent || 'dashboard-system',
      checksum: null
    };

    // 计算校验和
    logEntry.checksum = this._calculateChecksum(logEntry);

    try {
      // 写入操作日志
      await this._writeOperationLog(logEntry);

      // 添加到操作队列
      this.operationQueue.push(logEntry);

      // 如果队列过长，写入审计日志
      if (this.operationQueue.length >= 10) {
        await this._flushAuditLog();
      }

      return logEntry.id;

    } catch (error) {
      console.error('❌ 记录操作失败:', error.message);
      throw error;
    }
  }

  /**
   * 记录安全事件
   * Log security event
   */
  async logSecurityEvent(event) {
    const securityEntry = {
      id: this._generateOperationId(),
      sessionId: this.currentSession,
      timestamp: new Date().toISOString(),
      type: 'security_event',
      eventType: event.type,
      severity: event.severity || 'medium',
      description: event.description,
      source: event.source || 'system',
      ipAddress: event.ipAddress || 'localhost',
      details: event.details || {},
      checksum: null
    };

    securityEntry.checksum = this._calculateChecksum(securityEntry);

    try {
      // 立即写入安全日志
      await this._writeSecurityLog(securityEntry);

      // 如果是高危事件，立即刷新审计日志
      if (event.severity === 'high' || event.severity === 'critical') {
        await this._flushAuditLog();
      }

      return securityEntry.id;

    } catch (error) {
      console.error('❌ 记录安全事件失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取操作历史
   * Get operation history
   */
  async getOperationHistory(filters = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        type = null,
        user = null,
        startDate = null,
        endDate = null,
        status = null
      } = filters;

      // 读取操作日志文件
      const logFiles = await this._getLogFiles('operation');
      const operations = [];

      for (const file of logFiles.slice(-10)) { // 只读取最近10个文件
        try {
          const content = await fs.readFile(path.join(this.operationLogPath, file), 'utf8');
          const fileOperations = content.split('\n')
            .filter(line => line.trim())
            .map(line => {
              try {
                return JSON.parse(line);
              } catch {
                return null;
              }
            })
            .filter(op => op !== null);

          operations.push(...fileOperations);
        } catch (error) {
          console.warn(`读取日志文件失败: ${file}`, error.message);
        }
      }

      // 应用过滤器
      let filteredOperations = operations;

      if (type) {
        filteredOperations = filteredOperations.filter(op => op.type === type);
      }

      if (user) {
        filteredOperations = filteredOperations.filter(op => op.user === user);
      }

      if (status) {
        filteredOperations = filteredOperations.filter(op => op.status === status);
      }

      if (startDate) {
        filteredOperations = filteredOperations.filter(op => 
          new Date(op.timestamp) >= new Date(startDate)
        );
      }

      if (endDate) {
        filteredOperations = filteredOperations.filter(op => 
          new Date(op.timestamp) <= new Date(endDate)
        );
      }

      // 按时间倒序排列
      filteredOperations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // 应用分页
      const paginatedOperations = filteredOperations.slice(offset, offset + limit);

      return {
        operations: paginatedOperations,
        total: filteredOperations.length,
        limit,
        offset,
        hasMore: offset + limit < filteredOperations.length
      };

    } catch (error) {
      console.error('❌ 获取操作历史失败:', error.message);
      return {
        operations: [],
        total: 0,
        error: error.message
      };
    }
  }

  /**
   * 生成审计报告
   * Generate audit report
   */
  async generateAuditReport(options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 默认7天前
        endDate = new Date(),
        includeDetails = false
      } = options;

      const report = {
        id: this._generateOperationId(),
        timestamp: new Date().toISOString(),
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        summary: {
          totalOperations: 0,
          successfulOperations: 0,
          failedOperations: 0,
          securityEvents: 0,
          uniqueUsers: new Set(),
          operationTypes: {},
          dailyActivity: {}
        },
        details: includeDetails ? [] : null,
        recommendations: []
      };

      // 获取指定时间范围内的操作
      const history = await this.getOperationHistory({
        startDate,
        endDate,
        limit: 10000
      });

      // 统计分析
      history.operations.forEach(operation => {
        report.summary.totalOperations++;
        
        if (operation.status === 'completed' || operation.status === 'success') {
          report.summary.successfulOperations++;
        } else if (operation.status === 'failed' || operation.status === 'error') {
          report.summary.failedOperations++;
        }

        report.summary.uniqueUsers.add(operation.user);

        // 统计操作类型
        if (!report.summary.operationTypes[operation.type]) {
          report.summary.operationTypes[operation.type] = 0;
        }
        report.summary.operationTypes[operation.type]++;

        // 统计每日活动
        const date = new Date(operation.timestamp).toISOString().split('T')[0];
        if (!report.summary.dailyActivity[date]) {
          report.summary.dailyActivity[date] = 0;
        }
        report.summary.dailyActivity[date]++;

        // 添加详细信息
        if (includeDetails) {
          report.details.push({
            timestamp: operation.timestamp,
            type: operation.type,
            action: operation.action,
            user: operation.user,
            status: operation.status,
            duration: operation.duration
          });
        }
      });

      // 转换Set为数组长度
      report.summary.uniqueUsers = report.summary.uniqueUsers.size;

      // 生成建议
      report.recommendations = this._generateAuditRecommendations(report.summary);

      // 保存报告
      await this._saveAuditReport(report);

      return report;

    } catch (error) {
      console.error('❌ 生成审计报告失败:', error.message);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 验证日志完整性
   * Verify log integrity
   */
  async verifyLogIntegrity(options = {}) {
    try {
      const { checkPeriod = 24 } = options; // 默认检查24小时内的日志
      
      const verification = {
        timestamp: new Date().toISOString(),
        period: `${checkPeriod} hours`,
        results: {
          totalLogs: 0,
          validLogs: 0,
          corruptedLogs: 0,
          missingLogs: 0,
          integrity: 'unknown'
        },
        issues: [],
        recommendations: []
      };

      // 获取需要验证的日志
      const cutoffTime = new Date(Date.now() - checkPeriod * 60 * 60 * 1000);
      const history = await this.getOperationHistory({
        startDate: cutoffTime,
        limit: 10000
      });

      // 验证每个日志条目
      history.operations.forEach(operation => {
        verification.results.totalLogs++;

        // 验证校验和
        const expectedChecksum = this._calculateChecksum({
          ...operation,
          checksum: null
        });

        if (operation.checksum === expectedChecksum) {
          verification.results.validLogs++;
        } else {
          verification.results.corruptedLogs++;
          verification.issues.push({
            type: 'checksum_mismatch',
            operationId: operation.id,
            timestamp: operation.timestamp,
            description: '校验和不匹配，可能数据被篡改'
          });
        }

        // 验证必要字段
        const requiredFields = ['id', 'timestamp', 'type', 'action', 'user'];
        const missingFields = requiredFields.filter(field => !operation[field]);
        
        if (missingFields.length > 0) {
          verification.issues.push({
            type: 'missing_fields',
            operationId: operation.id,
            timestamp: operation.timestamp,
            description: `缺少必要字段: ${missingFields.join(', ')}`
          });
        }
      });

      // 计算完整性状态
      const integrityRate = verification.results.totalLogs > 0 ? 
        verification.results.validLogs / verification.results.totalLogs : 0;

      if (integrityRate >= 0.95) {
        verification.results.integrity = 'good';
      } else if (integrityRate >= 0.8) {
        verification.results.integrity = 'warning';
      } else {
        verification.results.integrity = 'critical';
      }

      // 生成建议
      if (verification.results.corruptedLogs > 0) {
        verification.recommendations.push('发现损坏的日志条目，建议检查系统安全性');
      }

      if (verification.results.integrity === 'critical') {
        verification.recommendations.push('日志完整性严重受损，建议立即调查');
      }

      return verification;

    } catch (error) {
      console.error('❌ 验证日志完整性失败:', error.message);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 清理旧日志
   * Clean up old logs
   */
  async cleanupOldLogs(options = {}) {
    try {
      const { retentionDays = 30 } = options;
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      const cleanup = {
        timestamp: new Date().toISOString(),
        retentionDays,
        cutoffDate: cutoffDate.toISOString(),
        results: {
          filesChecked: 0,
          filesDeleted: 0,
          spaceFreed: 0
        }
      };

      // 清理操作日志
      const operationFiles = await this._getLogFiles('operation');
      for (const file of operationFiles) {
        const filePath = path.join(this.operationLogPath, file);
        const stats = await fs.stat(filePath);
        
        cleanup.results.filesChecked++;
        
        if (stats.mtime < cutoffDate) {
          cleanup.results.spaceFreed += stats.size;
          await fs.unlink(filePath);
          cleanup.results.filesDeleted++;
        }
      }

      // 清理审计日志
      const auditFiles = await this._getLogFiles('audit');
      for (const file of auditFiles) {
        const filePath = path.join(this.auditLogPath, file);
        const stats = await fs.stat(filePath);
        
        cleanup.results.filesChecked++;
        
        if (stats.mtime < cutoffDate) {
          cleanup.results.spaceFreed += stats.size;
          await fs.unlink(filePath);
          cleanup.results.filesDeleted++;
        }
      }

      console.log(`🧹 日志清理完成: 删除 ${cleanup.results.filesDeleted} 个文件，释放 ${Math.round(cleanup.results.spaceFreed / 1024)} KB 空间`);

      return cleanup;

    } catch (error) {
      console.error('❌ 清理旧日志失败:', error.message);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // 私有方法

  /**
   * 生成会话ID
   */
  _generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成操作ID
   */
  _generateOperationId() {
    return `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 计算校验和
   */
  _calculateChecksum(data) {
    const content = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * 记录会话开始
   */
  async _logSessionStart() {
    const sessionEntry = {
      sessionId: this.currentSession,
      timestamp: new Date().toISOString(),
      type: 'session_start',
      details: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    await this._writeOperationLog(sessionEntry);
  }

  /**
   * 写入操作日志
   */
  async _writeOperationLog(entry) {
    const date = new Date().toISOString().split('T')[0];
    const filename = `operations-${date}.log`;
    const filepath = path.join(this.operationLogPath, filename);
    
    const logLine = JSON.stringify(entry) + '\n';
    await fs.appendFile(filepath, logLine);
  }

  /**
   * 写入安全日志
   */
  async _writeSecurityLog(entry) {
    const date = new Date().toISOString().split('T')[0];
    const filename = `security-${date}.log`;
    const filepath = path.join(this.auditLogPath, filename);
    
    const logLine = JSON.stringify(entry) + '\n';
    await fs.appendFile(filepath, logLine);
  }

  /**
   * 刷新审计日志
   */
  async _flushAuditLog() {
    if (this.operationQueue.length === 0) return;

    const date = new Date().toISOString().split('T')[0];
    const filename = `audit-${date}.log`;
    const filepath = path.join(this.auditLogPath, filename);

    const auditBatch = {
      timestamp: new Date().toISOString(),
      sessionId: this.currentSession,
      batchId: this._generateOperationId(),
      operations: [...this.operationQueue]
    };

    const logLine = JSON.stringify(auditBatch) + '\n';
    await fs.appendFile(filepath, logLine);

    // 清空队列
    this.operationQueue = [];
  }

  /**
   * 获取日志文件列表
   */
  async _getLogFiles(type) {
    const logDir = type === 'operation' ? this.operationLogPath : this.auditLogPath;
    
    try {
      const files = await fs.readdir(logDir);
      return files.filter(file => file.endsWith('.log')).sort();
    } catch (error) {
      return [];
    }
  }

  /**
   * 保存审计报告
   */
  async _saveAuditReport(report) {
    const filename = `audit-report-${Date.now()}.json`;
    const filepath = path.join(this.auditLogPath, filename);
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
  }

  /**
   * 生成审计建议
   */
  _generateAuditRecommendations(summary) {
    const recommendations = [];

    // 失败率检查
    const failureRate = summary.totalOperations > 0 ? 
      summary.failedOperations / summary.totalOperations : 0;

    if (failureRate > 0.1) {
      recommendations.push({
        type: 'high_failure_rate',
        priority: 'high',
        description: `操作失败率过高 (${Math.round(failureRate * 100)}%)，建议检查系统稳定性`
      });
    }

    // 活动模式检查
    const dailyActivities = Object.values(summary.dailyActivity);
    const avgActivity = dailyActivities.reduce((a, b) => a + b, 0) / dailyActivities.length;
    
    if (avgActivity > 100) {
      recommendations.push({
        type: 'high_activity',
        priority: 'medium',
        description: '系统活动频繁，建议监控性能指标'
      });
    }

    // 用户活动检查
    if (summary.uniqueUsers < 2) {
      recommendations.push({
        type: 'single_user',
        priority: 'low',
        description: '只有单一用户活动，建议考虑访问控制'
      });
    }

    return recommendations;
  }
}

module.exports = AuditSystem;