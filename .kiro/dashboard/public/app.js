/**
 * 开发者仪表板前端应用
 * Developer Dashboard Frontend Application
 */

class DashboardApp {
  constructor() {
    this.apiBase = '';
    this.refreshInterval = null;
    this.init();
  }

  /**
   * 初始化应用
   */
  init() {
    this.bindEvents();
    this.loadInitialData();
    this.startAutoRefresh();
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    // 刷新按钮
    document.getElementById('refresh-btn').addEventListener('click', () => {
      this.loadInitialData();
    });

    // 快速操作按钮
    document.getElementById('create-snapshot-btn').addEventListener('click', () => {
      this.showCreateSnapshotModal();
    });

    document.getElementById('diagnose-health-btn').addEventListener('click', () => {
      this.executeQuickFix('diagnose_health');
    });

    document.getElementById('quality-check-btn').addEventListener('click', () => {
      this.executeQuickFix('quality_check');
    });

    document.getElementById('style-snapshot-btn').addEventListener('click', () => {
      this.executeQuickFix('style_snapshot');
    });

    // 系统详情按钮
    document.getElementById('recovery-snapshots-btn').addEventListener('click', () => {
      this.showSnapshotsList('recovery');
    });

    document.getElementById('recovery-guide-btn').addEventListener('click', () => {
      this.showRecoveryGuideModal();
    });

    document.getElementById('quality-run-btn').addEventListener('click', () => {
      this.executeQuickFix('quality_check');
    });

    document.getElementById('style-snapshots-btn').addEventListener('click', () => {
      this.showSnapshotsList('style');
    });

    // 模态框事件
    document.getElementById('modal-close').addEventListener('click', () => {
      this.hideModal();
    });

    document.getElementById('modal-cancel').addEventListener('click', () => {
      this.hideModal();
    });

    // 点击模态框外部关闭
    document.getElementById('modal').addEventListener('click', (e) => {
      if (e.target.id === 'modal') {
        this.hideModal();
      }
    });
  }

  /**
   * 加载初始数据
   */
  async loadInitialData() {
    try {
      await Promise.all([
        this.loadSystemHealth(),
        this.loadProjectStatus(),
        this.loadRecentActivity()
      ]);
    } catch (error) {
      this.showNotification('加载数据失败', error.message, 'error');
    }
  }

  /**
   * 加载系统健康状态
   */
  async loadSystemHealth() {
    try {
      const response = await fetch(`${this.apiBase}/api/health`);
      const health = await response.json();

      // 更新整体状态
      const overallStatus = document.getElementById('overall-status');
      overallStatus.textContent = this.getStatusText(health.overall);
      overallStatus.className = `status-badge status-${health.overall}`;

      // 更新健康详情
      const healthDetails = document.getElementById('health-details');
      healthDetails.innerHTML = this.renderHealthDetails(health);

      // 更新各系统状态
      this.updateSystemStatus('recovery', health.systems.recovery);
      this.updateSystemStatus('quality', health.systems.quality);
      this.updateSystemStatus('style', health.systems.style);

    } catch (error) {
      console.error('加载系统健康状态失败:', error);
      document.getElementById('health-details').innerHTML = 
        '<div class="error">加载失败: ' + error.message + '</div>';
    }
  }

  /**
   * 加载项目状态
   */
  async loadProjectStatus() {
    try {
      const response = await fetch(`${this.apiBase}/api/project-status`);
      const status = await response.json();

      const metricsContainer = document.getElementById('project-metrics');
      metricsContainer.innerHTML = this.renderProjectMetrics(status.metrics);

    } catch (error) {
      console.error('加载项目状态失败:', error);
      document.getElementById('project-metrics').innerHTML = 
        '<div class="error">加载失败: ' + error.message + '</div>';
    }
  }

