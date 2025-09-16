/**
 * Real-Time Test Monitoring Dashboard
 * 
 * Provides real-time monitoring of test execution status, coverage changes,
 * instant failure notifications, and team collaboration features.
 */

import { EventEmitter } from 'events';

export interface TestExecutionStatus {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  error?: {
    message: string;
    stack?: string;
  };
  suite: string;
  file: string;
}

export interface CoverageSnapshot {
  timestamp: Date;
  statements: number;
  branches: number;
  functions: number;
  lines: number;
  files: {
    [filePath: string]: {
      statements: number;
      branches: number;
      functions: number;
      lines: number;
    };
  };
}

export interface DashboardMetrics {
  totalTests: number;
  runningTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  pendingTests: number;
  executionTime: number;
  coverage: CoverageSnapshot;
  recentFailures: TestExecutionStatus[];
  performanceMetrics: {
    averageTestTime: number;
    slowestTests: Array<{
      name: string;
      duration: number;
      file: string;
    }>;
    memoryUsage: {
      current: number;
      peak: number;
    };
  };
}

export interface NotificationConfig {
  enabled: boolean;
  channels: Array<'console' | 'webhook' | 'email' | 'slack'>;
  thresholds: {
    failureRate: number;
    coverageDropThreshold: number;
    performanceDegradation: number;
  };
  webhookUrl?: string;
  emailRecipients?: string[];
  slackChannel?: string;
}

export interface TeamCollaborationData {
  activeUsers: Array<{
    id: string;
    name: string;
    lastActivity: Date;
    currentTests: string[];
  }>;
  sharedState: {
    currentBranch: string;
    lastCommit: string;
    testSuiteVersion: string;
  };
  collaborativeMetrics: {
    totalContributors: number;
    testsPerContributor: { [userId: string]: number };
    recentActivity: Array<{
      userId: string;
      action: string;
      timestamp: Date;
      details: any;
    }>;
  };
}

export class RealTimeDashboard extends EventEmitter {
  private metrics: DashboardMetrics;
  private testStatuses: Map<string, TestExecutionStatus> = new Map();
  private coverageHistory: CoverageSnapshot[] = [];
  private notificationConfig: NotificationConfig;
  private collaborationData: TeamCollaborationData;
  private updateInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(
    notificationConfig: Partial<NotificationConfig> = {},
    updateIntervalMs: number = 1000
  ) {
    super();
    
    this.notificationConfig = {
      enabled: true,
      channels: ['console'],
      thresholds: {
        failureRate: 10, // 10% failure rate threshold
        coverageDropThreshold: 5, // 5% coverage drop threshold
        performanceDegradation: 50 // 50% performance degradation threshold
      },
      ...notificationConfig
    };

    this.metrics = this.initializeMetrics();
    this.collaborationData = this.initializeCollaborationData();
    
    // Start real-time updates
    this.startRealTimeUpdates(updateIntervalMs);
  }

  /**
   * Initialize default metrics
   */
  private initializeMetrics(): DashboardMetrics {
    return {
      totalTests: 0,
      runningTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      pendingTests: 0,
      executionTime: 0,
      coverage: {
        timestamp: new Date(),
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
        files: {}
      },
      recentFailures: [],
      performanceMetrics: {
        averageTestTime: 0,
        slowestTests: [],
        memoryUsage: {
          current: 0,
          peak: 0
        }
      }
    };
  }

  /**
   * Initialize collaboration data
   */
  private initializeCollaborationData(): TeamCollaborationData {
    return {
      activeUsers: [],
      sharedState: {
        currentBranch: 'main',
        lastCommit: '',
        testSuiteVersion: '1.0.0'
      },
      collaborativeMetrics: {
        totalContributors: 0,
        testsPerContributor: {},
        recentActivity: []
      }
    };
  }

