#!/usr/bin/env node

/**
 * 团队通知脚本
 * 用于自动发送任务状态变更和协作通知
 */

const fs = require('fs');
const path = require('path');

// 通知类型定义
const NOTIFICATION_TYPES = {
  TASK_STATUS_CHANGE: 'task_status_change',
  BLOCKING_ISSUE: 'blocking_issue',
  COLLABORATION_REQUEST: 'collaboration_request',
  MILESTONE_ACHIEVED: 'milestone_achieved',
  QUALITY_GATE_FAILED: 'quality_gate_failed'
};

// 通知优先级
const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

class TeamNotifier {
  constructor() {
    this.notifications = [];
    this.subscribers = this.loadSubscribers();
  }

  /**
   * 加载订阅者配置
   */
  loadSubscribers() {
    const configFile = path.join(process.cwd(), 'docs', 'config', 'team-config.json');
    
    if (fs.existsSync(configFile)) {
      try {
        return JSON.parse(fs.readFileSync(configFile, 'utf8'));
      } catch (error) {
        console.warn('Failed to load team config:', error.message);
      }
    }

    // 默认配置
    return {
      members: [
        {
          name: 'Team Lead',
          email: 'lead@example.com',
          notifications: ['all']
        },
        {
          name: 'Developer',
          email: 'dev@example.com', 
          notifications: ['task_status_change', 'blocking_issue']
        }
      ],
      channels: {
        slack: '#project-updates',
        email: true,
        console: true
      }
    };
  }

  /**
   * 发送任务状态变更通知
   */
  notifyTaskStatusChange(taskInfo) {
    const notification = {
      type: NOTIFICATION_TYPES.TASK_STATUS_CHANGE,
      priority: this.getStatusChangePriority(taskInfo.oldStatus, taskInfo.newStatus),
      title: `Task Status Changed: ${taskInfo.taskName}`,
      message: `Task "${taskInfo.taskName}" changed from ${taskInfo.oldStatus} to ${taskInfo.newStatus}`,
      details: {
        task: taskInfo.taskName,
        oldStatus: taskInfo.oldStatus,
        newStatus: taskInfo.newStatus,
        assignee: taskInfo.assignee,
        timestamp: new Date().toISOString()
      },
      recipients: this.getRecipientsForNotification('task_status_change')
    };

    this.sendNotification(notification);
  }

  /**
   * 发送阻断问题通知
   */
  notifyBlockingIssue(issueInfo) {
    const notification = {
      type: NOTIFICATION_TYPES.BLOCKING_ISSUE,
      priority: PRIORITY_LEVELS.CRITICAL,
      title: `🚨 BLOCKING ISSUE: ${issueInfo.title}`,
      message: `Critical issue blocking progress: ${issueInfo.description}`,
      details: {
        issueId: issueInfo.id,
        severity: issueInfo.severity,
        affectedTasks: issueInfo.affectedTasks,
        reporter: issueInfo.reporter,
        timestamp: new Date().toISOString()
      },
      recipients: this.getRecipientsForNotification('blocking_issue')
    };

    this.sendNotification(notification);
  }

  /**
   * 发送协作请求通知
   */
  notifyCollaborationRequest(requestInfo) {
    const notification = {
      type: NOTIFICATION_TYPES.COLLABORATION_REQUEST,
      priority: this.getCollaborationPriority(requestInfo.urgency),
      title: `Collaboration Request: ${requestInfo.title}`,
      message: `${requestInfo.requester} needs collaboration on: ${requestInfo.description}`,
      details: {
        requester: requestInfo.requester,
        collaborationType: requestInfo.type,
        urgency: requestInfo.urgency,
        estimatedTime: requestInfo.estimatedTime,
        timestamp: new Date().toISOString()
      },
      recipients: requestInfo.targetCollaborators || this.getRecipientsForNotification('collaboration_request')
    };

    this.sendNotification(notification);
  }

  /**
   * 发送里程碑达成通知
   */
  notifyMilestoneAchieved(milestoneInfo) {
    const notification = {
      type: NOTIFICATION_TYPES.MILESTONE_ACHIEVED,
      priority: PRIORITY_LEVELS.MEDIUM,
      title: `🎉 Milestone Achieved: ${milestoneInfo.name}`,
      message: `Great work! Milestone "${milestoneInfo.name}" has been completed.`,
      details: {
        milestone: milestoneInfo.name,
        completedTasks: milestoneInfo.completedTasks,
        completionDate: new Date().toISOString(),
        nextMilestone: milestoneInfo.nextMilestone
      },
      recipients: this.getRecipientsForNotification('milestone_achieved')
    };

    this.sendNotification(notification);
  }

  /**
   * 发送质量门禁失败通知
   */
  notifyQualityGateFailure(failureInfo) {
    const notification = {
      type: NOTIFICATION_TYPES.QUALITY_GATE_FAILED,
      priority: PRIORITY_LEVELS.HIGH,
      title: `❌ Quality Gate Failed: ${failureInfo.level}`,
      message: `Quality gate check failed. Immediate attention required.`,
      details: {
        level: failureInfo.level,
        failedChecks: failureInfo.failedChecks,
        passedChecks: failureInfo.passedChecks,
        timestamp: new Date().toISOString()
      },
      recipients: this.getRecipientsForNotification('quality_gate_failed')
    };

    this.sendNotification(notification);
  }

  /**
   * 发送通知
   */
  sendNotification(notification) {
    this.notifications.push(notification);

    // 控制台输出
    if (this.subscribers.channels.console) {
      this.sendConsoleNotification(notification);
    }

    // 保存通知记录
    this.saveNotificationRecord(notification);

    // 这里可以集成其他通知渠道 (Slack, Email, etc.)
    // this.sendSlackNotification(notification);
    // this.sendEmailNotification(notification);
  }

