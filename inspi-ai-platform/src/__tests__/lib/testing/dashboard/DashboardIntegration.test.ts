/**
 * Dashboard Integration Tests
 * 
 * End-to-end integration tests for the real-time dashboard system,
 * testing the interaction between all dashboard components.
 */

import { DashboardSystem } from '../../../../lib/testing/dashboard';

describe('Dashboard Integration', () => {
  let dashboardSystem: DashboardSystem;

  beforeEach(() => {
    dashboardSystem = new DashboardSystem({
      updateInterval: 100,
      enableNotifications: true,
      enableCollaboration: true,
      enableCharts: true
    });
  });

  afterEach(() => {
    dashboardSystem.stop();
  });

  describe('System Initialization', () => {
    it('should initialize all components', () => {
      const status = dashboardSystem.getSystemStatus();
      
      expect(status.initialized).toBe(true);
      expect(status.components.dashboard).toBe(true);
      expect(status.components.charts).toBe(true);
      expect(status.components.notifications).toBe(true);
      expect(status.components.collaboration).toBe(true);
    });

    it('should initialize with sample data', async () => {
      await dashboardSystem.initializeWithSampleData();
      
      const status = dashboardSystem.getSystemStatus();
      expect(status.metrics.totalTests).toBeGreaterThan(0);
      expect(status.metrics.activeUsers).toBeGreaterThan(0);
    });
  });

  describe('Component Integration', () => {
    beforeEach(async () => {
      await dashboardSystem.initializeWithSampleData();
    });

    it('should integrate dashboard with notifications', async () => {
      const dashboard = dashboardSystem.getDashboard();
      const notificationSystem = dashboardSystem.getNotificationSystem();

      // Add a failing test
      dashboard.updateTestStatus({
        id: 'integration-test-1',
        name: 'Integration Test Failure',
        status: 'failed',
        suite: 'Integration Tests',
        file: 'integration.test.ts',
        error: {
          message: 'Integration test failed',
          stack: 'Error stack trace'
        }
      });

      // Wait for notification processing
      await new Promise(resolve => setTimeout(resolve, 200));

      const notifications = notificationSystem.getActiveNotifications();
      const failureNotifications = notifications.filter(n => 
        n.category === 'test_failure' && n.title === 'Test Failed'
      );

      expect(failureNotifications.length).toBeGreaterThan(0);
    });

    it('should integrate dashboard with charts', () => {
      const dashboard = dashboardSystem.getDashboard();
      const chartGenerator = dashboardSystem.getChartGenerator();

      // Update test status
      dashboard.updateTestStatus({
        id: 'chart-test-1',
        name: 'Chart Integration Test',
        status: 'passed',
        suite: 'Chart Tests',
        file: 'chart.test.ts'
      });

      // Check if charts are updated
      const charts = chartGenerator.getAllCharts();
      expect(charts.size).toBeGreaterThan(0);
    });

    it('should integrate collaboration with notifications', () => {
      const collaborationHub = dashboardSystem.getCollaborationHub();
      const notificationSystem = dashboardSystem.getNotificationSystem();

      // Add a team member
      collaborationHub.addMember({
        id: 'integration-user',
        name: 'Integration User',
        role: 'developer',
        status: 'online',
        permissions: {
          viewTests: true,
          runTests: true,
          modifyTests: true,
          viewReports: true,
          manageTeam: false
        }
      });

      // Check for team notifications
      const notifications = notificationSystem.getActiveNotifications();
      const teamNotifications = notifications.filter(n => 
        n.category === 'team_event'
      );

      expect(teamNotifications.length).toBeGreaterThan(0);
    });
  });

  describe('Real-time Updates', () => {
    beforeEach(async () => {
      await dashboardSystem.initializeWithSampleData();
    });

    it('should handle real-time test status updates', (done) => {
      const dashboard = dashboardSystem.getDashboard();
      
      dashboard.on('testStatusUpdated', (testStatus) => {
        if (testStatus.id === 'realtime-test') {
          expect(testStatus.status).toBe('running');
          done();
        }
      });

      dashboard.updateTestStatus({
        id: 'realtime-test',
        name: 'Real-time Test',
        status: 'running',
        suite: 'Real-time Tests',
        file: 'realtime.test.ts'
      });
    });

    it('should handle real-time coverage updates', (done) => {
      const dashboard = dashboardSystem.getDashboard();
      
      dashboard.on('coverageUpdated', (coverage) => {
        if (coverage.statements === 88.5) {
          expect(coverage.branches).toBe(82.1);
          done();
        }
      });

      dashboard.updateCoverage({
        timestamp: new Date(),
        statements: 88.5,
        branches: 82.1,
        functions: 91.3,
        lines: 86.7,
        files: {}
      });
    });

    it('should handle real-time team collaboration', (done) => {
      const collaborationHub = dashboardSystem.getCollaborationHub();
      
      collaborationHub.on('testRunStarted', ({ userId, testId }) => {
        if (testId === 'collab-test') {
          expect(userId).toBe('collab-user');
          done();
        }
      });

      // Add user first
      collaborationHub.addMember({
        id: 'collab-user',
        name: 'Collaboration User',
        role: 'developer',
        status: 'online',
        permissions: {
          viewTests: true,
          runTests: true,
          modifyTests: true,
          viewReports: true,
          manageTeam: false
        }
      });

      // Start test run
      collaborationHub.startTestRun('collab-user', 'collab-test');
    });
  });

  describe('Data Flow Integration', () => {
    beforeEach(async () => {
      await dashboardSystem.initializeWithSampleData();
    });

    it('should maintain data consistency across components', () => {
      const dashboard = dashboardSystem.getDashboard();
      const collaborationHub = dashboardSystem.getCollaborationHub();

      // Add team member
      collaborationHub.addMember({
        id: 'consistency-user',
        name: 'Consistency User',
        role: 'tester',
        status: 'online',
        permissions: {
          viewTests: true,
          runTests: true,
          modifyTests: false,
          viewReports: true,
          manageTeam: false
        }
      });

      // Start test run
      collaborationHub.startTestRun('consistency-user', 'consistency-test');

      // Update test status
      dashboard.updateTestStatus({
        id: 'consistency-test',
        name: 'Consistency Test',
        status: 'passed',
        suite: 'Consistency Tests',
        file: 'consistency.test.ts'
      });

      // Complete test run
      collaborationHub.completeTestRun('consistency-user', 'consistency-test', 'passed');

      // Verify data consistency
      const dashboardMetrics = dashboard.getMetrics();
      const collabData = collaborationHub.getCollaborationData();
      const member = collaborationHub.getMember('consistency-user');

      expect(dashboardMetrics.totalTests).toBeGreaterThan(0);
      expect(collabData.sharedState.runningTests['consistency-test'].status).toBe('completed');
      expect(member?.currentTests).not.toContain('consistency-test');
    });

    it('should handle concurrent updates correctly', async () => {
      const dashboard = dashboardSystem.getDashboard();
      const collaborationHub = dashboardSystem.getCollaborationHub();

      // Add multiple users
      const users = ['user1', 'user2', 'user3'];
      users.forEach(userId => {
        collaborationHub.addMember({
          id: userId,
          name: `User ${userId}`,
          role: 'developer',
          status: 'online',
          permissions: {
            viewTests: true,
            runTests: true,
            modifyTests: true,
            viewReports: true,
            manageTeam: false
          }
        });
      });

      // Simulate concurrent test updates
      const testPromises = users.map(async (userId, index) => {
        const testId = `concurrent-test-${index}`;
        
        collaborationHub.startTestRun(userId, testId);
        
        dashboard.updateTestStatus({
          id: testId,
          name: `Concurrent Test ${index}`,
          status: 'running',
          suite: 'Concurrent Tests',
          file: `concurrent${index}.test.ts`
        });

        // Simulate test completion after random delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        
        dashboard.updateTestStatus({
          id: testId,
          name: `Concurrent Test ${index}`,
          status: 'passed',
          suite: 'Concurrent Tests',
          file: `concurrent${index}.test.ts`,
          duration: 100 + index * 50
        });

        collaborationHub.completeTestRun(userId, testId, 'passed');
      });

      await Promise.all(testPromises);

      // Verify final state
      const metrics = dashboard.getMetrics();
      expect(metrics.totalTests).toBe(users.length + 3); // +3 from sample data
      expect(metrics.passedTests).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle component failures gracefully', async () => {
      const dashboard = dashboardSystem.getDashboard();
      const notificationSystem = dashboardSystem.getNotificationSystem();

      // Simulate a component error by adding invalid data
      expect(() => {
        dashboard.updateTestStatus({
          id: '',
          name: '',
          status: 'invalid' as any,
          suite: '',
          file: ''
        });
      }).not.toThrow();

      // System should still be functional
      const status = dashboardSystem.getSystemStatus();
      expect(status.initialized).toBe(true);
    });

    it('should recover from notification failures', async () => {
      const notificationSystem = dashboardSystem.getNotificationSystem();

      // Add a failing channel
      notificationSystem.addChannel({
        name: 'failing-channel',
        enabled: true,
        config: {},
        send: jest.fn().mockRejectedValue(new Error('Channel failed'))
      });

      // Add rule to use failing channel
      notificationSystem.addRule({
        id: 'failing-rule',
        name: 'Failing Rule',
        enabled: true,
        conditions: {
          category: ['test_failure']
        },
        actions: {
          channels: ['failing-channel']
        }
      });

      // Send notification that should fail
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await notificationSystem.notify({
        type: 'error',
        category: 'test_failure',
        title: 'Test Failure',
        message: 'This should trigger the failing channel',
        priority: 'high'
      });

      // System should continue working despite the failure
      const notifications = notificationSystem.getActiveNotifications();
      expect(notifications.length).toBeGreaterThan(0);

      consoleSpy.mockRestore();
    });
  });

  describe('Performance Integration', () => {
    it('should handle high-frequency updates efficiently', async () => {
      const dashboard = dashboardSystem.getDashboard();
      const startTime = Date.now();

      // Generate many rapid updates
      const updatePromises = [];
      for (let i = 0; i < 100; i++) {
        updatePromises.push(
          dashboard.updateTestStatus({
            id: `perf-test-${i}`,
            name: `Performance Test ${i}`,
            status: i % 2 === 0 ? 'passed' : 'failed',
            suite: 'Performance Tests',
            file: `perf${i}.test.ts`,
            duration: Math.random() * 1000
          })
        );
      }

      await Promise.all(updatePromises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000);

      // Verify all updates were processed
      const metrics = dashboard.getMetrics();
      expect(metrics.totalTests).toBe(103); // 100 + 3 from sample data
    });

    it('should maintain performance with large datasets', async () => {
      const dashboard = dashboardSystem.getDashboard();
      const chartGenerator = dashboardSystem.getChartGenerator();

      // Create chart with many data points
      const chart = chartGenerator.createChart('large-dataset-chart', {
        title: 'Large Dataset Chart',
        type: 'line',
        maxDataPoints: 1000
      });

      chartGenerator.addSeries('large-dataset-chart', {
        name: 'Large Dataset',
        data: [],
        type: 'line'
      });

      const startTime = Date.now();

      // Add many data points
      for (let i = 0; i < 1000; i++) {
        chartGenerator.addDataPoint('large-dataset-chart', 'Large Dataset', {
          timestamp: new Date(Date.now() + i * 1000),
          value: Math.random() * 100
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(2000);

      // Verify data was added correctly
      const updatedChart = chartGenerator.getChart('large-dataset-chart');
      expect(updatedChart?.series[0].data).toHaveLength(1000);
    });
  });

  describe('Data Export/Import Integration', () => {
    beforeEach(async () => {
      await dashboardSystem.initializeWithSampleData();
    });

    it('should export and import complete dashboard state', () => {
      const dashboard = dashboardSystem.getDashboard();
      const collaborationHub = dashboardSystem.getCollaborationHub();

      // Add some additional data
      dashboard.updateTestStatus({
        id: 'export-test',
        name: 'Export Test',
        status: 'passed',
        suite: 'Export Tests',
        file: 'export.test.ts'
      });

      collaborationHub.addSharedNote('user1', 'Export test note');

      // Export all data
      const exportedData = dashboardSystem.exportAllData();

      expect(exportedData.dashboard).toBeDefined();
      expect(exportedData.charts).toBeDefined();
      expect(exportedData.notifications).toBeDefined();
      expect(exportedData.collaboration).toBeDefined();

      // Verify exported data structure
      expect(exportedData.dashboard.testStatuses.length).toBeGreaterThan(0);
      expect(exportedData.collaboration.members.length).toBeGreaterThan(0);
      expect(exportedData.collaboration.sharedState.sharedNotes.length).toBeGreaterThan(0);
    });

    it('should maintain system integrity after import', () => {
      // Create a new dashboard system
      const newDashboardSystem = new DashboardSystem();

      // Import data from original system
      const exportedData = dashboardSystem.exportAllData();
      
      // Import into new system
      const newDashboard = newDashboardSystem.getDashboard();
      const newCollaborationHub = newDashboardSystem.getCollaborationHub();

      newDashboard.importData({
        testStatuses: exportedData.dashboard.testStatuses,
        collaborationData: exportedData.dashboard.collaborationData
      });

      newCollaborationHub.importData({
        members: exportedData.collaboration.members,
        sharedState: exportedData.collaboration.sharedState,
        activities: exportedData.collaboration.activities
      });

      // Verify imported data
      const newMetrics = newDashboard.getMetrics();
      const newCollabData = newCollaborationHub.getCollaborationData();

      expect(newMetrics.totalTests).toBeGreaterThan(0);
      expect(newCollabData.activeUsers.length).toBeGreaterThan(0);

      newDashboardSystem.stop();
    });
  });

  describe('System Status and Health', () => {
    it('should provide comprehensive system status', () => {
      const status = dashboardSystem.getSystemStatus();

      expect(status.initialized).toBe(true);
      expect(status.components).toBeDefined();
      expect(status.metrics).toBeDefined();
      expect(typeof status.metrics.totalTests).toBe('number');
      expect(typeof status.metrics.activeUsers).toBe('number');
      expect(typeof status.metrics.activeNotifications).toBe('number');
      expect(typeof status.metrics.totalCharts).toBe('number');
    });

    it('should provide detailed dashboard data', async () => {
      await dashboardSystem.initializeWithSampleData();

      const dashboardData = dashboardSystem.getDashboardData();

      expect(dashboardData.metrics).toBeDefined();
      expect(dashboardData.charts).toBeDefined();
      expect(dashboardData.notifications).toBeDefined();
      expect(dashboardData.teamData).toBeDefined();
      expect(dashboardData.status).toBeDefined();

      // Verify data structure
      expect(typeof dashboardData.metrics.totalTests).toBe('number');
      expect(Array.isArray(dashboardData.notifications)).toBe(true);
      expect(typeof dashboardData.teamData.totalMembers).toBe('number');
    });
  });
});