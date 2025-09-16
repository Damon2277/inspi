/**
 * Team Collaboration Hub
 * 
 * Manages team collaboration features for real-time test monitoring,
 * including shared state, user presence, and collaborative metrics.
 */

import { EventEmitter } from 'events';

export interface TeamMember {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role: 'developer' | 'tester' | 'lead' | 'admin';
  status: 'online' | 'away' | 'busy' | 'offline';
  lastActivity: Date;
  currentTests: string[];
  permissions: {
    viewTests: boolean;
    runTests: boolean;
    modifyTests: boolean;
    viewReports: boolean;
    manageTeam: boolean;
  };
}

export interface SharedTestState {
  currentBranch: string;
  lastCommit: {
    hash: string;
    message: string;
    author: string;
    timestamp: Date;
  };
  testSuiteVersion: string;
  runningTests: {
    [testId: string]: {
      runnerId: string;
      startTime: Date;
      status: 'running' | 'paused' | 'completed';
    };
  };
  sharedNotes: Array<{
    id: string;
    authorId: string;
    content: string;
    timestamp: Date;
    testId?: string;
    tags: string[];
  }>;
  bookmarks: Array<{
    id: string;
    userId: string;
    testId: string;
    name: string;
    description?: string;
    timestamp: Date;
  }>;
}

export interface CollaborativeActivity {
  id: string;
  userId: string;
  type: 'test_run' | 'test_create' | 'test_modify' | 'test_comment' | 'report_view' | 'system_action';
  action: string;
  timestamp: Date;
  details: {
    testId?: string;
    testName?: string;
    fileName?: string;
    changes?: any;
    metadata?: any;
  };
  visibility: 'public' | 'team' | 'private';
}

export interface TeamMetrics {
  totalMembers: number;
  activeMembers: number;
  testsPerMember: { [userId: string]: number };
  contributionScore: { [userId: string]: number };
  collaborationIndex: number; // 0-100 score based on team interaction
  recentActivity: CollaborativeActivity[];
  testOwnership: { [testId: string]: string[] }; // test -> responsible users
  knowledgeSharing: {
    sharedNotes: number;
    bookmarks: number;
    discussions: number;
  };
}

export interface TeamNotification {
  id: string;
  type: 'member_joined' | 'member_left' | 'test_shared' | 'milestone_reached' | 'conflict_detected';
  message: string;
  timestamp: Date;
  data?: any;
  recipients: string[]; // user IDs
}

export class TeamCollaborationHub extends EventEmitter {
  private members: Map<string, TeamMember> = new Map();
  private sharedState: SharedTestState;
  private activities: CollaborativeActivity[] = [];
  private notifications: TeamNotification[] = [];
  private presenceInterval: NodeJS.Timeout | null = null;
  private maxActivities: number = 1000;
  private maxNotifications: number = 100;

  constructor() {
    super();
    this.sharedState = this.initializeSharedState();
    this.startPresenceTracking();
  }

  /**
   * Initialize shared state
   */
  private initializeSharedState(): SharedTestState {
    return {
      currentBranch: 'main',
      lastCommit: {
        hash: '',
        message: '',
        author: '',
        timestamp: new Date()
      },
      testSuiteVersion: '1.0.0',
      runningTests: {},
      sharedNotes: [],
      bookmarks: []
    };
  }

  /**
   * Start presence tracking
   */
  private startPresenceTracking(): void {
    this.presenceInterval = setInterval(() => {
      this.updateMemberPresence();
      this.emit('presenceUpdated', this.getActiveMembers());
    }, 30000); // Update every 30 seconds
  }

