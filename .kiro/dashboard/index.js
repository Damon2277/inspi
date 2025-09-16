/**
 * 开发者仪表板系统 - 主入口
 * Developer Dashboard System - Main Entry
 * 
 * 整合所有项目管理系统，提供统一的可视化界面
 */

const express = require('express');
const path = require('path');
const cors = require('cors');

// 导入各个系统
const ProjectStateRecoverySystem = require('../recovery-points');
const QualityCheckSystem = require('../quality-checks');
const StyleRecoverySystem = require('../style-recovery');
const OneClickTools = require('./one-click-tools');
const AuditSystem = require('./audit-system');

class DeveloperDashboard {
  constructor() {
    this.app = express();
    this.port = process.env.DASHBOARD_PORT || 3001;
    
    // 初始化各个系统
    this.recoverySystem = new ProjectStateRecoverySystem();
    this.qualitySystem = new QualityCheckSystem();
    this.styleSystem = new StyleRecoverySystem();
    
    // 初始化一键操作工具
    this.oneClickTools = new OneClickTools({
      recoverySystem: this.recoverySystem,
      qualitySystem: this.qualitySystem,
      styleSystem: this.styleSystem
    });

    // 初始化审计系统
    this.auditSystem = new AuditSystem();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupStaticFiles();
  }

