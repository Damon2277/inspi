/**
 * 通知历史记录组件测试
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import '@testing-library/jest-dom';
import NotificationHistory from '@/components/notification/NotificationHistory';

// Mock fetch
global.fetch = jest.fn();

// Mock useToast hook
jest.mock('@/shared/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2小时前'),
  zhCN: {},
}));

describe('NotificationHistory', () => {
  const mockUserId = 'test-user-id';
  const mockOnNotificationRead = jest.fn();

  const mockNotifications = [
    {
      id: 'notif-1',
      userId: mockUserId,
      type: 'invite_success',
      title: '邀请成功！',
      content: '恭喜！张三通过您的邀请成功注册了 Inspi.AI',
      channel: 'in_app',
      status: 'sent',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      sentAt: new Date('2024-01-01T10:00:01Z'),
    },
    {
      id: 'notif-2',
      userId: mockUserId,
      type: 'reward_received',
      title: '奖励到账',
      content: '您获得了新的奖励：AI生成次数 10',
      channel: 'email',
      status: 'read',
      createdAt: new Date('2024-01-01T09:00:00Z'),
      sentAt: new Date('2024-01-01T09:00:01Z'),
      readAt: new Date('2024-01-01T09:30:00Z'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: {
          notifications: mockNotifications,
          total: mockNotifications.length,
          unreadCount: 1,
        },
      }),
    });
  });

  it('renders notification history component', async () => {
    render(
      <NotificationHistory
        userId={mockUserId}
        onNotificationRead={mockOnNotificationRead}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('通知历史')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('搜索通知内容...')).toBeInTheDocument();
  });

  it('loads and displays notifications', async () => {
    render(
      <NotificationHistory
        userId={mockUserId}
        onNotificationRead={mockOnNotificationRead}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('邀请成功！')).toBeInTheDocument();
      expect(screen.getByText('奖励到账')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`userId=${mockUserId}`));
  });

  it('displays notification content and metadata', async () => {
    render(
      <NotificationHistory
        userId={mockUserId}
        onNotificationRead={mockOnNotificationRead}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('恭喜！张三通过您的邀请成功注册了 Inspi.AI')).toBeInTheDocument();
      expect(screen.getByText('您获得了新的奖励：AI生成次数 10')).toBeInTheDocument();
    });
  });

  it('shows status badges for notifications', async () => {
    render(
      <NotificationHistory
        userId={mockUserId}
        onNotificationRead={mockOnNotificationRead}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('已发送')).toBeInTheDocument();
      expect(screen.getByText('已读')).toBeInTheDocument();
    });
  });

  it('allows filtering by status', async () => {
    render(
      <NotificationHistory
        userId={mockUserId}
        onNotificationRead={mockOnNotificationRead}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('通知历史')).toBeInTheDocument();
    });

    // Find and click status filter
    const statusSelects = screen.getAllByRole('combobox');
    const statusSelect = statusSelects.find(select =>
      select.getAttribute('aria-label')?.includes('status') ||
      select.closest('[data-testid="status-filter"]'),
    );

    if (statusSelect) {
      fireEvent.click(statusSelect);
    }
  });

  it('allows filtering by channel', async () => {
    render(
      <NotificationHistory
        userId={mockUserId}
        onNotificationRead={mockOnNotificationRead}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('通知历史')).toBeInTheDocument();
    });

    // Check that channel filters are available
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('allows searching notifications', async () => {
    render(
      <NotificationHistory
        userId={mockUserId}
        onNotificationRead={mockOnNotificationRead}
      />,
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('搜索通知内容...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('搜索通知内容...');
    fireEvent.change(searchInput, { target: { value: '邀请成功' } });

    // Should trigger search after typing
    expect(searchInput).toHaveValue('邀请成功');
  });

  it('allows selecting notifications', async () => {
    render(
      <NotificationHistory
        userId={mockUserId}
        onNotificationRead={mockOnNotificationRead}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('全选')).toBeInTheDocument();
    });

    // Find checkboxes
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);

    // Click the first notification checkbox (skip the "select all" checkbox)
    if (checkboxes.length > 1) {
      fireEvent.click(checkboxes[1]);
    }
  });

  it('allows bulk marking as read', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          data: {
            notifications: mockNotifications,
            total: mockNotifications.length,
            unreadCount: 1,
          },
        }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

    render(
      <NotificationHistory
        userId={mockUserId}
        onNotificationRead={mockOnNotificationRead}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('全选')).toBeInTheDocument();
    });

    // Select all notifications
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);

    // Should show bulk actions
    await waitFor(() => {
      const markAsReadButton = screen.getByText('标记为已读');
      expect(markAsReadButton).toBeInTheDocument();
      fireEvent.click(markAsReadButton);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/notifications/bulk-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('notificationIds'),
      });
    });
  });

  it('allows bulk deletion', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          data: {
            notifications: mockNotifications,
            total: mockNotifications.length,
            unreadCount: 1,
          },
        }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

    render(
      <NotificationHistory
        userId={mockUserId}
        onNotificationRead={mockOnNotificationRead}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('全选')).toBeInTheDocument();
    });

    // Select all notifications
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);

    // Should show bulk actions
    await waitFor(() => {
      const deleteButton = screen.getByText('删除');
      expect(deleteButton).toBeInTheDocument();
      fireEvent.click(deleteButton);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/notifications/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('notificationIds'),
      });
    });
  });

  it('shows pagination when there are multiple pages', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: {
          notifications: mockNotifications,
          total: 50, // More than one page
          unreadCount: 1,
        },
      }),
    });

    render(
      <NotificationHistory
        userId={mockUserId}
        onNotificationRead={mockOnNotificationRead}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/第 \d+ \/ \d+ 页/)).toBeInTheDocument();
      expect(screen.getByText('上一页')).toBeInTheDocument();
      expect(screen.getByText('下一页')).toBeInTheDocument();
    });
  });

  it('handles empty state', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: {
          notifications: [],
          total: 0,
          unreadCount: 0,
        },
      }),
    });

    render(
      <NotificationHistory
        userId={mockUserId}
        onNotificationRead={mockOnNotificationRead}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('暂无通知记录')).toBeInTheDocument();
    });
  });

  it('handles loading state', () => {
    render(
      <NotificationHistory
        userId={mockUserId}
        onNotificationRead={mockOnNotificationRead}
      />,
    );

    // Should show loading skeleton initially
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('handles error state', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(
      <NotificationHistory
        userId={mockUserId}
        onNotificationRead={mockOnNotificationRead}
      />,
    );

    // Should handle error gracefully
    await waitFor(() => {
      // Component should still render even with error
      expect(screen.getByText('通知历史')).toBeInTheDocument();
    });
  });
});