  /**
   * 加载最近活动
   */
  async loadRecentActivity() {
    try {
      const response = await fetch(`${this.apiBase}/api/operations/history`);
      const history = await response.json();

      const activityContainer = document.getElementById('recent-activity');
      activityContainer.innerHTML = this.renderRecentActivity(history.operations);

    } catch (error) {
      console.error('加载最近活动失败:', error);
      document.getElementById('recent-activity').innerHTML = 
        '<div class="error">加载失败: ' + error.message + '</div>';
    }
  }

  /**
   * 更新系统状态
   */
  updateSystemStatus(systemName, systemData) {
    const statusElement = document.getElementById(`${systemName}-status`);
    const detailsElement = document.getElementById(`${systemName}-details`);

    if (statusElement && systemData) {
      statusElement.textContent = this.getStatusText(systemData.status);
      statusElement.className = `status-badge status-${systemData.status}`;
    }

    if (detailsElement && systemData) {
      detailsElement.innerHTML = this.renderSystemDetails(systemName, systemData);
    }
  }

  /**
   * 渲染健康详情
   */
  renderHealthDetails(health) {
    let html = '';

    if (health.alerts && health.alerts.length > 0) {
      html += '<div class="health-alerts">';
      html += '<h4>⚠️ 警报</h4>';
      health.alerts.forEach(alert => {
        html += `<div class="alert-item">${alert}</div>`;
      });
      html += '</div>';
    }

    if (health.systems) {
      html += '<div class="systems-overview">';
      Object.entries(health.systems).forEach(([name, system]) => {
        const statusClass = `status-${system.status}`;
        html += `
          <div class="system-overview-item">
            <span class="system-name">${this.getSystemDisplayName(name)}</span>
            <span class="status-badge ${statusClass}">${this.getStatusText(system.status)}</span>
          </div>
        `;
      });
      html += '</div>';
    }

    return html || '<div class="no-data">暂无健康数据</div>';
  }

  /**
   * 渲染项目指标
   */
  renderProjectMetrics(metrics) {
    if (!metrics) return '<div class="no-data">暂无指标数据</div>';

    let html = '';

    if (metrics.snapshots) {
      html += `
        <div class="metric-item">
          <div class="metric-value">${metrics.snapshots.total}</div>
          <div class="metric-label">状态快照</div>
        </div>
      `;
    }

    if (metrics.styleSnapshots) {
      html += `
        <div class="metric-item">
          <div class="metric-value">${metrics.styleSnapshots.total}</div>
          <div class="metric-label">样式快照</div>
        </div>
      `;
    }

    return html || '<div class="no-data">暂无指标数据</div>';
  }

  /**
   * 渲染系统详情
   */
  renderSystemDetails(systemName, systemData) {
    let html = '';

    switch (systemName) {
      case 'recovery':
        html += `
          <div class="detail-item">
            <span class="detail-label">问题数量</span>
            <span class="detail-value">${systemData.issues || 0}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">建议数量</span>
            <span class="detail-value">${systemData.recommendations || 0}</span>
          </div>
        `;
        break;

      case 'quality':
        html += `
          <div class="detail-item">
            <span class="detail-label">问题数量</span>
            <span class="detail-value">${systemData.issues || 0}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">最后检查</span>
            <span class="detail-value">${systemData.lastCheck ? new Date(systemData.lastCheck).toLocaleString() : '未知'}</span>
          </div>
        `;
        break;

      case 'style':
        html += `
          <div class="detail-item">
            <span class="detail-label">快照数量</span>
            <span class="detail-value">${systemData.snapshots || 0}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">最后快照</span>
            <span class="detail-value">${systemData.lastSnapshot ? new Date(systemData.lastSnapshot).toLocaleString() : '未知'}</span>
          </div>
        `;
        break;
    }

    return html || '<div class="no-data">暂无详情数据</div>';
  }

