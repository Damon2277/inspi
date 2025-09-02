import * as fs from 'fs';
import * as path from 'path';
import { ProjectState, Feature, Issue, StateChangeLog, StatusValidationResult, FeatureStatus } from './types';

export class ProjectStateManager {
  private statePath: string;
  private logPath: string;

  constructor(projectRoot: string = '.') {
    this.statePath = path.join(projectRoot, '.kiro', 'project-state', 'project-state.json');
    this.logPath = path.join(projectRoot, '.kiro', 'project-state', 'change-log.json');
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const stateDir = path.dirname(this.statePath);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
  }

  /**
   * 读取当前项目状态
   */
  public getCurrentState(): ProjectState {
    try {
      if (fs.existsSync(this.statePath)) {
        const content = fs.readFileSync(this.statePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('Failed to read project state:', error);
    }
    
    // 返回默认状态
    return this.getDefaultState();
  }

  /**
   * 保存项目状态
   */
  public saveState(state: ProjectState): void {
    try {
      state.lastUpdated = new Date().toISOString();
      const content = JSON.stringify(state, null, 2);
      fs.writeFileSync(this.statePath, content, 'utf-8');
    } catch (error) {
      console.error('Failed to save project state:', error);
      throw error;
    }
  }

  /**
   * 更新功能状态
   */
  public updateFeatureStatus(
    featureName: string, 
    newStatus: FeatureStatus, 
    reason: string,
    operator: string = 'system'
  ): StatusValidationResult {
    const state = this.getCurrentState();
    const feature = state.features[featureName];
    
    if (!feature) {
      return {
        isValid: false,
        errors: [`Feature '${featureName}' not found`],
        warnings: [],
        suggestions: ['Create the feature first using addFeature()']
      };
    }

    // 验证状态变更的合理性
    const validation = this.validateStatusChange(feature.status, newStatus, feature);
    if (!validation.isValid) {
      return validation;
    }

    // 记录状态变更
    const previousStatus = feature.status;
    feature.status = newStatus;
    feature.lastUpdated = new Date().toISOString();

    // 如果状态回退，需要特殊处理
    if (this.isStatusRegression(previousStatus, newStatus)) {
      this.handleStatusRegression(featureName, previousStatus, newStatus, reason);
    }

    // 更新完成日期
    if (newStatus === 'completed') {
      feature.completionDate = new Date().toISOString();
    }

    // 保存状态和日志
    this.saveState(state);
    this.logStateChange(featureName, previousStatus, newStatus, reason, operator);

    return {
      isValid: true,
      errors: [],
      warnings: validation.warnings,
      suggestions: validation.suggestions
    };
  }

  /**
   * 添加新功能
   */
  public addFeature(featureName: string, feature: Partial<Feature>): void {
    const state = this.getCurrentState();
    
    state.features[featureName] = {
      status: 'not_started',
      lastUpdated: new Date().toISOString(),
      completionCriteria: [],
      dependencies: [],
      riskLevel: 'medium',
      ...feature
    };

    this.saveState(state);
  }

  /**
   * 添加问题
   */
  public addIssue(issue: Omit<Issue, 'id' | 'createdAt'>): string {
    const state = this.getCurrentState();
    const issueId = `${issue.type}-${Date.now()}`;
    
    const newIssue: Issue = {
      ...issue,
      id: issueId,
      createdAt: new Date().toISOString()
    };

    state.globalHealth.activeIssues.push(newIssue);
    this.updateOverallStatus(state);
    this.saveState(state);

    return issueId;
  }

  /**
   * 解决问题
   */
  public resolveIssue(issueId: string, resolution: string): boolean {
    const state = this.getCurrentState();
    const issue = state.globalHealth.activeIssues.find(i => i.id === issueId);
    
    if (!issue) {
      return false;
    }

    issue.status = 'resolved';
    issue.resolvedAt = new Date().toISOString();
    issue.resolution = resolution;

    this.updateOverallStatus(state);
    this.saveState(state);
    return true;
  }

  /**
   * 获取项目健康报告
   */
  public getHealthReport(): {
    overallStatus: string;
    totalFeatures: number;
    completedFeatures: number;
    inProgressFeatures: number;
    activeIssues: number;
    criticalIssues: number;
    recommendations: string[];
  } {
    const state = this.getCurrentState();
    const features = Object.values(state.features);
    const activeIssues = state.globalHealth.activeIssues.filter(i => i.status === 'active');
    
    return {
      overallStatus: state.globalHealth.overallStatus,
      totalFeatures: features.length,
      completedFeatures: features.filter(f => f.status === 'completed').length,
      inProgressFeatures: features.filter(f => f.status === 'in_progress').length,
      activeIssues: activeIssues.length,
      criticalIssues: activeIssues.filter(i => i.severity === 'critical').length,
      recommendations: this.generateRecommendations(state)
    };
  }

  private getDefaultState(): ProjectState {
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      features: {},
      globalHealth: {
        overallStatus: 'stable',
        lastStableSnapshot: null,
        activeIssues: []
      }
    };
  }

  private validateStatusChange(
    currentStatus: FeatureStatus, 
    newStatus: FeatureStatus, 
    feature: Feature
  ): StatusValidationResult {
    const result: StatusValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // 检查状态回退
    if (this.isStatusRegression(currentStatus, newStatus)) {
      result.warnings.push(`Status regression detected: ${currentStatus} -> ${newStatus}`);
      result.suggestions.push('Consider documenting the reason for this regression');
    }

    // 检查完成标准
    if (newStatus === 'completed' && feature.completionCriteria.length === 0) {
      result.warnings.push('No completion criteria defined for this feature');
      result.suggestions.push('Define completion criteria before marking as completed');
    }

    // 检查依赖关系
    if (newStatus === 'completed') {
      const state = this.getCurrentState();
      const uncompletedDependencies = feature.dependencies.filter(dep => {
        const depFeature = state.features[dep];
        return !depFeature || depFeature.status !== 'completed';
      });

      if (uncompletedDependencies.length > 0) {
        result.errors.push(`Cannot complete feature with uncompleted dependencies: ${uncompletedDependencies.join(', ')}`);
        result.isValid = false;
      }
    }

    return result;
  }

  private isStatusRegression(currentStatus: FeatureStatus, newStatus: FeatureStatus): boolean {
    const statusOrder = ['not_started', 'in_progress', 'testing', 'completed', 'deployed'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const newIndex = statusOrder.indexOf(newStatus);
    return newIndex < currentIndex;
  }

  private handleStatusRegression(
    featureName: string, 
    previousStatus: FeatureStatus, 
    newStatus: FeatureStatus, 
    reason: string
  ): void {
    // 创建回退问题记录
    this.addIssue({
      type: 'functional_error',
      severity: 'high',
      description: `Feature '${featureName}' regressed from ${previousStatus} to ${newStatus}. Reason: ${reason}`,
      affectedFeatures: [featureName],
      status: 'active'
    });
  }

  private logStateChange(
    featureName: string,
    previousStatus: FeatureStatus,
    newStatus: FeatureStatus,
    reason: string,
    operator: string
  ): void {
    try {
      let logs: StateChangeLog[] = [];
      
      if (fs.existsSync(this.logPath)) {
        const content = fs.readFileSync(this.logPath, 'utf-8');
        logs = JSON.parse(content);
      }

      const logEntry: StateChangeLog = {
        id: `${featureName}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        featureName,
        previousStatus,
        newStatus,
        reason,
        operator
      };

      logs.push(logEntry);

      // 只保留最近1000条记录
      if (logs.length > 1000) {
        logs = logs.slice(-1000);
      }

      fs.writeFileSync(this.logPath, JSON.stringify(logs, null, 2), 'utf-8');
    } catch (error) {
      console.warn('Failed to log state change:', error);
    }
  }

  private updateOverallStatus(state: ProjectState): void {
    const activeIssues = state.globalHealth.activeIssues.filter(i => i.status === 'active');
    const criticalIssues = activeIssues.filter(i => i.severity === 'critical');
    const highIssues = activeIssues.filter(i => i.severity === 'high');

    if (criticalIssues.length > 0) {
      state.globalHealth.overallStatus = 'critical';
    } else if (highIssues.length > 0 || activeIssues.length > 3) {
      state.globalHealth.overallStatus = 'warning';
    } else {
      state.globalHealth.overallStatus = 'stable';
    }
  }

  private generateRecommendations(state: ProjectState): string[] {
    const recommendations: string[] = [];
    const activeIssues = state.globalHealth.activeIssues.filter(i => i.status === 'active');

    if (activeIssues.length > 0) {
      recommendations.push(`Resolve ${activeIssues.length} active issues to improve project health`);
    }

    const criticalIssues = activeIssues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push(`Address ${criticalIssues.length} critical issues immediately`);
    }

    if (!state.globalHealth.lastStableSnapshot) {
      recommendations.push('Create a stable snapshot to enable rollback functionality');
    }

    const inProgressFeatures = Object.values(state.features).filter(f => f.status === 'in_progress');
    if (inProgressFeatures.length > 3) {
      recommendations.push('Consider focusing on fewer features to improve completion rate');
    }

    return recommendations;
  }
}