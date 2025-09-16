/**
 * RealTimeDashboard Unit Tests
 * 
 * Comprehensive test suite for the real-time dashboard system,
 * covering test execution monitoring, coverage tracking, notifications,
 * and team collaboration features.
 */

import { RealTimeDashboard, TestExecutionStatus, CoverageSnapshot } from '../../../../lib/testing/dashboard/RealTimeDashboard';

describe('RealTimeDashboard', () => {
  let dashboard: RealTimeDashboard;

  beforeEach(() => {
    dashboard = new RealTimeDashboard({
      enabled: true,
      channels: ['console'],
      thresholds: {
        failureRate: 10,
        coverageDropThreshold: 5,
        performanceDegradation: 50
      }
    }, 100); // Fast update interval for testing
  });

  afterEach(() => {
    dashboard.stop();
  });

  describe('Initialization', () => {
    it('should initialize with default metrics', () => {
      const metrics = dashboard.getMetrics();
      
      expect(metrics.totalTests).toBe(0);
      expect(metrics.passedTests).toBe(0);
      expect(metrics.failedTests).toBe(0);
      expect(metrics.runningTests).toBe(0);
      expect(metrics.coverage.statements).toBe(0);
      expect(metrics.recentFailures).toHaveLength(0);
    });

    it('should initialize with empty collaboration data', () => {
      const collabData = dashboard.getCollaborationData();
      
      expect(collabData.activeUsers).toHaveLength(0);
      expect(collabData.sharedState.currentBranch).toBe('main');
      expect(collabData.collaborativeMetrics.totalContributors).toBe(0);
    });

    it('should start real-time updates', () => {
      const status = dashboard.getStatus();
      expect(status.isRunning).toBe(true);
    });
  });

  describe('Test Status Management', () => {
    it('should update test status correctly', () => {
      const testStatus: TestExecutionStatus = {
        id: 'test1',
        name: 'Sample Test',
        status: 'running',
        startTime: new Date(),
        suite: 'Test Suite',
        file: 'test.spec.ts'
      };

      dashboard.updateTestStatus(testStatus);
      
      const metrics = dashboard.getMetrics();
      expect(metrics.totalTests).toBe(1);
      expect(metrics.runningTests).toBe(1);
    });

    it('should handle test completion', () => {
      const testStatus: TestExecutionStatus = {
        id: 'test1',
        name: 'Sample Test',
        status: 'passed',
        startTime: new Date(Date.now() - 1000),
        endTime: new Date(),
        duration: 1000,
        suite: 'Test Suite',
        file: 'test.spec.ts'
      };

      dashboard.updateTestStatus(testStatus);
      
      const metrics = dashboard.getMetrics();
      expect(metrics.totalTests).toBe(1);
      expect(metrics.passedTests).toBe(1);
      expect(metrics.runningTests).toBe(0);
      expect(metrics.executionTime).toBe(1000);
    });

    it('should handle test failures', () => {
      const testStatus: TestExecutionStatus = {
        id: 'test1',
        name: 'Failing Test',
        status: 'failed',
        startTime: new Date(Date.now() - 500),
        endTime: new Date(),
        duration: 500,
        suite: 'Test Suite',
        file: 'test.spec.ts',
        error: {
          message: 'Test failed',
          stack: 'Error stack trace'
        }
      };

      dashboard.updateTestStatus(testStatus);
      
      const metrics = dashboard.getMetrics();
      expect(metrics.totalTests).toBe(1);
      expect(metrics.failedTests).toBe(1);
      expect(metrics.recentFailures).toHaveLength(1);
      expect(metrics.recentFailures[0].id).toBe('test1');
    });

    it('should emit events on test status updates', (done) => {
      const testStatus: TestExecutionStatus = {
        id: 'test1',
        name: 'Sample Test',
        status: 'running',
        suite: 'Test Suite',
        file: 'test.spec.ts'
      };

      dashboard.on('testStatusUpdated', (status) => {
        expect(status.id).toBe('test1');
        expect(status.status).toBe('running');
        done();
      });

      dashboard.updateTestStatus(testStatus);
    });

    it('should track test timeline', () => {
      const tests = [
        {
          id: 'test1',
          name: 'Test 1',
          status: 'passed' as const,
          startTime: new Date(Date.now() - 2000),
          suite: 'Suite 1',
          file: 'test1.spec.ts'
        },
        {
          id: 'test2',
          name: 'Test 2',
          status: 'failed' as const,
          startTime: new Date(Date.now() - 1000),
          suite: 'Suite 2',
          file: 'test2.spec.ts'
        }
      ];

      tests.forEach(test => dashboard.updateTestStatus(test));
      
      const timeline = dashboard.getTestTimeline();
      expect(timeline).toHaveLength(2);
      expect(timeline[0].id).toBe('test2'); // Most recent first
      expect(timeline[1].id).toBe('test1');
    });
  });

  describe('Coverage Management', () => {
    it('should update coverage correctly', () => {
      const coverage: CoverageSnapshot = {
        timestamp: new Date(),
        statements: 85.5,
        branches: 78.2,
        functions: 92.1,
        lines: 83.7,
        files: {
          'src/test.ts': {
            statements: 90,
            branches: 85,
            functions: 95,
            lines: 88
          }
        }
      };

      dashboard.updateCoverage(coverage);
      
      const metrics = dashboard.getMetrics();
      expect(metrics.coverage.statements).toBe(85.5);
      expect(metrics.coverage.branches).toBe(78.2);
      expect(metrics.coverage.files['src/test.ts'].statements).toBe(90);
    });

    it('should maintain coverage history', () => {
      const coverage1: CoverageSnapshot = {
        timestamp: new Date(Date.now() - 1000),
        statements: 80,
        branches: 75,
        functions: 90,
        lines: 78,
        files: {}
      };

      const coverage2: CoverageSnapshot = {
        timestamp: new Date(),
        statements: 85,
        branches: 80,
        functions: 92,
        lines: 83,
        files: {}
      };

      dashboard.updateCoverage(coverage1);
      dashboard.updateCoverage(coverage2);
      
      const history = dashboard.getCoverageHistory();
      expect(history).toHaveLength(2);
      expect(history[0].statements).toBe(80);
      expect(history[1].statements).toBe(85);
    });

    it('should emit events on coverage updates', (done) => {
      const coverage: CoverageSnapshot = {
        timestamp: new Date(),
        statements: 85,
        branches: 80,
        functions: 90,
        lines: 82,
        files: {}
      };

      dashboard.on('coverageUpdated', (updatedCoverage) => {
        expect(updatedCoverage.statements).toBe(85);
        done();
      });

      dashboard.updateCoverage(coverage);
    });

    it('should limit coverage history size', () => {
      // Add more than 100 coverage snapshots
      for (let i = 0; i < 150; i++) {
        dashboard.updateCoverage({
          timestamp: new Date(Date.now() + i * 1000),
          statements: 80 + (i % 20),
          branches: 75,
          functions: 90,
          lines: 78,
          files: {}
        });
      }

      const history = dashboard.getCoverageHistory();
      expect(history).toHaveLength(100); // Should be limited to 100
    });
  });

  describe('Team Collaboration', () => {
    it('should add team members', () => {
      dashboard.addTeamMember({
        id: 'user1',
        name: 'Alice Developer',
        currentTests: ['test1', 'test2']
      });

      const collabData = dashboard.getCollaborationData();
      expect(collabData.activeUsers).toHaveLength(1);
      expect(collabData.activeUsers[0].name).toBe('Alice Developer');
      expect(collabData.activeUsers[0].currentTests).toEqual(['test1', 'test2']);
    });

    it('should remove team members', () => {
      dashboard.addTeamMember({
        id: 'user1',
        name: 'Alice Developer'
      });

      dashboard.removeTeamMember('user1');

      const collabData = dashboard.getCollaborationData();
      expect(collabData.activeUsers).toHaveLength(0);
    });

    it('should update shared state', () => {
      dashboard.updateSharedState({
        currentBranch: 'feature/new-feature',
        lastCommit: 'abc123'
      });

      const collabData = dashboard.getCollaborationData();
      expect(collabData.sharedState.currentBranch).toBe('feature/new-feature');
      expect(collabData.sharedState.lastCommit).toBe('abc123');
    });

    it('should emit events for team member updates', (done) => {
      dashboard.on('teamMemberUpdated', (userData) => {
        expect(userData.name).toBe('Bob Tester');
        done();
      });

      dashboard.addTeamMember({
        id: 'user2',
        name: 'Bob Tester'
      });
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate performance metrics', () => {
      const tests = [
        {
          id: 'test1',
          name: 'Fast Test',
          status: 'passed' as const,
          duration: 100,
          startTime: new Date(Date.now() - 1000),
          endTime: new Date(Date.now() - 900),
          suite: 'Suite 1',
          file: 'test1.spec.ts'
        },
        {
          id: 'test2',
          name: 'Slow Test',
          status: 'passed' as const,
          duration: 500,
          startTime: new Date(Date.now() - 800),
          endTime: new Date(Date.now() - 300),
          suite: 'Suite 2',
          file: 'test2.spec.ts'
        }
      ];

      tests.forEach(test => dashboard.updateTestStatus(test));

      const metrics = dashboard.getMetrics();
      expect(metrics.performanceMetrics.averageTestTime).toBe(300); // (100 + 500) / 2
      expect(metrics.performanceMetrics.slowestTests).toHaveLength(2);
      expect(metrics.performanceMetrics.slowestTests[0].name).toBe('Slow Test');
    });

    it('should track memory usage', () => {
      const metrics = dashboard.getMetrics();
      expect(metrics.performanceMetrics.memoryUsage.current).toBeGreaterThanOrEqual(0);
      expect(metrics.performanceMetrics.memoryUsage.peak).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Data Export/Import', () => {
    it('should export dashboard data', () => {
      // Add some test data
      dashboard.updateTestStatus({
        id: 'test1',
        name: 'Test 1',
        status: 'passed',
        suite: 'Suite 1',
        file: 'test1.spec.ts'
      });

      dashboard.addTeamMember({
        id: 'user1',
        name: 'Alice'
      });

      const exportedData = dashboard.exportData();
      
      expect(exportedData.metrics).toBeDefined();
      expect(exportedData.testStatuses).toHaveLength(1);
      expect(exportedData.collaborationData.activeUsers).toHaveLength(1);
    });

    it('should import dashboard data', () => {
      const importData = {
        testStatuses: [
          {
            id: 'imported-test',
            name: 'Imported Test',
            status: 'passed' as const,
            suite: 'Imported Suite',
            file: 'imported.spec.ts'
          }
        ],
        collaborationData: {
          activeUsers: [
            {
              id: 'imported-user',
              name: 'Imported User',
              lastActivity: new Date(),
              currentTests: []
            }
          ]
        }
      };

      dashboard.importData(importData);

      const timeline = dashboard.getTestTimeline();
      const collabData = dashboard.getCollaborationData();
      
      expect(timeline).toHaveLength(1);
      expect(timeline[0].id).toBe('imported-test');
      expect(collabData.activeUsers).toHaveLength(1);
      expect(collabData.activeUsers[0].id).toBe('imported-user');
    });
  });

  describe('Dashboard Reset', () => {
    it('should reset dashboard state', () => {
      // Add some data
      dashboard.updateTestStatus({
        id: 'test1',
        name: 'Test 1',
        status: 'passed',
        suite: 'Suite 1',
        file: 'test1.spec.ts'
      });

      dashboard.addTeamMember({
        id: 'user1',
        name: 'Alice'
      });

      // Reset
      dashboard.reset();

      const metrics = dashboard.getMetrics();
      const collabData = dashboard.getCollaborationData();
      
      expect(metrics.totalTests).toBe(0);
      expect(collabData.activeUsers).toHaveLength(0);
    });

    it('should emit reset event', (done) => {
      dashboard.on('dashboardReset', () => {
        done();
      });

      dashboard.reset();
    });
  });

  describe('Real-time Updates', () => {
    it('should emit metrics updates', (done) => {
      dashboard.on('metricsUpdated', (metrics) => {
        expect(metrics).toBeDefined();
        expect(metrics.totalTests).toBeGreaterThanOrEqual(0);
        done();
      });

      // Trigger an update by adding a test
      dashboard.updateTestStatus({
        id: 'test1',
        name: 'Test 1',
        status: 'running',
        suite: 'Suite 1',
        file: 'test1.spec.ts'
      });
    });

    it('should stop real-time updates', () => {
      dashboard.stop();
      const status = dashboard.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid test status updates gracefully', () => {
      expect(() => {
        dashboard.updateTestStatus({
          id: '',
          name: '',
          status: 'invalid' as any,
          suite: '',
          file: ''
        });
      }).not.toThrow();
    });

    it('should handle invalid coverage data gracefully', () => {
      expect(() => {
        dashboard.updateCoverage({
          timestamp: new Date(),
          statements: -1,
          branches: 150,
          functions: NaN,
          lines: undefined as any,
          files: null as any
        });
      }).not.toThrow();
    });
  });

  describe('Status Information', () => {
    it('should provide dashboard status', () => {
      dashboard.updateTestStatus({
        id: 'test1',
        name: 'Test 1',
        status: 'passed',
        suite: 'Suite 1',
        file: 'test1.spec.ts'
      });

      dashboard.addTeamMember({
        id: 'user1',
        name: 'Alice'
      });

      const status = dashboard.getStatus();
      
      expect(status.isRunning).toBe(true);
      expect(status.totalTests).toBe(1);
      expect(status.activeUsers).toBe(1);
      expect(status.lastUpdate).toBeInstanceOf(Date);
    });
  });
});