  /**
   * Stop presence tracking
   */
  public stop(): void {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }
  }

  /**
   * Add team member
   */
  public addMember(member: Omit<TeamMember, 'lastActivity' | 'currentTests'>): void {
    const fullMember: TeamMember = {
      ...member,
      lastActivity: new Date(),
      currentTests: []
    };

    this.members.set(member.id, fullMember);
    
    this.logActivity({
      userId: 'system',
      type: 'system_action',
      action: 'member_added',
      details: {
        metadata: { memberId: member.id, memberName: member.name }
      },
      visibility: 'team'
    });

    this.sendTeamNotification({
      type: 'member_joined',
      message: `${member.name} joined the team`,
      data: { member: fullMember },
      recipients: Array.from(this.members.keys()).filter(id => id !== member.id)
    });

    this.emit('memberAdded', fullMember);
  }

  /**
   * Remove team member
   */
  public removeMember(userId: string): boolean {
    const member = this.members.get(userId);
    if (!member) return false;

    this.members.delete(userId);

    this.logActivity({
      userId: 'system',
      type: 'system_action',
      action: 'member_removed',
      details: {
        metadata: { memberId: userId, memberName: member.name }
      },
      visibility: 'team'
    });

    this.sendTeamNotification({
      type: 'member_left',
      message: `${member.name} left the team`,
      data: { member },
      recipients: Array.from(this.members.keys())
    });

    this.emit('memberRemoved', member);
    return true;
  }

  /**
   * Update member status
   */
  public updateMemberStatus(userId: string, status: TeamMember['status']): void {
    const member = this.members.get(userId);
    if (!member) return;

    const previousStatus = member.status;
    member.status = status;
    member.lastActivity = new Date();

    if (previousStatus !== status) {
      this.emit('memberStatusChanged', { member, previousStatus });
    }
  }

  /**
   * Update member's current tests
   */
  public updateMemberTests(userId: string, testIds: string[]): void {
    const member = this.members.get(userId);
    if (!member) return;

    member.currentTests = [...testIds];
    member.lastActivity = new Date();

    this.emit('memberTestsUpdated', { member, testIds });
  }

  /**
   * Get team member
   */
  public getMember(userId: string): TeamMember | undefined {
    return this.members.get(userId);
  }

  /**
   * Get all team members
   */
  public getAllMembers(): TeamMember[] {
    return Array.from(this.members.values());
  }

  /**
   * Get active members
   */
  public getActiveMembers(): TeamMember[] {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return Array.from(this.members.values())
      .filter(member => 
        member.status === 'online' && 
        member.lastActivity > fiveMinutesAgo
      );
  }

  /**
   * Update shared state
   */
  public updateSharedState(updates: Partial<SharedTestState>): void {
    this.sharedState = { ...this.sharedState, ...updates };
    
    this.logActivity({
      userId: 'system',
      type: 'system_action',
      action: 'shared_state_updated',
      details: {
        metadata: { updates }
      },
      visibility: 'team'
    });

    this.emit('sharedStateUpdated', this.sharedState);
  }

  /**
   * Get shared state
   */
  public getSharedState(): SharedTestState {
    return { ...this.sharedState };
  }

  /**
   * Start test run
   */
  public startTestRun(userId: string, testId: string): void {
    const member = this.members.get(userId);
    if (!member) return;

    this.sharedState.runningTests[testId] = {
      runnerId: userId,
      startTime: new Date(),
      status: 'running'
    };

    if (!member.currentTests.includes(testId)) {
      member.currentTests.push(testId);
    }

    this.logActivity({
      userId,
      type: 'test_run',
      action: 'test_started',
      details: {
        testId,
        testName: `Test ${testId}`
      },
      visibility: 'public'
    });

    this.emit('testRunStarted', { userId, testId });
  }

  /**
   * Complete test run
   */
  public completeTestRun(userId: string, testId: string, result: 'passed' | 'failed'): void {
    const runningTest = this.sharedState.runningTests[testId];
    if (!runningTest || runningTest.runnerId !== userId) return;

    runningTest.status = 'completed';
    
    const member = this.members.get(userId);
    if (member) {
      member.currentTests = member.currentTests.filter(id => id !== testId);
    }

    this.logActivity({
      userId,
      type: 'test_run',
      action: 'test_completed',
      details: {
        testId,
        testName: `Test ${testId}`,
        metadata: { result }
      },
      visibility: 'public'
    });

    this.emit('testRunCompleted', { userId, testId, result });
  }

  /**
   * Add shared note
   */
  public addSharedNote(
    authorId: string,
    content: string,
    testId?: string,
    tags: string[] = []
  ): string {
    const note = {
      id: this.generateId(),
      authorId,
      content,
      timestamp: new Date(),
      testId,
      tags
    };

    this.sharedState.sharedNotes.push(note);

    this.logActivity({
      userId: authorId,
      type: 'test_comment',
      action: 'note_added',
      details: {
        testId,
        metadata: { noteId: note.id, tags }
      },
      visibility: 'team'
    });

    this.emit('noteAdded', note);
    return note.id;
  }

  /**
   * Add bookmark
   */
  public addBookmark(
    userId: string,
    testId: string,
    name: string,
    description?: string
  ): string {
    const bookmark = {
      id: this.generateId(),
      userId,
      testId,
      name,
      description,
      timestamp: new Date()
    };

    this.sharedState.bookmarks.push(bookmark);

    this.logActivity({
      userId,
      type: 'test_comment',
      action: 'bookmark_added',
      details: {
        testId,
        metadata: { bookmarkId: bookmark.id, name }
      },
      visibility: 'private'
    });

    this.emit('bookmarkAdded', bookmark);
    return bookmark.id;
  }

  /**
   * Get shared notes
   */
  public getSharedNotes(testId?: string): typeof this.sharedState.sharedNotes {
    if (testId) {
      return this.sharedState.sharedNotes.filter(note => note.testId === testId);
    }
    return [...this.sharedState.sharedNotes];
  }

  /**
   * Get bookmarks
   */
  public getBookmarks(userId?: string): typeof this.sharedState.bookmarks {
    if (userId) {
      return this.sharedState.bookmarks.filter(bookmark => bookmark.userId === userId);
    }
    return [...this.sharedState.bookmarks];
  }

  /**
   * Log activity
   */
  public logActivity(activity: Omit<CollaborativeActivity, 'id' | 'timestamp'>): void {
    const fullActivity: CollaborativeActivity = {
      id: this.generateId(),
      timestamp: new Date(),
      ...activity
    };

    this.activities.push(fullActivity);

    // Trim activities if needed
    if (this.activities.length > this.maxActivities) {
      this.activities = this.activities.slice(-this.maxActivities);
    }

    this.emit('activityLogged', fullActivity);
  }

  /**
   * Get recent activities
   */
  public getRecentActivities(limit: number = 50, userId?: string): CollaborativeActivity[] {
    let activities = [...this.activities];

    if (userId) {
      activities = activities.filter(activity => activity.userId === userId);
    }

    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get team metrics
   */
  public getTeamMetrics(): TeamMetrics {
    const members = Array.from(this.members.values());
    const activeMembers = this.getActiveMembers();

    // Calculate tests per member
    const testsPerMember: { [userId: string]: number } = {};
    members.forEach(member => {
      testsPerMember[member.id] = member.currentTests.length;
    });

    // Calculate contribution scores
    const contributionScore: { [userId: string]: number } = {};
    members.forEach(member => {
      const userActivities = this.activities.filter(a => a.userId === member.id);
      contributionScore[member.id] = userActivities.length;
    });

    // Calculate collaboration index
    const collaborationIndex = this.calculateCollaborationIndex();

    // Get test ownership
    const testOwnership: { [testId: string]: string[] } = {};
    Object.keys(this.sharedState.runningTests).forEach(testId => {
      const runnerId = this.sharedState.runningTests[testId].runnerId;
      testOwnership[testId] = [runnerId];
    });

    return {
      totalMembers: members.length,
      activeMembers: activeMembers.length,
      testsPerMember,
      contributionScore,
      collaborationIndex,
      recentActivity: this.getRecentActivities(20),
      testOwnership,
      knowledgeSharing: {
        sharedNotes: this.sharedState.sharedNotes.length,
        bookmarks: this.sharedState.bookmarks.length,
        discussions: this.activities.filter(a => a.type === 'test_comment').length
      }
    };
  }

  /**
   * Send team notification
   */
  private sendTeamNotification(
    notification: Omit<TeamNotification, 'id' | 'timestamp'>
  ): void {
    const fullNotification: TeamNotification = {
      id: this.generateId(),
      timestamp: new Date(),
      ...notification
    };

    this.notifications.push(fullNotification);

    // Trim notifications if needed
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(-this.maxNotifications);
    }

    this.emit('teamNotification', fullNotification);
  }

  /**
   * Get team notifications
   */
  public getTeamNotifications(userId?: string, limit: number = 20): TeamNotification[] {
    let notifications = [...this.notifications];

    if (userId) {
      notifications = notifications.filter(n => n.recipients.includes(userId));
    }

    return notifications
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Update member presence
   */
  private updateMemberPresence(): void {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    this.members.forEach(member => {
      if (member.status === 'online' && member.lastActivity < fiveMinutesAgo) {
        member.status = 'away';
      }
    });
  }

  /**
   * Calculate collaboration index
   */
  private calculateCollaborationIndex(): number {
    const members = Array.from(this.members.values());
    if (members.length < 2) return 0;

    // Factors that contribute to collaboration:
    // 1. Shared notes and bookmarks
    // 2. Cross-member test interactions
    // 3. Communication frequency
    // 4. Knowledge sharing

    let score = 0;
    const maxScore = 100;

    // Shared knowledge (30% of score)
    const sharedKnowledge = this.sharedState.sharedNotes.length + this.sharedState.bookmarks.length;
    score += Math.min(30, (sharedKnowledge / members.length) * 10);

    // Activity diversity (40% of score)
    const activityTypes = new Set(this.activities.map(a => a.type));
    score += (activityTypes.size / 5) * 40; // 5 different activity types

    // Member participation (30% of score)
    const activeMembers = this.getActiveMembers().length;
    score += (activeMembers / members.length) * 30;

    return Math.min(maxScore, Math.round(score));
  }

  /**
   * Export collaboration data
   */
  public exportData(): {
    members: TeamMember[];
    sharedState: SharedTestState;
    activities: CollaborativeActivity[];
    notifications: TeamNotification[];
    metrics: TeamMetrics;
  } {
    return {
      members: this.getAllMembers(),
      sharedState: this.getSharedState(),
      activities: this.getRecentActivities(1000),
      notifications: this.getTeamNotifications(undefined, 100),
      metrics: this.getTeamMetrics()
    };
  }

  /**
   * Import collaboration data
   */
  public importData(data: {
    members?: TeamMember[];
    sharedState?: Partial<SharedTestState>;
    activities?: CollaborativeActivity[];
    notifications?: TeamNotification[];
  }): void {
    if (data.members) {
      this.members.clear();
      data.members.forEach(member => {
        this.members.set(member.id, member);
      });
    }

    if (data.sharedState) {
      this.sharedState = { ...this.sharedState, ...data.sharedState };
    }

    if (data.activities) {
      this.activities = [...data.activities];
    }

    if (data.notifications) {
      this.notifications = [...data.notifications];
    }

    this.emit('dataImported', data);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `collab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}