  /**
   * 渲染最近活动
   */
  renderRecentActivity(operations) {
    if (!operations || operations.length === 0) {
      return '<div class="no-data">暂无活动记录</div>';
    }

    let html = '';
    operations.slice(0, 10).forEach(operation => {
      const iconClass = operation.status === 'success' ? 'success' : 
                       operation.status === 'failed' ? 'error' : 'warning';
      const icon = operation.status === 'success' ? '✅' : 
                  operation.status === 'failed' ? '❌' : '⚠️';

      html += `
        <div class="activity-item">
          <div class="activity-icon ${iconClass}">${icon}</div>
          <div class="activity-content">
            <div class="activity-title">${operation.description}</div>
            <div class="activity-description">
              ${operation.details ? Object.entries(operation.details).map(([k, v]) => `${k}: ${v}`).join(', ') : ''}
            </div>
          </div>
          <div class="activity-time">${new Date(operation.timestamp).toLocaleString()}</div>
        </div>
      `;
    });

    return html;
  }

  /**
   * 执行快速修复
   */
  async executeQuickFix(action, params = {}) {
    try {
      this.showNotification('执行中', `正在执行 ${this.getActionDisplayName(action)}...`, 'info');

      const response = await fetch(`${this.apiBase}/api/operations/quick-fix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, params })
      });

      const result = await response.json();

      if (result.success) {
        this.showNotification('操作成功', result.message, 'success');
        // 刷新数据
        setTimeout(() => this.loadInitialData(), 1000);
      } else {
        this.showNotification('操作失败', result.message, 'error');
      }

    } catch (error) {
      this.showNotification('操作失败', error.message, 'error');
    }
  }

  /**
   * 显示创建快照模态框
   */
  showCreateSnapshotModal() {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const confirmBtn = document.getElementById('modal-confirm');

    title.textContent = '创建状态快照';
    body.innerHTML = `
      <div class="form-group">
        <label for="snapshot-reason">快照原因:</label>
        <input type="text" id="snapshot-reason" placeholder="请输入创建快照的原因..." style="width: 100%; padding: 0.5rem; margin-top: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;">
      </div>
    `;

    confirmBtn.onclick = async () => {
      const reason = document.getElementById('snapshot-reason').value;
      this.hideModal();
      await this.executeQuickFix('create_snapshot', { reason });
    };

    modal.classList.remove('hidden');
  }

  /**
   * 显示恢复指导模态框
   */
  showRecoveryGuideModal() {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const confirmBtn = document.getElementById('modal-confirm');

    title.textContent = '恢复指导';
    body.innerHTML = `
      <div class="form-group">
        <label for="issue-description">问题描述:</label>
        <textarea id="issue-description" placeholder="请详细描述遇到的问题..." style="width: 100%; height: 100px; padding: 0.5rem; margin-top: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; resize: vertical;"></textarea>
      </div>
      <div id="guidance-result" style="margin-top: 1rem;"></div>
    `;

    confirmBtn.textContent = '获取指导';
    confirmBtn.onclick = async () => {
      const issue = document.getElementById('issue-description').value;
      if (!issue.trim()) {
        this.showNotification('输入错误', '请输入问题描述', 'warning');
        return;
      }

      try {
        const response = await fetch(`${this.apiBase}/api/recovery/guide`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ issue })
        });

        const guidance = await response.json();
        document.getElementById('guidance-result').innerHTML = this.renderGuidance(guidance);
        confirmBtn.textContent = '关闭';
        confirmBtn.onclick = () => this.hideModal();

      } catch (error) {
        this.showNotification('获取指导失败', error.message, 'error');
      }
    };

    modal.classList.remove('hidden');
  }

  /**
   * 显示快照列表
   */
  async showSnapshotsList(type) {
    try {
      const endpoint = type === 'recovery' ? '/api/recovery/snapshots' : '/api/style/snapshots';
      const response = await fetch(`${this.apiBase}${endpoint}`);
      const data = await response.json();

      const modal = document.getElementById('modal');
      const title = document.getElementById('modal-title');
      const body = document.getElementById('modal-body');
      const confirmBtn = document.getElementById('modal-confirm');

      title.textContent = type === 'recovery' ? '状态快照列表' : '样式快照列表';
      body.innerHTML = this.renderSnapshotsList(data.snapshots || []);

      confirmBtn.textContent = '关闭';
      confirmBtn.onclick = () => this.hideModal();

      modal.classList.remove('hidden');

    } catch (error) {
      this.showNotification('加载快照列表失败', error.message, 'error');
    }
  }

  /**
   * 渲染快照列表
   */
  renderSnapshotsList(snapshots) {
    if (!snapshots || snapshots.length === 0) {
      return '<div class="no-data">暂无快照</div>';
    }

    let html = '<div class="snapshots-list">';
    snapshots.slice(0, 10).forEach(snapshot => {
      html += `
        <div class="snapshot-item" style="padding: 1rem; border: 1px solid var(--border-color); border-radius: 4px; margin-bottom: 0.5rem;">
          <div style="font-weight: 500;">${snapshot.id}</div>
          <div style="color: var(--text-secondary); font-size: 0.875rem;">
            ${snapshot.reason || '无描述'}
          </div>
          <div style="color: var(--text-secondary); font-size: 0.8125rem;">
            ${new Date(snapshot.timestamp).toLocaleString()}
          </div>
        </div>
      `;
    });
    html += '</div>';

    return html;
  }

  /**
   * 渲染恢复指导
   */
  renderGuidance(guidance) {
    if (guidance.error) {
      return `<div class="error">获取指导失败: ${guidance.error}</div>`;
    }

    let html = `
      <div class="guidance-result">
        <div class="guidance-header">
          <div><strong>问题类型:</strong> ${guidance.issueType}</div>
          <div><strong>严重程度:</strong> ${guidance.severity}</div>
          <div><strong>预计时间:</strong> ${guidance.estimatedTime}</div>
        </div>
    `;

    if (guidance.recommendations && guidance.recommendations.length > 0) {
      html += '<div class="guidance-recommendations"><h4>恢复建议:</h4><ul>';
      guidance.recommendations.forEach(rec => {
        html += `<li><strong>${rec.description}</strong> (${rec.priority}优先级)</li>`;
      });
      html += '</ul></div>';
    }

    html += '</div>';
    return html;
  }

  /**
   * 显示模态框
   */
  showModal() {
    document.getElementById('modal').classList.remove('hidden');
  }

  /**
   * 隐藏模态框
   */
  hideModal() {
    document.getElementById('modal').classList.add('hidden');
  }

  /**
   * 显示通知
   */
  showNotification(title, message, type = 'info') {
    const notifications = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-title">${title}</div>
      <div class="notification-message">${message}</div>
    `;

    notifications.appendChild(notification);

    // 3秒后自动移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  /**
   * 开始自动刷新
   */
  startAutoRefresh() {
    // 每30秒自动刷新一次
    this.refreshInterval = setInterval(() => {
      this.loadSystemHealth();
    }, 30000);
  }

  /**
   * 停止自动刷新
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * 获取状态显示文本
   */
  getStatusText(status) {
    const statusMap = {
      'healthy': '健康',
      'warning': '警告',
      'critical': '严重',
      'error': '错误',
      'unknown': '未知'
    };
    return statusMap[status] || status;
  }

  /**
   * 获取系统显示名称
   */
  getSystemDisplayName(systemName) {
    const nameMap = {
      'recovery': '恢复系统',
      'quality': '质量检查',
      'style': '样式恢复'
    };
    return nameMap[systemName] || systemName;
  }

  /**
   * 获取操作显示名称
   */
  getActionDisplayName(action) {
    const actionMap = {
      'create_snapshot': '创建快照',
      'diagnose_health': '健康诊断',
      'quality_check': '质量检查',
      'style_snapshot': '样式快照'
    };
    return actionMap[action] || action;
  }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  window.dashboardApp = new DashboardApp();
});