  /**
   * Start real-time updates
   */
  private startRealTimeUpdates(intervalMs: number): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.updateMetrics();
      this.emit('metricsUpdated', this.metrics);
    }, intervalMs);

    this.isRunning = true;
  }

  /**
   * Stop real-time updates
   */
  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isRunning = false;
  }

  /**
   * Update test execution status
   */
  public updateTestStatus(testStatus: TestExecutionStatus): void {
    const previousStatus = this.testStatuses.get(testStatus.id);
    this.testStatuses.set(testStatus.id, testStatus);

    // Handle status transitions
    if (previousStatus?.status !== testStatus.status) {
      this.handleStatusTransition(previousStatus, testStatus);
    }

    // Update metrics immediately for critical changes
    if (testStatus.status === 'failed') {
      this.updateMetrics();
      this.handleTestFailure(testStatus);
    }

    this.emit('testStatusUpdated', testStatus);
  }

  /**
   * Update coverage snapshot
   */
  public updateCoverage(coverage: CoverageSnapshot): void {
    const previousCoverage = this.metrics.coverage;
    this.metrics.coverage = coverage;
    this.coverageHistory.push(coverage);

    // Keep only last 100 snapshots
    if (this.coverageHistory.length > 100) {
      this.coverageHistory = this.coverageHistory.slice(-100);
    }

    // Check for coverage drops
    this.checkCoverageDrop(previousCoverage, coverage);

    this.emit('coverageUpdated', coverage);
  }

  /**
   * Get current dashboard metrics
   */
  public getMetrics(): DashboardMetrics {
    return { ...this.metrics };
  }

  /**
   * Get coverage history
   */
  public getCoverageHistory(): CoverageSnapshot[] {
    return [...this.coverageHistory];
  }

  /**
   * Get test execution timeline
   */
  public getTestTimeline(): TestExecutionStatus[] {
    return Array.from(this.testStatuses.values())
      .sort((a, b) => {
        const aTime = a.startTime || new Date(0);
        const bTime = b.startTime || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
  }

  /**
   * Add team member
   */
  public addTeamMember(user: {
    id: string;
    name: string;
    currentTests?: string[];
  }): void {
    const existingUserIndex = this.collaborationData.activeUsers.findIndex(u => u.id === user.id);
    
    const userData = {
      ...user,
      lastActivity: new Date(),
      currentTests: user.currentTests || []
    };

    if (existingUserIndex >= 0) {
      this.collaborationData.activeUsers[existingUserIndex] = userData;
    } else {
      this.collaborationData.activeUsers.push(userData);
    }

    this.emit('teamMemberUpdated', userData);
  }

  /**
   * Remove team member
   */
  public removeTeamMember(userId: string): void {
    this.collaborationData.activeUsers = this.collaborationData.activeUsers
      .filter(user => user.id !== userId);
    
    this.emit('teamMemberRemoved', userId);
  }

  /**
   * Update shared state
   */
  public updateSharedState(state: Partial<TeamCollaborationData['sharedState']>): void {
    this.collaborationData.sharedState = {
      ...this.collaborationData.sharedState,
      ...state
    };

    this.emit('sharedStateUpdated', this.collaborationData.sharedState);
  }

  /**
   * Get collaboration data
   */
  public getCollaborationData(): TeamCollaborationData {
    return { ...this.collaborationData };
  }

  /**
   * Configure notifications
   */
  public configureNotifications(config: Partial<NotificationConfig>): void {
    this.notificationConfig = {
      ...this.notificationConfig,
      ...config
    };
  }

  /**
   * Send notification
   */
  private async sendNotification(
    type: 'failure' | 'coverage_drop' | 'performance_issue',
    message: string,
    data?: any
  ): Promise<void> {
    if (!this.notificationConfig.enabled) {
      return;
    }

    const notification = {
      type,
      message,
      timestamp: new Date(),
      data
    };

    for (const channel of this.notificationConfig.channels) {
      try {
        await this.sendToChannel(channel, notification);
      } catch (error) {
        console.error(`Failed to send notification to ${channel}:`, error);
      }
    }

    this.emit('notificationSent', notification);
  }

  /**
   * Send notification to specific channel
   */
  private async sendToChannel(
    channel: string,
    notification: any
  ): Promise<void> {
    switch (channel) {
      case 'console':
        console.log(`[${notification.type.toUpperCase()}] ${notification.message}`);
        break;
      
      case 'webhook':
        if (this.notificationConfig.webhookUrl) {
          // In a real implementation, you would use fetch or axios
          console.log(`Webhook notification: ${JSON.stringify(notification)}`);
        }
        break;
      
      case 'email':
        if (this.notificationConfig.emailRecipients?.length) {
          console.log(`Email notification to ${this.notificationConfig.emailRecipients.join(', ')}: ${notification.message}`);
        }
        break;
      
      case 'slack':
        if (this.notificationConfig.slackChannel) {
          console.log(`Slack notification to ${this.notificationConfig.slackChannel}: ${notification.message}`);
        }
        break;
    }
  }

  /**
   * Handle status transitions
   */
  private handleStatusTransition(
    previous: TestExecutionStatus | undefined,
    current: TestExecutionStatus
  ): void {
    // Log status changes
    this.collaborationData.collaborativeMetrics.recentActivity.push({
      userId: 'system',
      action: 'test_status_change',
      timestamp: new Date(),
      details: {
        testId: current.id,
        from: previous?.status,
        to: current.status
      }
    });

    // Keep only last 50 activities
    if (this.collaborationData.collaborativeMetrics.recentActivity.length > 50) {
      this.collaborationData.collaborativeMetrics.recentActivity = 
        this.collaborationData.collaborativeMetrics.recentActivity.slice(-50);
    }
  }

  /**
   * Handle test failure
   */
  private async handleTestFailure(testStatus: TestExecutionStatus): Promise<void> {
    // Add to recent failures
    this.metrics.recentFailures.unshift(testStatus);
    if (this.metrics.recentFailures.length > 10) {
      this.metrics.recentFailures = this.metrics.recentFailures.slice(0, 10);
    }

    // Check failure rate threshold
    const failureRate = (this.metrics.failedTests / this.metrics.totalTests) * 100;
    if (failureRate >= this.notificationConfig.thresholds.failureRate) {
      await this.sendNotification(
        'failure',
        `High failure rate detected: ${failureRate.toFixed(1)}% (${this.metrics.failedTests}/${this.metrics.totalTests})`,
        { failureRate, testStatus }
      );
    }
  }

  /**
   * Check for coverage drops
   */
  private async checkCoverageDrop(
    previous: CoverageSnapshot,
    current: CoverageSnapshot
  ): Promise<void> {
    const statementsDrop = previous.statements - current.statements;
    const branchesDrop = previous.branches - current.branches;
    const functionsDrop = previous.functions - current.functions;
    const linesDrop = previous.lines - current.lines;

    const maxDrop = Math.max(statementsDrop, branchesDrop, functionsDrop, linesDrop);

    if (maxDrop >= this.notificationConfig.thresholds.coverageDropThreshold) {
      await this.sendNotification(
        'coverage_drop',
        `Coverage drop detected: ${maxDrop.toFixed(1)}% decrease`,
        { previous, current, drop: maxDrop }
      );
    }
  }

  /**
   * Update metrics from current test statuses
   */
  private updateMetrics(): void {
    const statuses = Array.from(this.testStatuses.values());
    
    this.metrics.totalTests = statuses.length;
    this.metrics.runningTests = statuses.filter(t => t.status === 'running').length;
    this.metrics.passedTests = statuses.filter(t => t.status === 'passed').length;
    this.metrics.failedTests = statuses.filter(t => t.status === 'failed').length;
    this.metrics.skippedTests = statuses.filter(t => t.status === 'skipped').length;
    this.metrics.pendingTests = statuses.filter(t => t.status === 'pending').length;

    // Calculate execution time
    const completedTests = statuses.filter(t => t.endTime && t.startTime);
    this.metrics.executionTime = completedTests.reduce((sum, test) => {
      return sum + (test.duration || 0);
    }, 0);

    // Update performance metrics
    this.updatePerformanceMetrics(completedTests);

    // Update memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      this.metrics.performanceMetrics.memoryUsage.current = memUsage.heapUsed / 1024 / 1024; // MB
      this.metrics.performanceMetrics.memoryUsage.peak = Math.max(
        this.metrics.performanceMetrics.memoryUsage.peak,
        this.metrics.performanceMetrics.memoryUsage.current
      );
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(completedTests: TestExecutionStatus[]): void {
    if (completedTests.length === 0) return;

    // Calculate average test time
    const totalDuration = completedTests.reduce((sum, test) => sum + (test.duration || 0), 0);
    this.metrics.performanceMetrics.averageTestTime = totalDuration / completedTests.length;

    // Find slowest tests
    this.metrics.performanceMetrics.slowestTests = completedTests
      .filter(test => test.duration && test.duration > 0)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 5)
      .map(test => ({
        name: test.name,
        duration: test.duration || 0,
        file: test.file
      }));
  }

  /**
   * Export dashboard data
   */
  public exportData(): {
    metrics: DashboardMetrics;
    testStatuses: TestExecutionStatus[];
    coverageHistory: CoverageSnapshot[];
    collaborationData: TeamCollaborationData;
  } {
    return {
      metrics: this.getMetrics(),
      testStatuses: this.getTestTimeline(),
      coverageHistory: this.getCoverageHistory(),
      collaborationData: this.getCollaborationData()
    };
  }

  /**
   * Import dashboard data
   */
  public importData(data: {
    testStatuses?: TestExecutionStatus[];
    coverageHistory?: CoverageSnapshot[];
    collaborationData?: Partial<TeamCollaborationData>;
  }): void {
    if (data.testStatuses) {
      this.testStatuses.clear();
      data.testStatuses.forEach(status => {
        this.testStatuses.set(status.id, status);
      });
    }

    if (data.coverageHistory) {
      this.coverageHistory = [...data.coverageHistory];
    }

    if (data.collaborationData) {
      this.collaborationData = {
        ...this.collaborationData,
        ...data.collaborationData
      };
    }

    this.updateMetrics();
    this.emit('dataImported', data);
  }

  /**
   * Reset dashboard
   */
  public reset(): void {
    this.testStatuses.clear();
    this.coverageHistory = [];
    this.metrics = this.initializeMetrics();
    this.collaborationData = this.initializeCollaborationData();
    
    this.emit('dashboardReset');
  }

  /**
   * Get dashboard status
   */
  public getStatus(): {
    isRunning: boolean;
    totalTests: number;
    activeUsers: number;
    lastUpdate: Date;
  } {
    return {
      isRunning: this.isRunning,
      totalTests: this.metrics.totalTests,
      activeUsers: this.collaborationData.activeUsers.length,
      lastUpdate: new Date()
    };
  }
}