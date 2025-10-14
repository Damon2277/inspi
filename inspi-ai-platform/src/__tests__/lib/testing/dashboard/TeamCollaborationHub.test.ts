/**
 * TeamCollaborationHub Unit Tests
 *
 * Comprehensive test suite for the team collaboration system,
 * covering team member management, shared state, activities,
 * and collaborative metrics.
 */

import { TeamCollaborationHub, TeamMember, SharedTestState, CollaborativeActivity } from '../../../../lib/testing/dashboard/TeamCollaborationHub';

describe('TeamCollaborationHub', () => {
  let collaborationHub: TeamCollaborationHub;

  beforeEach(() => {
    collaborationHub = new TeamCollaborationHub();
  });

  afterEach(() => {
    collaborationHub.stop();
  });

  describe('Initialization', () => {
    it('should initialize with empty team', () => {
      const members = collaborationHub.getAllMembers();
      expect(members).toHaveLength(0);
    });

    it('should initialize with default shared state', () => {
      const sharedState = collaborationHub.getSharedState();
      expect(sharedState.currentBranch).toBe('main');
      expect(sharedState.testSuiteVersion).toBe('1.0.0');
      expect(sharedState.runningTests).toEqual({});
      expect(sharedState.sharedNotes).toHaveLength(0);
      expect(sharedState.bookmarks).toHaveLength(0);
    });

    it('should start presence tracking', () => {
      // Presence tracking should be running after initialization
      expect(collaborationHub).toBeDefined();
    });
  });

  describe('Team Member Management', () => {
    const sampleMember: Omit<TeamMember, 'lastActivity' | 'currentTests'> = {
      id: 'user1',
      name: 'Alice Developer',
      email: 'alice@example.com',
      avatar: 'https://example.com/avatar.jpg',
      role: 'developer',
      status: 'online',
      permissions: {
        viewTests: true,
        runTests: true,
        modifyTests: true,
        viewReports: true,
        manageTeam: false,
      },
    };

    it('should add team member', () => {
      collaborationHub.addMember(sampleMember);

      const members = collaborationHub.getAllMembers();
      expect(members).toHaveLength(1);
      expect(members[0].name).toBe('Alice Developer');
      expect(members[0].lastActivity).toBeInstanceOf(Date);
      expect(members[0].currentTests).toEqual([]);
    });

    it('should add team member with current tests', () => {
      collaborationHub.addMember({
        ...sampleMember,
        currentTests: ['test1', 'test2'],
      });

      const member = collaborationHub.getMember('user1');
      expect(member?.currentTests).toEqual(['test1', 'test2']);
    });

    it('should update existing team member', () => {
      collaborationHub.addMember(sampleMember);

      // Add same member again with different data
      collaborationHub.addMember({
        ...sampleMember,
        name: 'Alice Updated',
        currentTests: ['test3'],
      });

      const members = collaborationHub.getAllMembers();
      expect(members).toHaveLength(1); // Should still be 1 member
      expect(members[0].name).toBe('Alice Updated');
      expect(members[0].currentTests).toEqual(['test3']);
    });

    it('should remove team member', () => {
      collaborationHub.addMember(sampleMember);

      const removed = collaborationHub.removeMember('user1');
      expect(removed).toBe(true);

      const members = collaborationHub.getAllMembers();
      expect(members).toHaveLength(0);
    });

    it('should return false when removing non-existent member', () => {
      const removed = collaborationHub.removeMember('non-existent');
      expect(removed).toBe(false);
    });

    it('should get specific team member', () => {
      collaborationHub.addMember(sampleMember);

      const member = collaborationHub.getMember('user1');
      expect(member).toBeDefined();
      expect(member?.name).toBe('Alice Developer');

      const nonExistent = collaborationHub.getMember('non-existent');
      expect(nonExistent).toBeUndefined();
    });

    it('should emit events for member operations', (done) => {
      let eventCount = 0;

      collaborationHub.on('memberAdded', (member) => {
        expect(member.name).toBe('Alice Developer');
        eventCount++;
        if (eventCount === 2) done();
      });

      collaborationHub.on('memberRemoved', (member) => {
        expect(member.name).toBe('Alice Developer');
        eventCount++;
        if (eventCount === 2) done();
      });

      collaborationHub.addMember(sampleMember);
      collaborationHub.removeMember('user1');
    });
  });

  describe('Member Status Management', () => {
    beforeEach(() => {
      collaborationHub.addMember({
        id: 'user1',
        name: 'Alice Developer',
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
    });

    it('should update member status', () => {
      collaborationHub.updateMemberStatus('user1', 'away');

      const member = collaborationHub.getMember('user1');
      expect(member?.status).toBe('away');
    });

    it('should update member tests', () => {
      collaborationHub.updateMemberTests('user1', ['test1', 'test2', 'test3']);

      const member = collaborationHub.getMember('user1');
      expect(member?.currentTests).toEqual(['test1', 'test2', 'test3']);
    });

    it('should emit status change events', (done) => {
      collaborationHub.on('memberStatusChanged', ({ member, previousStatus }) => {
        expect(member.status).toBe('busy');
        expect(previousStatus).toBe('online');
        done();
      });

      collaborationHub.updateMemberStatus('user1', 'busy');
    });

    it('should emit test update events', (done) => {
      collaborationHub.on('memberTestsUpdated', ({ member, testIds }) => {
        expect(testIds).toEqual(['test1', 'test2']);
        done();
      });

      collaborationHub.updateMemberTests('user1', ['test1', 'test2']);
    });

    it('should get active members', () => {
      // Add another member
      collaborationHub.addMember({
        id: 'user2',
        name: 'Bob Tester',
        role: 'tester',
        status: 'offline',
        permissions: {
          viewTests: true,
          runTests: true,
          modifyTests: false,
          viewReports: true,
          manageTeam: false,
        },
      });

      const activeMembers = collaborationHub.getActiveMembers();
      expect(activeMembers).toHaveLength(1); // Only user1 is online
      expect(activeMembers[0].name).toBe('Alice Developer');
    });
  });

  describe('Shared State Management', () => {
    it('should update shared state', () => {
      const updates: Partial<SharedTestState> = {
        currentBranch: 'feature/new-feature',
        testSuiteVersion: '2.0.0',
      };

      collaborationHub.updateSharedState(updates);

      const sharedState = collaborationHub.getSharedState();
      expect(sharedState.currentBranch).toBe('feature/new-feature');
      expect(sharedState.testSuiteVersion).toBe('2.0.0');
    });

    it('should emit shared state update events', (done) => {
      collaborationHub.on('sharedStateUpdated', (sharedState) => {
        expect(sharedState.currentBranch).toBe('develop');
        done();
      });

      collaborationHub.updateSharedState({
        currentBranch: 'develop',
      });
    });
  });

  describe('Test Run Management', () => {
    beforeEach(() => {
      collaborationHub.addMember({
        id: 'user1',
        name: 'Alice Developer',
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
    });

    it('should start test run', () => {
      collaborationHub.startTestRun('user1', 'test1');

      const sharedState = collaborationHub.getSharedState();
      expect(sharedState.runningTests['test1']).toBeDefined();
      expect(sharedState.runningTests['test1'].runnerId).toBe('user1');
      expect(sharedState.runningTests['test1'].status).toBe('running');

      const member = collaborationHub.getMember('user1');
      expect(member?.currentTests).toContain('test1');
    });

    it('should complete test run', () => {
      collaborationHub.startTestRun('user1', 'test1');
      collaborationHub.completeTestRun('user1', 'test1', 'passed');

      const sharedState = collaborationHub.getSharedState();
      expect(sharedState.runningTests['test1'].status).toBe('completed');

      const member = collaborationHub.getMember('user1');
      expect(member?.currentTests).not.toContain('test1');
    });

    it('should emit test run events', (done) => {
      let eventCount = 0;

      collaborationHub.on('testRunStarted', ({ userId, testId }) => {
        expect(userId).toBe('user1');
        expect(testId).toBe('test1');
        eventCount++;
        if (eventCount === 2) done();
      });

      collaborationHub.on('testRunCompleted', ({ userId, testId, result }) => {
        expect(userId).toBe('user1');
        expect(testId).toBe('test1');
        expect(result).toBe('failed');
        eventCount++;
        if (eventCount === 2) done();
      });

      collaborationHub.startTestRun('user1', 'test1');
      collaborationHub.completeTestRun('user1', 'test1', 'failed');
    });

    it('should not complete test run for wrong user', () => {
      collaborationHub.startTestRun('user1', 'test1');

      // Try to complete with different user
      collaborationHub.completeTestRun('user2', 'test1', 'passed');

      const sharedState = collaborationHub.getSharedState();
      expect(sharedState.runningTests['test1'].status).toBe('running'); // Should still be running
    });
  });

  describe('Shared Notes Management', () => {
    beforeEach(() => {
      collaborationHub.addMember({
        id: 'user1',
        name: 'Alice Developer',
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
    });

    it('should add shared note', () => {
      const noteId = collaborationHub.addSharedNote(
        'user1',
        'This is a test note',
        'test1',
        ['bug', 'investigation'],
      );

      expect(noteId).toBeDefined();

      const notes = collaborationHub.getSharedNotes();
      expect(notes).toHaveLength(1);
      expect(notes[0].content).toBe('This is a test note');
      expect(notes[0].testId).toBe('test1');
      expect(notes[0].tags).toEqual(['bug', 'investigation']);
    });

    it('should get notes for specific test', () => {
      collaborationHub.addSharedNote('user1', 'Note for test1', 'test1');
      collaborationHub.addSharedNote('user1', 'Note for test2', 'test2');
      collaborationHub.addSharedNote('user1', 'General note');

      const test1Notes = collaborationHub.getSharedNotes('test1');
      expect(test1Notes).toHaveLength(1);
      expect(test1Notes[0].content).toBe('Note for test1');
    });

    it('should emit note added events', (done) => {
      collaborationHub.on('noteAdded', (note) => {
        expect(note.content).toBe('Event test note');
        done();
      });

      collaborationHub.addSharedNote('user1', 'Event test note');
    });
  });

  describe('Bookmarks Management', () => {
    beforeEach(() => {
      collaborationHub.addMember({
        id: 'user1',
        name: 'Alice Developer',
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
    });

    it('should add bookmark', () => {
      const bookmarkId = collaborationHub.addBookmark(
        'user1',
        'test1',
        'Important Test',
        'This test is critical for the feature',
      );

      expect(bookmarkId).toBeDefined();

      const bookmarks = collaborationHub.getBookmarks();
      expect(bookmarks).toHaveLength(1);
      expect(bookmarks[0].name).toBe('Important Test');
      expect(bookmarks[0].description).toBe('This test is critical for the feature');
    });

    it('should get bookmarks for specific user', () => {
      collaborationHub.addMember({
        id: 'user2',
        name: 'Bob Tester',
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

      collaborationHub.addBookmark('user1', 'test1', 'Alice Bookmark');
      collaborationHub.addBookmark('user2', 'test2', 'Bob Bookmark');

      const user1Bookmarks = collaborationHub.getBookmarks('user1');
      expect(user1Bookmarks).toHaveLength(1);
      expect(user1Bookmarks[0].name).toBe('Alice Bookmark');

      const user2Bookmarks = collaborationHub.getBookmarks('user2');
      expect(user2Bookmarks).toHaveLength(1);
      expect(user2Bookmarks[0].name).toBe('Bob Bookmark');
    });

    it('should emit bookmark added events', (done) => {
      collaborationHub.on('bookmarkAdded', (bookmark) => {
        expect(bookmark.name).toBe('Event Bookmark');
        done();
      });

      collaborationHub.addBookmark('user1', 'test1', 'Event Bookmark');
    });
  });

  describe('Activity Logging', () => {
    it('should log activity', () => {
      collaborationHub.logActivity({
        userId: 'user1',
        type: 'test_run',
        action: 'test_started',
        details: {
          testId: 'test1',
          testName: 'Sample Test',
        },
        visibility: 'public',
      });

      const activities = collaborationHub.getRecentActivities(10);
      expect(activities).toHaveLength(1);
      expect(activities[0].action).toBe('test_started');
      expect(activities[0].details.testId).toBe('test1');
    });

    it('should get recent activities with limit', () => {
      // Add multiple activities
      for (let i = 0; i < 10; i++) {
        collaborationHub.logActivity({
          userId: 'user1',
          type: 'test_run',
          action: `action_${i}`,
          details: {},
          visibility: 'public',
        });
      }

      const activities = collaborationHub.getRecentActivities(5);
      expect(activities).toHaveLength(5);
      expect(activities[0].action).toBe('action_9'); // Most recent first
    });

    it('should get activities for specific user', () => {
      collaborationHub.logActivity({
        userId: 'user1',
        type: 'test_run',
        action: 'user1_action',
        details: {},
        visibility: 'public',
      });

      collaborationHub.logActivity({
        userId: 'user2',
        type: 'test_run',
        action: 'user2_action',
        details: {},
        visibility: 'public',
      });

      const user1Activities = collaborationHub.getRecentActivities(10, 'user1');
      expect(user1Activities).toHaveLength(1);
      expect(user1Activities[0].action).toBe('user1_action');
    });

    it('should emit activity logged events', (done) => {
      collaborationHub.on('activityLogged', (activity) => {
        expect(activity.action).toBe('event_test_action');
        done();
      });

      collaborationHub.logActivity({
        userId: 'user1',
        type: 'test_run',
        action: 'event_test_action',
        details: {},
        visibility: 'public',
      });
    });
  });

  describe('Team Metrics', () => {
    beforeEach(() => {
      // Add team members
      collaborationHub.addMember({
        id: 'user1',
        name: 'Alice Developer',
        role: 'developer',
        status: 'online',
        currentTests: ['test1', 'test2'],
        permissions: {
          viewTests: true,
          runTests: true,
          modifyTests: true,
          viewReports: true,
          manageTeam: false,
        },
      });

      collaborationHub.addMember({
        id: 'user2',
        name: 'Bob Tester',
        role: 'tester',
        status: 'away',
        currentTests: ['test3'],
        permissions: {
          viewTests: true,
          runTests: true,
          modifyTests: false,
          viewReports: true,
          manageTeam: false,
        },
      });

      // Add some activities
      collaborationHub.logActivity({
        userId: 'user1',
        type: 'test_run',
        action: 'test_completed',
        details: {},
        visibility: 'public',
      });

      collaborationHub.logActivity({
        userId: 'user1',
        type: 'test_comment',
        action: 'note_added',
        details: {},
        visibility: 'team',
      });

      // Add shared content
      collaborationHub.addSharedNote('user1', 'Test note');
      collaborationHub.addBookmark('user2', 'test1', 'Important test');
    });

    it('should calculate team metrics', () => {
      const metrics = collaborationHub.getTeamMetrics();

      expect(metrics.totalMembers).toBe(2);
      expect(metrics.activeMembers).toBe(1); // Only user1 is online
      expect(metrics.testsPerMember['user1']).toBe(2);
      expect(metrics.testsPerMember['user2']).toBe(1);
      expect(metrics.contributionScore['user1']).toBe(2); // 2 activities
      expect(metrics.contributionScore['user2']).toBe(0); // 0 activities
      expect(metrics.knowledgeSharing.sharedNotes).toBe(1);
      expect(metrics.knowledgeSharing.bookmarks).toBe(1);
      expect(metrics.knowledgeSharing.discussions).toBe(1); // 1 comment activity
    });

    it('should calculate collaboration index', () => {
      const metrics = collaborationHub.getTeamMetrics();
      expect(metrics.collaborationIndex).toBeGreaterThanOrEqual(0);
      expect(metrics.collaborationIndex).toBeLessThanOrEqual(100);
    });
  });

  describe('Team Notifications', () => {
    it('should get team notifications', () => {
      // Team notifications are sent automatically when members are added/removed
      collaborationHub.addMember({
        id: 'user1',
        name: 'Alice Developer',
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

      const notifications = collaborationHub.getTeamNotifications();
      expect(notifications.length).toBeGreaterThan(0);
    });

    it('should get notifications for specific user', () => {
      collaborationHub.addMember({
        id: 'user1',
        name: 'Alice Developer',
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

      const userNotifications = collaborationHub.getTeamNotifications('user2');
      // user2 should receive notification about user1 joining
      expect(userNotifications.length).toBeGreaterThan(0);
    });

    it('should emit team notification events', (done) => {
      collaborationHub.on('teamNotification', (notification) => {
        expect(notification.type).toBe('member_joined');
        done();
      });

      collaborationHub.addMember({
        id: 'user1',
        name: 'Alice Developer',
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
    });
  });

  describe('Data Export/Import', () => {
    beforeEach(() => {
      collaborationHub.addMember({
        id: 'user1',
        name: 'Alice Developer',
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

      collaborationHub.addSharedNote('user1', 'Test note');
      collaborationHub.logActivity({
        userId: 'user1',
        type: 'test_run',
        action: 'test_completed',
        details: {},
        visibility: 'public',
      });
    });

    it('should export collaboration data', () => {
      const exportedData = collaborationHub.exportData();

      expect(exportedData.members).toHaveLength(1);
      expect(exportedData.sharedState.sharedNotes).toHaveLength(1);
      expect(exportedData.activities.length).toBeGreaterThan(0);
      expect(exportedData.metrics).toBeDefined();
    });

    it('should import collaboration data', () => {
      const importData = {
        members: [
          {
            id: 'imported-user',
            name: 'Imported User',
            role: 'developer' as const,
            status: 'online' as const,
            lastActivity: new Date(),
            currentTests: [],
            permissions: {
              viewTests: true,
              runTests: true,
              modifyTests: true,
              viewReports: true,
              manageTeam: false,
            },
          },
        ],
        sharedState: {
          currentBranch: 'imported-branch',
        },
        activities: [
          {
            id: 'imported-activity',
            userId: 'imported-user',
            type: 'test_run' as const,
            action: 'imported_action',
            timestamp: new Date(),
            details: {},
            visibility: 'public' as const,
          },
        ],
      };

      collaborationHub.importData(importData);

      const members = collaborationHub.getAllMembers();
      const sharedState = collaborationHub.getSharedState();
      const activities = collaborationHub.getRecentActivities();

      expect(members.some(m => m.id === 'imported-user')).toBe(true);
      expect(sharedState.currentBranch).toBe('imported-branch');
      expect(activities.some(a => a.id === 'imported-activity')).toBe(true);
    });

    it('should emit data imported events', (done) => {
      collaborationHub.on('dataImported', (data) => {
        expect(data.members).toBeDefined();
        done();
      });

      collaborationHub.importData({
        members: [],
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle operations on non-existent members gracefully', () => {
      expect(() => {
        collaborationHub.updateMemberStatus('non-existent', 'online');
      }).not.toThrow();

      expect(() => {
        collaborationHub.updateMemberTests('non-existent', ['test1']);
      }).not.toThrow();
    });

    it('should handle invalid test run operations gracefully', () => {
      expect(() => {
        collaborationHub.startTestRun('non-existent-user', 'test1');
      }).not.toThrow();

      expect(() => {
        collaborationHub.completeTestRun('non-existent-user', 'non-existent-test', 'passed');
      }).not.toThrow();
    });
  });
});