  /**
   * 设置中间件
   * Setup middleware
   */
  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // 日志中间件
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });

    // 审计中间件
    this.app.use(async (req, res, next) => {
      const startTime = Date.now();
      
      // 记录请求开始
      const originalSend = res.send;
      res.send = async function(data) {
        const duration = Date.now() - startTime;
        
        // 记录API操作到审计日志
        if (req.path.startsWith('/api/')) {
          try {
            await this.auditSystem.logOperation({
              type: 'api_request',
              action: `${req.method} ${req.path}`,
              user: req.headers['x-user'] || 'anonymous',
              source: 'dashboard_api',
              parameters: {
                method: req.method,
                path: req.path,
                query: req.query,
                body: req.method !== 'GET' ? req.body : undefined
              },
              result: {
                statusCode: res.statusCode,
                responseSize: data ? data.length : 0
              },
              status: res.statusCode < 400 ? 'completed' : 'failed',
              duration,
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.headers['user-agent']
            });
          } catch (error) {
            console.warn('审计记录失败:', error.message);
          }
        }
        
        originalSend.call(this, data);
      }.bind(this);
      
      next();
    });
  }

  /**
   * 设置静态文件服务
   * Setup static file serving
   */
  setupStaticFiles() {
    // 服务静态文件
    this.app.use(express.static(path.join(__dirname, 'public')));
    
    // 主页路由
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
  }

  /**
   * 设置API路由
   * Setup API routes
   */
  setupRoutes() {
    // 健康检查API
    this.app.get('/api/health', async (req, res) => {
      try {
        const health = await this.getSystemHealth();
        res.json(health);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 项目状态API
    this.app.get('/api/project-status', async (req, res) => {
      try {
        const status = await this.getProjectStatus();
        res.json(status);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 恢复系统API
    this.app.get('/api/recovery/snapshots', async (req, res) => {
      try {
        const snapshots = await this.recoverySystem.stateManager.listSnapshots();
        res.json(snapshots);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/recovery/snapshot', async (req, res) => {
      try {
        const { reason } = req.body;
        const result = await this.recoverySystem.createStateSnapshot({
          reason: reason || 'Manual snapshot from dashboard',
          type: 'manual'
        });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/recovery/diagnose', async (req, res) => {
      try {
        const diagnosis = await this.recoverySystem.diagnoseProjectHealth();
        res.json(diagnosis);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/recovery/guide', async (req, res) => {
      try {
        const { issue, context } = req.body;
        const guidance = await this.recoverySystem.getRecoveryRecommendations(issue);
        res.json(guidance);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 质量检查API
    this.app.get('/api/quality/status', async (req, res) => {
      try {
        const status = await this.qualitySystem.getSystemStatus();
        res.json(status);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/quality/check', async (req, res) => {
      try {
        const result = await this.qualitySystem.runQualityCheck();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 样式恢复API
    this.app.get('/api/style/snapshots', async (req, res) => {
      try {
        const snapshots = await this.styleSystem.snapshotManager.listSnapshots();
        res.json(snapshots);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/style/snapshot', async (req, res) => {
      try {
        const result = await this.styleSystem.createSnapshot();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/style/rollback', async (req, res) => {
      try {
        const { snapshotId } = req.body;
        const result = await this.styleSystem.rollbackManager.rollback(snapshotId);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 操作历史API
    this.app.get('/api/operations/history', async (req, res) => {
      try {
        const history = await this.getOperationHistory();
        res.json(history);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 一键操作API
    this.app.post('/api/operations/quick-fix', async (req, res) => {
      try {
        const { action, params } = req.body;
        const result = await this.executeQuickFix(action, params);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 一键健康检查API
    this.app.post('/api/operations/health-check', async (req, res) => {
      try {
        const result = await this.oneClickTools.quickHealthCheck();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 一键快速修复API
    this.app.post('/api/operations/auto-fix', async (req, res) => {
      try {
        const { issueType } = req.body;
        const result = await this.oneClickTools.quickFix(issueType);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 一键系统重置API
    this.app.post('/api/operations/system-reset', async (req, res) => {
      try {
        const { options } = req.body;
        const result = await this.oneClickTools.quickReset(options);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 批量操作API
    this.app.post('/api/operations/batch', async (req, res) => {
      try {
        const { operations, options } = req.body;
        const result = await this.oneClickTools.batchOperations(operations, options);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 获取可用操作列表API
    this.app.get('/api/operations/available', async (req, res) => {
      try {
        const operations = this.oneClickTools.getAvailableOperations();
        res.json({ operations });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 操作历史详情API
    this.app.get('/api/operations/history/:limit?', async (req, res) => {
      try {
        const limit = parseInt(req.params.limit) || 20;
        const history = this.oneClickTools.getOperationHistory(limit);
        res.json(history);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 审计日志API
    this.app.get('/api/audit/history', async (req, res) => {
      try {
        const filters = {
          limit: parseInt(req.query.limit) || 50,
          offset: parseInt(req.query.offset) || 0,
          type: req.query.type,
          user: req.query.user,
          startDate: req.query.startDate,
          endDate: req.query.endDate,
          status: req.query.status
        };
        
        const history = await this.auditSystem.getOperationHistory(filters);
        res.json(history);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 生成审计报告API
    this.app.post('/api/audit/report', async (req, res) => {
      try {
        const options = req.body || {};
        const report = await this.auditSystem.generateAuditReport(options);
        res.json(report);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 验证日志完整性API
    this.app.post('/api/audit/verify', async (req, res) => {
      try {
        const options = req.body || {};
        const verification = await this.auditSystem.verifyLogIntegrity(options);
        res.json(verification);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 清理旧日志API
    this.app.post('/api/audit/cleanup', async (req, res) => {
      try {
        const options = req.body || {};
        const cleanup = await this.auditSystem.cleanupOldLogs(options);
        res.json(cleanup);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  /**
   * 获取系统健康状态
   * Get system health status
   */
  async getSystemHealth() {
    const health = {
      timestamp: new Date().toISOString(),
      overall: 'unknown',
      systems: {},
      alerts: [],
      recommendations: []
    };

    try {
      // 恢复系统健康状态
      const recoveryHealth = await this.recoverySystem.diagnoseProjectHealth();
      health.systems.recovery = {
        status: recoveryHealth.overallHealth,
        issues: recoveryHealth.issues.length,
        recommendations: recoveryHealth.recommendations.length
      };

      // 质量检查系统状态
      try {
        const qualityStatus = await this.qualitySystem.getSystemStatus();
        health.systems.quality = {
          status: qualityStatus.overall || 'unknown',
          lastCheck: qualityStatus.lastCheck,
          issues: qualityStatus.issues?.length || 0
        };
      } catch (error) {
        health.systems.quality = { status: 'error', error: error.message };
      }

      // 样式系统状态
      try {
        const styleHealth = await this.styleSystem.getSystemHealth();
        health.systems.style = {
          status: styleHealth.status || 'unknown',
          snapshots: styleHealth.snapshotCount || 0,
          lastSnapshot: styleHealth.lastSnapshot
        };
      } catch (error) {
        health.systems.style = { status: 'error', error: error.message };
      }

      // 计算整体健康状态
      const systemStatuses = Object.values(health.systems).map(s => s.status);
      if (systemStatuses.includes('critical')) {
        health.overall = 'critical';
      } else if (systemStatuses.includes('warning')) {
        health.overall = 'warning';
      } else if (systemStatuses.every(s => s === 'healthy')) {
        health.overall = 'healthy';
      } else {
        health.overall = 'unknown';
      }

      // 生成警报和建议
      if (recoveryHealth.issues.length > 0) {
        health.alerts.push(`发现 ${recoveryHealth.issues.length} 个项目问题`);
      }

      if (health.systems.quality.issues > 0) {
        health.alerts.push(`质量检查发现 ${health.systems.quality.issues} 个问题`);
      }

      return health;

    } catch (error) {
      health.overall = 'error';
      health.error = error.message;
      return health;
    }
  }

  /**
   * 获取项目状态
   * Get project status
   */
  async getProjectStatus() {
    const status = {
      timestamp: new Date().toISOString(),
      project: {
        name: 'Inspi AI Platform',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      metrics: {},
      recentActivity: []
    };

    try {
      // 获取快照统计
      const snapshots = await this.recoverySystem.stateManager.listSnapshots();
      status.metrics.snapshots = {
        total: snapshots.total || 0,
        recent: snapshots.snapshots?.slice(0, 5).length || 0
      };

      // 获取样式快照统计
      try {
        const styleSnapshots = await this.styleSystem.snapshotManager.listSnapshots();
        status.metrics.styleSnapshots = {
          total: styleSnapshots.total || 0,
          recent: styleSnapshots.snapshots?.slice(0, 5).length || 0
        };
      } catch (error) {
        status.metrics.styleSnapshots = { total: 0, recent: 0, error: error.message };
      }

      // 获取最近活动
      if (snapshots.snapshots && snapshots.snapshots.length > 0) {
        status.recentActivity.push(...snapshots.snapshots.slice(0, 3).map(snapshot => ({
          type: 'snapshot_created',
          timestamp: snapshot.timestamp,
          description: `创建状态快照: ${snapshot.reason}`,
          system: 'recovery'
        })));
      }

      return status;

    } catch (error) {
      status.error = error.message;
      return status;
    }
  }

  /**
   * 获取操作历史
   * Get operation history
   */
  async getOperationHistory() {
    const history = {
      timestamp: new Date().toISOString(),
      operations: []
    };

    try {
      // 获取恢复系统的验证历史
      const validationHistory = this.recoverySystem.validator.getValidationHistory(10);
      
      validationHistory.history.forEach(record => {
        history.operations.push({
          id: record.timestamp,
          type: 'recovery_validation',
          timestamp: record.timestamp,
          phase: record.phase,
          status: record.results.passed ? 'success' : 'failed',
          description: `恢复验证 - ${record.phase}`,
          details: {
            score: `${record.results.score}/${record.results.maxScore}`,
            checks: record.results.checks.length
          }
        });
      });

      // 按时间倒序排列
      history.operations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return history;

    } catch (error) {
      history.error = error.message;
      return history;
    }
  }

  /**
   * 执行快速修复
   * Execute quick fix
   */
  async executeQuickFix(action, params = {}) {
    const result = {
      timestamp: new Date().toISOString(),
      action,
      success: false,
      message: '',
      details: {}
    };

    try {
      switch (action) {
        case 'create_snapshot':
          const snapshotResult = await this.recoverySystem.createStateSnapshot({
            reason: params.reason || 'Quick fix snapshot',
            type: 'manual'
          });
          result.success = snapshotResult.success;
          result.message = snapshotResult.success ? '快照创建成功' : '快照创建失败';
          result.details = snapshotResult;
          break;

        case 'diagnose_health':
          const diagnosis = await this.recoverySystem.diagnoseProjectHealth();
          result.success = true;
          result.message = `健康诊断完成 - 状态: ${diagnosis.overallHealth}`;
          result.details = diagnosis;
          break;

        case 'quality_check':
          const qualityResult = await this.qualitySystem.runQualityCheck();
          result.success = qualityResult.success;
          result.message = qualityResult.success ? '质量检查完成' : '质量检查失败';
          result.details = qualityResult;
          break;

        case 'style_snapshot':
          const styleResult = await this.styleSystem.createSnapshot();
          result.success = styleResult.success;
          result.message = styleResult.success ? '样式快照创建成功' : '样式快照创建失败';
          result.details = styleResult;
          break;

        default:
          result.message = `未知操作: ${action}`;
          break;
      }

      return result;

    } catch (error) {
      result.message = `操作失败: ${error.message}`;
      result.error = error.message;
      return result;
    }
  }

  /**
   * 启动仪表板服务器
   * Start dashboard server
   */
  async start() {
    try {
      // 初始化审计系统
      await this.auditSystem.initialize();

      // 记录系统启动
      await this.auditSystem.logOperation({
        type: 'system_event',
        action: 'dashboard_start',
        user: 'system',
        source: 'dashboard',
        parameters: {
          port: this.port,
          nodeVersion: process.version,
          platform: process.platform
        },
        status: 'completed'
      });

      await new Promise((resolve, reject) => {
        this.server = this.app.listen(this.port, (error) => {
          if (error) {
            reject(error);
          } else {
            console.log(`🚀 开发者仪表板启动成功!`);
            console.log(`📊 访问地址: http://localhost:${this.port}`);
            console.log(`🔧 API文档: http://localhost:${this.port}/api/health`);
            console.log(`📋 审计日志: 已启用操作记录和审计功能`);
            resolve();
          }
        });
      });

      return {
        success: true,
        port: this.port,
        url: `http://localhost:${this.port}`
      };

    } catch (error) {
      console.error('❌ 仪表板启动失败:', error.message);
      
      // 记录启动失败事件
      try {
        await this.auditSystem.logSecurityEvent({
          type: 'startup_failure',
          severity: 'high',
          description: '仪表板启动失败',
          details: { error: error.message }
        });
      } catch {}

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 停止仪表板服务器
   * Stop dashboard server
   */
  async stop() {
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(resolve);
      });
      console.log('⏹️ 开发者仪表板已停止');
    }
  }
}

module.exports = DeveloperDashboard;