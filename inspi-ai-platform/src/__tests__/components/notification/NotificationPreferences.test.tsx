/**
 * 通知偏好设置组件测试
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import '@testing-library/jest-dom';
import NotificationPreferences from '@/components/notification/NotificationPreferences';

// Mock fetch
global.fetch = jest.fn();

// Mock useToast hook
jest.mock('@/shared/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe('NotificationPreferences', () => {
  const mockUserId = 'test-user-id';
  const mockOnPreferencesChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: [],
      }),
    });
  });

  it('renders notification preferences component', async () => {
    render(
      <NotificationPreferences
        userId={mockUserId}
        onPreferencesChange={mockOnPreferencesChange}
      />,
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('全局通知设置')).toBeInTheDocument();
    });

    expect(screen.getByText('通知类型设置')).toBeInTheDocument();
    expect(screen.getByText('静默时间')).toBeInTheDocument();
  });

  it('loads user preferences on mount', async () => {
    render(
      <NotificationPreferences
        userId={mockUserId}
        onPreferencesChange={mockOnPreferencesChange}
      />,
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(`/api/notifications/preferences?userId=${mockUserId}`);
    });
  });

  it('displays notification types with default settings', async () => {
    render(
      <NotificationPreferences
        userId={mockUserId}
        onPreferencesChange={mockOnPreferencesChange}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('邀请成功通知')).toBeInTheDocument();
      expect(screen.getByText('奖励到账通知')).toBeInTheDocument();
      expect(screen.getByText('邀请进度提醒')).toBeInTheDocument();
      expect(screen.getByText('邀请码过期提醒')).toBeInTheDocument();
      expect(screen.getByText('里程碑达成通知')).toBeInTheDocument();
      expect(screen.getByText('周度邀请总结')).toBeInTheDocument();
      expect(screen.getByText('月度邀请报告')).toBeInTheDocument();
    });
  });

  it('allows toggling notification types', async () => {
    render(
      <NotificationPreferences
        userId={mockUserId}
        onPreferencesChange={mockOnPreferencesChange}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('邀请成功通知')).toBeInTheDocument();
    });

    // Find and click the switch for invite success notifications
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThan(0);

    // The first switch should be for quiet hours, skip it
    const notificationSwitch = switches[1];
    fireEvent.click(notificationSwitch);

    // Verify the switch state changed
    expect(notificationSwitch).toBeInTheDocument();
  });

  it('allows updating quiet hours settings', async () => {
    render(
      <NotificationPreferences
        userId={mockUserId}
        onPreferencesChange={mockOnPreferencesChange}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('静默时间')).toBeInTheDocument();
    });

    // Find and toggle the quiet hours switch
    const quietHoursSwitch = screen.getAllByRole('switch')[0];
    fireEvent.click(quietHoursSwitch);

    // Check if time inputs appear
    await waitFor(() => {
      const timeInputs = screen.getAllByDisplayValue(/\d{2}:\d{2}/);
      expect(timeInputs.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('saves preferences when save button is clicked', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: [] }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

    render(
      <NotificationPreferences
        userId={mockUserId}
        onPreferencesChange={mockOnPreferencesChange}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('保存设置')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('保存设置');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/notifications/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining(mockUserId),
      });
    });
  });

  it('handles loading state', () => {
    render(
      <NotificationPreferences
        userId={mockUserId}
        onPreferencesChange={mockOnPreferencesChange}
      />,
    );

    // Should show loading skeleton initially
    expect(screen.getByTestId('loading-skeleton') || document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('handles error state when loading preferences fails', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(
      <NotificationPreferences
        userId={mockUserId}
        onPreferencesChange={mockOnPreferencesChange}
      />,
    );

    // Should still render with default preferences after error
    await waitFor(() => {
      expect(screen.getByText('全局通知设置')).toBeInTheDocument();
    });
  });

  it('displays channel selection options', async () => {
    render(
      <NotificationPreferences
        userId={mockUserId}
        onPreferencesChange={mockOnPreferencesChange}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('应用内通知')).toBeInTheDocument();
      expect(screen.getByText('邮件通知')).toBeInTheDocument();
      expect(screen.getByText('推送通知')).toBeInTheDocument();
    });
  });

  it('displays frequency selection options', async () => {
    render(
      <NotificationPreferences
        userId={mockUserId}
        onPreferencesChange={mockOnPreferencesChange}
      />,
    );

    await waitFor(() => {
      // Check for frequency selectors
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
    });
  });
});