  /**
   * 控制台通知
   */
  sendConsoleNotification(notification) {
    const priorityIcon = {
      [PRIORITY_LEVELS.LOW]: '💡',
      [PRIORITY_LEVELS.MEDIUM]: '📢',
      [PRIORITY_LEVELS.HIGH]: '⚠️',
      [PRIORITY_LEVELS.CRITICAL]: '🚨'
    };

    console.log('\n' + '='.repeat(60));
    console.log(`${priorityIcon[notification.priority]} ${notification.title}`);
    console.log('='.repeat(60));
    console.log(`Message: ${notification.message}`);
    console.log(`Priority: ${notification.priority.toUpperCase()}`);
    console.log(`Type: ${notification.type}`);
    console.log(`Recipients: ${notification.recipients.join(', ')}`);
    
    if (notification.details) {
      console.log('\nDetails:');
      Object.entries(notification.details).forEach(([key, value]) => {
        console.log(`  ${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
      });
    }
    
    console.log('='.repeat(60) + '\n');
  }

  /**
   * 保存通知记录
   */
  saveNotificationRecord(notification) {
    const notificationsDir = path.join(process.cwd(), 'docs', 'notifications');
    if (!fs.existsSync(notificationsDir)) {
      fs.mkdirSync(notificationsDir, { recursive: true });
    }

    const notificationFile = path.join(notificationsDir, `notification-${Date.now()}.json`);
    fs.writeFileSync(notificationFile, JSON.stringify(notification, null, 2));
  }

  /**
   * 获取状态变更优先级
   */
  getStatusChangePriority(oldStatus, newStatus) {
    if (newStatus === '[!]' || newStatus === '[R]') {
      return PRIORITY_LEVELS.HIGH;
    }
    if (newStatus === '[x]') {
      return PRIORITY_LEVELS.MEDIUM;
    }
    return PRIORITY_LEVELS.LOW;
  }

  /**
   * 获取协作优先级
   */
  getCollaborationPriority(urgency) {
    const priorityMap = {
      '紧急': PRIORITY_LEVELS.CRITICAL,
      '一般': PRIORITY_LEVELS.MEDIUM,
      '低优先级': PRIORITY_LEVELS.LOW
    };
    return priorityMap[urgency] || PRIORITY_LEVELS.MEDIUM;
  }

  /**
   * 获取通知接收者
   */
  getRecipientsForNotification(notificationType) {
    return this.subscribers.members
      .filter(member => 
        member.notifications.includes('all') || 
        member.notifications.includes(notificationType)
      )
      .map(member => member.name);
  }

  /**
   * 生成通知统计报告
   */
  generateNotificationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalNotifications: this.notifications.length,
      byType: {},
      byPriority: {},
      recentNotifications: this.notifications.slice(-10)
    };

    // 按类型统计
    Object.values(NOTIFICATION_TYPES).forEach(type => {
      report.byType[type] = this.notifications.filter(n => n.type === type).length;
    });

    // 按优先级统计
    Object.values(PRIORITY_LEVELS).forEach(priority => {
      report.byPriority[priority] = this.notifications.filter(n => n.priority === priority).length;
    });

    const reportFile = path.join(process.cwd(), 'docs', 'reports', `notification-report-${Date.now()}.json`);
    const reportDir = path.dirname(reportFile);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`📊 Notification report generated: ${reportFile}`);
    
    return report;
  }
}

// 命令行接口
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const notifier = new TeamNotifier();

  switch (command) {
    case 'task-status':
      notifier.notifyTaskStatusChange({
        taskName: args[1] || 'Sample Task',
        oldStatus: args[2] || '[-]',
        newStatus: args[3] || '[x]',
        assignee: args[4] || 'Developer'
      });
      break;

    case 'blocking-issue':
      notifier.notifyBlockingIssue({
        id: Date.now().toString(),
        title: args[1] || 'Sample Blocking Issue',
        description: args[2] || 'This is a sample blocking issue',
        severity: args[3] || 'high',
        affectedTasks: [args[4] || 'Task 1'],
        reporter: args[5] || 'System'
      });
      break;

    case 'collaboration':
      notifier.notifyCollaborationRequest({
        title: args[1] || 'Sample Collaboration',
        requester: args[2] || 'Developer',
        description: args[3] || 'Need help with implementation',
        type: args[4] || 'technical_support',
        urgency: args[5] || '一般',
        estimatedTime: args[6] || '2 hours'
      });
      break;

    case 'milestone':
      notifier.notifyMilestoneAchieved({
        name: args[1] || 'Sample Milestone',
        completedTasks: [args[2] || 'Task 1', args[3] || 'Task 2'],
        nextMilestone: args[4] || 'Next Milestone'
      });
      break;

    case 'quality-gate':
      notifier.notifyQualityGateFailure({
        level: args[1] || 'MVP',
        failedChecks: [args[2] || 'Coverage check'],
        passedChecks: [args[3] || 'Lint check']
      });
      break;

    case 'report':
      notifier.generateNotificationReport();
      break;

    default:
      console.log('Usage: node team-notification.js <command> [args...]');
      console.log('Commands:');
      console.log('  task-status <task> <oldStatus> <newStatus> <assignee>');
      console.log('  blocking-issue <title> <description> <severity> <task> <reporter>');
      console.log('  collaboration <title> <requester> <description> <type> <urgency> <time>');
      console.log('  milestone <name> <task1> <task2> <nextMilestone>');
      console.log('  quality-gate <level> <failedCheck> <passedCheck>');
      console.log('  report');
  }
}

module.exports = TeamNotifier;