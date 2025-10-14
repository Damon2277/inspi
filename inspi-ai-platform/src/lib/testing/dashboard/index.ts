/**
 * Real-Time Dashboard System
 *
 * Main entry point for the real-time test monitoring dashboard system.
 * Integrates all dashboard components including real-time monitoring,
 * dynamic charts, notifications, and team collaboration.
 */

export { RealTimeDashboard } from './RealTimeDashboard';
export { DynamicChartGenerator } from './DynamicChartGenerator';
export { NotificationSystem } from './NotificationSystem';
export { TeamCollaborationHub } from './TeamCollaborationHub';

// Re-export types
export type {
  TestExecutionStatus,
  CoverageSnapshot,
  DashboardMetrics,
  NotificationConfig,
  TeamCollaborationData,
} from './RealTimeDashboard';

export type {
  ChartDataPoint,
  ChartSeries,
  ChartConfig,
  ChartData,
} from './DynamicChartGenerator';

export type {
  Notification,
  NotificationAction,
  NotificationChannel,
  NotificationRule,
} from './NotificationSystem';

export type {
  TeamMember,
  SharedTestState,
  CollaborativeActivity,
  TeamMetrics,
  TeamNotification,
} from './TeamCollaborationHub';

/**
 * Integrated Dashboard System
 *
 * Combines all dashboard components into a single, cohesive system
 * for comprehensive real-time test monitoring and team collaboration.
 */
import { DynamicChartGenerator } from './DynamicChartGenerator';
import { NotificationSystem } from './NotificationSystem';
import { RealTimeDashboard } from './RealTimeDashboard';
import { TeamCollaborationHub } from './TeamCollaborationHub';

export interface DashboardSystemConfig {
  updateInterval?: number;
  maxHistorySize?: number;
  enableNotifications?: boolean;
  enableCollaboration?: boolean;
  enableCharts?: boolean;
  notificationConfig?: any;
}

export class DashboardSystem {
  private dashboard: RealTimeDashboard;
  private chartGenerator: DynamicChartGenerator;
  private notificationSystem: NotificationSystem;
  private collaborationHub: TeamCollaborationHub;
  private isInitialized: boolean = false;

  constructor(config: DashboardSystemConfig = {}) {
    // Initialize components
    this.dashboard = new RealTimeDashboard(
      config.notificationConfig,
      config.updateInterval,
    );

    this.chartGenerator = new DynamicChartGenerator();
    this.notificationSystem = new NotificationSystem();
    this.collaborationHub = new TeamCollaborationHub();

    // Set up event listeners
    this.setupEventListeners();
    this.isInitialized = true;
  }

  /**
   * Set up event listeners between components
   */
  private setupEventListeners(): void {
    // Dashboard events
    this.dashboard.on('testStatusUpdated', (testStatus) => {
      this.handleTestStatusUpdate(testStatus);
    });

    this.dashboard.on('coverageUpdated', (coverage) => {
      this.handleCoverageUpdate(coverage);
    });

    this.dashboard.on('metricsUpdated', (metrics) => {
      this.handleMetricsUpdate(metrics);
    });

    // Collaboration events
    this.collaborationHub.on('memberAdded', (member) => {
      this.notificationSystem.notify({
        type: 'info',
        category: 'team_event',
        title: 'Team Member Added',
        message: `${member.name} joined the team`,
        priority: 'medium',
        data: { member },
      });
    });

    this.collaborationHub.on('testRunStarted', ({ userId, testId }) => {
      const member = this.collaborationHub.getMember(userId);
      if (member) {
        this.notificationSystem.notify({
          type: 'info',
          category: 'team_event',
          title: 'Test Run Started',
          message: `${member.name} started running test ${testId}`,
          priority: 'low',
          data: { userId, testId },
        });
      }
    });
  }

  /**
   * Handle test status updates
   */
  private handleTestStatusUpdate(testStatus: any): void {
    // Update charts
    this.updateTestStatusCharts(testStatus);

    // Handle failures
    if (testStatus.status === 'failed') {
      this.notificationSystem.notify({
        type: 'error',
        category: 'test_failure',
        title: 'Test Failed',
        message: `Test "${testStatus.name}" failed in ${testStatus.file}`,
        priority: 'high',
        data: testStatus,
        actions: [
          {
            id: 'view-details',
            label: 'View Details',
            type: 'primary',
            handler: (notification) => {
              console.log('Viewing test failure details:', notification.data);
            },
          },
          {
            id: 'rerun-test',
            label: 'Rerun Test',
            type: 'secondary',
            handler: (notification) => {
              console.log('Rerunning failed test:', notification.data);
            },
          },
        ],
      });
    }
  }

  /**
   * Handle coverage updates
   */
  private handleCoverageUpdate(coverage: any): void {
    // Update coverage trend chart
    this.chartGenerator.addDataPoint(
      'coverage-trend',
      'statements',
      {
        timestamp: coverage.timestamp,
        value: coverage.statements,
      },
    );

    this.chartGenerator.addDataPoint(
      'coverage-trend',
      'branches',
      {
        timestamp: coverage.timestamp,
        value: coverage.branches,
      },
    );
  }

  /**
   * Handle metrics updates
   */
  private handleMetricsUpdate(metrics: any): void {
    // Update test progress chart
    this.chartGenerator.updateTestProgressChart('test-progress', {
      passed: metrics.passedTests,
      failed: metrics.failedTests,
      running: metrics.runningTests,
      pending: metrics.pendingTests,
    });
  }

  /**
   * Update test status charts
   */
  private updateTestStatusCharts(testStatus: any): void {
    const now = new Date();

    // Add data point to status timeline
    this.chartGenerator.addDataPoint(
      'test-status-timeline',
      testStatus.status,
      {
        timestamp: now,
        value: 1,
        metadata: testStatus,
      },
    );
  }

  /**
   * Get dashboard instance
   */
  public getDashboard(): RealTimeDashboard {
    return this.dashboard;
  }

  /**
   * Get chart generator instance
   */
  public getChartGenerator(): DynamicChartGenerator {
    return this.chartGenerator;
  }

  /**
   * Get notification system instance
   */
  public getNotificationSystem(): NotificationSystem {
    return this.notificationSystem;
  }

  /**
   * Get collaboration hub instance
   */
  public getCollaborationHub(): TeamCollaborationHub {
    return this.collaborationHub;
  }

  /**
   * Initialize dashboard with sample data
   */
  public async initializeWithSampleData(): Promise<void> {
    // Add sample team members
    this.collaborationHub.addMember({
      id: 'user1',
      name: 'Alice Developer',
      email: 'alice@example.com',
      role: 'developer',
      status: 'online',
      permissions: {
        viewTests: true,
        runTests: true,
        modifyTests: true,
        viewReports: true,
        manageTeam: false,
      },
    });

    this.collaborationHub.addMember({
      id: 'user2',
      name: 'Bob Tester',
      email: 'bob@example.com',
      role: 'tester',
      status: 'online',
      permissions: {
        viewTests: true,
        runTests: true,
        modifyTests: false,
        viewReports: true,
        manageTeam: false,
      },
    });

    // Create sample charts
    this.chartGenerator.createChart('test-status-timeline', {
      title: 'Test Execution Status Over Time',
      type: 'area',
      realTime: true,
    });

    this.chartGenerator.createChart('coverage-trend', {
      title: 'Code Coverage Trends',
      type: 'line',
      realTime: true,
    });

    this.chartGenerator.createChart('test-progress', {
      title: 'Test Execution Progress',
      type: 'doughnut',
      realTime: true,
    });

    // Add sample test statuses
    const sampleTests = [
      {
        id: 'test1',
        name: 'User Authentication Test',
        status: 'passed' as const,
        suite: 'Auth Tests',
        file: 'auth.test.ts',
        duration: 150,
      },
      {
        id: 'test2',
        name: 'Database Connection Test',
        status: 'failed' as const,
        suite: 'Database Tests',
        file: 'db.test.ts',
        duration: 300,
        error: {
          message: 'Connection timeout',
          stack: 'Error: Connection timeout\n    at db.test.ts:45:12',
        },
      },
      {
        id: 'test3',
        name: 'API Endpoint Test',
        status: 'running' as const,
        suite: 'API Tests',
        file: 'api.test.ts',
      },
    ];

    sampleTests.forEach(test => {
      this.dashboard.updateTestStatus({
        ...test,
        startTime: new Date(Date.now() - Math.random() * 60000),
        endTime: test.status !== 'running' ? new Date() : undefined,
      });
    });

    // Add sample coverage data
    this.dashboard.updateCoverage({
      timestamp: new Date(),
      statements: 85.5,
      branches: 78.2,
      functions: 92.1,
      lines: 83.7,
      files: {
        'src/auth.ts': {
          statements: 95,
          branches: 88,
          functions: 100,
          lines: 94,
        },
        'src/db.ts': {
          statements: 76,
          branches: 68,
          functions: 84,
          lines: 73,
        },
      },
    });

    // Test notification system
    await this.notificationSystem.test();
  }

  /**
   * Get comprehensive dashboard data
   */
  public getDashboardData(): {
    metrics: any;
    charts: Map<string, any>;
    notifications: any[];
    teamData: any;
    status: any;
  } {
    return {
      metrics: this.dashboard.getMetrics(),
      charts: this.chartGenerator.getAllCharts(),
      notifications: this.notificationSystem.getActiveNotifications(),
      teamData: this.collaborationHub.getTeamMetrics(),
      status: this.dashboard.getStatus(),
    };
  }

  /**
   * Export all dashboard data
   */
  public exportAllData(): {
    dashboard: any;
    charts: any;
    notifications: any;
    collaboration: any;
  } {
    return {
      dashboard: this.dashboard.exportData(),
      charts: Array.from(this.chartGenerator.getAllCharts().entries()),
      notifications: {
        active: this.notificationSystem.getActiveNotifications(),
        history: this.notificationSystem.getHistory(),
        statistics: this.notificationSystem.getStatistics(),
      },
      collaboration: this.collaborationHub.exportData(),
    };
  }

  /**
   * Stop all dashboard components
   */
  public stop(): void {
    this.dashboard.stop();
    this.collaborationHub.stop();
  }

  /**
   * Get system status
   */
  public getSystemStatus(): {
    initialized: boolean;
    components: {
      dashboard: boolean;
      charts: boolean;
      notifications: boolean;
      collaboration: boolean;
    };
    metrics: {
      totalTests: number;
      activeUsers: number;
      activeNotifications: number;
      totalCharts: number;
    };
  } {
    return {
      initialized: this.isInitialized,
      components: {
        dashboard: true,
        charts: true,
        notifications: true,
        collaboration: true,
      },
      metrics: {
        totalTests: this.dashboard.getMetrics().totalTests,
        activeUsers: this.collaborationHub.getActiveMembers().length,
        activeNotifications: this.notificationSystem.getActiveNotifications().length,
        totalCharts: this.chartGenerator.getAllCharts().size,
      },
    };
  }
}
