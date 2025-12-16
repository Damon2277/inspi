/**
 * 用户个人资料组件测试
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { UserProfile } from '@/components/user/UserProfile';
import { createUserFixture, createWorkFixture } from '@/fixtures';

// Mock用户服务
const mockUserService = {
  updateProfile: jest.fn(),
  uploadAvatar: jest.fn(),
  getContributionHistory: jest.fn(),
  getUserWorks: jest.fn(),
};

jest.mock('@/lib/services/userService', () => mockUserService);

// Mock文件上传
const mockFileUpload = {
  uploadFile: jest.fn(),
};

jest.mock('@/lib/utils/fileUpload', () => mockFileUpload);

// Mock图表库
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}));

describe('UserProfile组件测试', () => {
  const mockUser = createUserFixture({
    id: 'user-1',
    name: '张老师',
    email: 'zhang@example.com',
    avatar: '/avatar.jpg',
    bio: '数学教学实践者，专注于函数教学',
    school: '北京市第一中学',
    subject: '数学',
    gradeLevel: '高中',
    subscription: 'pro',
    stats: {
      totalWorks: 25,
      totalViews: 12500,
      totalLikes: 890,
      totalReuses: 156,
      contributionScore: 2340,
      rank: 15,
    },
    joinedAt: new Date('2023-06-15'),
  });

  const mockWorks = [
    createWorkFixture({ id: 'work-1', title: '二次函数教学', stats: { views: 1200, likes: 89 } }),
    createWorkFixture({ id: 'work-2', title: '三角函数基础', stats: { views: 980, likes: 67 } }),
  ];

  const defaultProps = {
    user: mockUser,
    isOwnProfile: true,
    onProfileUpdate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserService.getUserWorks.mockResolvedValue(mockWorks);
    mockUserService.getContributionHistory.mockResolvedValue([
      { date: '2024-01-01', score: 50 },
      { date: '2024-01-02', score: 75 },
      { date: '2024-01-03', score: 60 },
    ]);
  });

  describe('基础渲染', () => {
    test('应该正确渲染用户基本信息', () => {
      render(<UserProfile {...defaultProps} />);

      expect(screen.getByTestId('user-profile')).toBeInTheDocument();
      expect(screen.getByText('张老师')).toBeInTheDocument();
      expect(screen.getByText('zhang@example.com')).toBeInTheDocument();
      expect(screen.getByText('数学教学实践者，专注于函数教学')).toBeInTheDocument();
      expect(screen.getByText('北京市第一中学')).toBeInTheDocument();
    });

    test('应该显示用户头像', () => {
      render(<UserProfile {...defaultProps} />);

      const avatar = screen.getByAltText('张老师的头像');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', '/avatar.jpg');
    });

    test('应该显示用户统计信息', () => {
      render(<UserProfile {...defaultProps} />);

      expect(screen.getByText('25')).toBeInTheDocument(); // 作品数
      expect(screen.getByText('12.5k')).toBeInTheDocument(); // 浏览量
      expect(screen.getByText('890')).toBeInTheDocument(); // 点赞数
      expect(screen.getByText('156')).toBeInTheDocument(); // 复用数
      expect(screen.getByText('2340')).toBeInTheDocument(); // 贡献分
      expect(screen.getByText('排名 #15')).toBeInTheDocument();
    });

    test('应该显示订阅状态', () => {
      render(<UserProfile {...defaultProps} />);

      expect(screen.getByText('Pro会员')).toBeInTheDocument();
      expect(screen.getByTestId('pro-badge')).toBeInTheDocument();
    });

    test('应该显示加入时间', () => {
      render(<UserProfile {...defaultProps} />);

      expect(screen.getByText('2023年6月加入')).toBeInTheDocument();
    });
  });

  describe('编辑模式', () => {
    test('应该在自己的资料页显示编辑按钮', () => {
      render(<UserProfile {...defaultProps} />);

      expect(screen.getByText('编辑资料')).toBeInTheDocument();
    });

    test('应该在他人资料页隐藏编辑按钮', () => {
      render(<UserProfile {...defaultProps} isOwnProfile={false} />);

      expect(screen.queryByText('编辑资料')).not.toBeInTheDocument();
    });

    test('应该打开编辑对话框', async () => {
      render(<UserProfile {...defaultProps} />);

      const editButton = screen.getByText('编辑资料');
      await userEvent.click(editButton);

      expect(screen.getByTestId('edit-profile-dialog')).toBeInTheDocument();
      expect(screen.getByDisplayValue('张老师')).toBeInTheDocument();
      expect(screen.getByDisplayValue('数学教学实践者，专注于函数教学')).toBeInTheDocument();
    });

    test('应该保存资料修改', async () => {
      mockUserService.updateProfile.mockResolvedValue({
        ...mockUser,
        name: '张教授',
        bio: '数学教授，专注于高等数学教学',
      });

      render(<UserProfile {...defaultProps} />);

      const editButton = screen.getByText('编辑资料');
      await userEvent.click(editButton);

      const nameInput = screen.getByDisplayValue('张老师');
      const bioInput = screen.getByDisplayValue('数学教学实践者，专注于函数教学');

      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, '张教授');

      await userEvent.clear(bioInput);
      await userEvent.type(bioInput, '数学教授，专注于高等数学教学');

      const saveButton = screen.getByText('保存');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUserService.updateProfile).toHaveBeenCalledWith('user-1', {
          name: '张教授',
          bio: '数学教授，专注于高等数学教学',
          school: '北京市第一中学',
          subject: '数学',
          gradeLevel: '高中',
        });
      });

      expect(defaultProps.onProfileUpdate).toHaveBeenCalled();
    });

    test('应该验证输入字段', async () => {
      render(<UserProfile {...defaultProps} />);

      const editButton = screen.getByText('编辑资料');
      await userEvent.click(editButton);

      const nameInput = screen.getByDisplayValue('张老师');
      await userEvent.clear(nameInput);

      const saveButton = screen.getByText('保存');
      await userEvent.click(saveButton);

      expect(screen.getByText('姓名不能为空')).toBeInTheDocument();
    });
  });

  describe('头像上传', () => {
    test('应该支持头像上传', async () => {
      const mockFile = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
      mockFileUpload.uploadFile.mockResolvedValue('/new-avatar.jpg');
      mockUserService.uploadAvatar.mockResolvedValue('/new-avatar.jpg');

      render(<UserProfile {...defaultProps} />);

      const editButton = screen.getByText('编辑资料');
      await userEvent.click(editButton);

      const fileInput = screen.getByLabelText('上传头像');
      await userEvent.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(mockFileUpload.uploadFile).toHaveBeenCalledWith(mockFile, 'avatars');
      });

      expect(mockUserService.uploadAvatar).toHaveBeenCalledWith('user-1', '/new-avatar.jpg');
    });

    test('应该验证头像文件格式', async () => {
      const invalidFile = new File(['text'], 'file.txt', { type: 'text/plain' });

      render(<UserProfile {...defaultProps} />);

      const editButton = screen.getByText('编辑资料');
      await userEvent.click(editButton);

      const fileInput = screen.getByLabelText('上传头像');
      await userEvent.upload(fileInput, invalidFile);

      expect(screen.getByText('请选择图片文件')).toBeInTheDocument();
    });

    test('应该验证头像文件大小', async () => {
      const largeFile = new File(['x'.repeat(5 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });

      render(<UserProfile {...defaultProps} />);

      const editButton = screen.getByText('编辑资料');
      await userEvent.click(editButton);

      const fileInput = screen.getByLabelText('上传头像');
      await userEvent.upload(fileInput, largeFile);

      expect(screen.getByText('文件大小不能超过2MB')).toBeInTheDocument();
    });
  });

  describe('作品展示', () => {
    test('应该显示用户作品列表', async () => {
      render(<UserProfile {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('二次函数教学')).toBeInTheDocument();
        expect(screen.getByText('三角函数基础')).toBeInTheDocument();
      });
    });

    test('应该支持作品筛选', async () => {
      render(<UserProfile {...defaultProps} />);

      const filterSelect = screen.getByLabelText('筛选作品');
      await userEvent.selectOptions(filterSelect, 'most-viewed');

      await waitFor(() => {
        expect(mockUserService.getUserWorks).toHaveBeenCalledWith('user-1', {
          sortBy: 'views',
          order: 'desc',
        });
      });
    });

    test('应该支持作品搜索', async () => {
      render(<UserProfile {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('搜索作品...');
      await userEvent.type(searchInput, '函数');

      await waitFor(() => {
        expect(mockUserService.getUserWorks).toHaveBeenCalledWith('user-1', {
          search: '函数',
        });
      });
    });

    test('应该显示作品统计', async () => {
      render(<UserProfile {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('共2个作品')).toBeInTheDocument();
      });
    });
  });

  describe('贡献度图表', () => {
    test('应该显示贡献度趋势图', async () => {
      render(<UserProfile {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    test('应该支持时间范围选择', async () => {
      render(<UserProfile {...defaultProps} />);

      const rangeSelect = screen.getByLabelText('时间范围');
      await userEvent.selectOptions(rangeSelect, '30days');

      await waitFor(() => {
        expect(mockUserService.getContributionHistory).toHaveBeenCalledWith('user-1', {
          range: '30days',
        });
      });
    });

    test('应该显示贡献度统计', async () => {
      render(<UserProfile {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('平均贡献度: 62')).toBeInTheDocument();
        expect(screen.getByText('最高贡献度: 75')).toBeInTheDocument();
      });
    });
  });

  describe('社交功能', () => {
    test('应该在他人资料页显示关注按钮', () => {
      render(<UserProfile {...defaultProps} isOwnProfile={false} />);

      expect(screen.getByText('关注')).toBeInTheDocument();
    });

    // 移除关注功能测试

    test('应该显示私信按钮', () => {
      render(<UserProfile {...defaultProps} isOwnProfile={false} />);

      expect(screen.getByText('私信')).toBeInTheDocument();
    });

    test('应该显示分享按钮', async () => {
      // Mock Web Share API
      const mockShare = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        configurable: true,
      });

      render(<UserProfile {...defaultProps} isOwnProfile={false} />);

      const shareButton = screen.getByText('分享');
      await userEvent.click(shareButton);

      expect(mockShare).toHaveBeenCalledWith({
        title: '张老师的个人资料',
        text: '数学教学实践者，专注于函数教学',
        url: expect.stringContaining('/users/user-1'),
      });
    });
  });

  describe('成就系统', () => {
    test('应该显示用户徽章', () => {
      const userWithBadges = {
        ...mockUser,
        badges: [
          { id: 'creator', name: '创作者', icon: '🎨', description: '发布了10个作品' },
          { id: 'popular', name: '人气王', icon: '🔥', description: '作品获得1000次浏览' },
        ],
      };

      render(<UserProfile {...defaultProps} user={userWithBadges} />);

      expect(screen.getByText('创作者')).toBeInTheDocument();
      expect(screen.getByText('人气王')).toBeInTheDocument();
      expect(screen.getByText('🎨')).toBeInTheDocument();
      expect(screen.getByText('🔥')).toBeInTheDocument();
    });

    test('应该显示成就进度', () => {
      const userWithProgress = {
        ...mockUser,
        achievements: [
          { id: 'works-50', name: '作品达人', progress: 25, target: 50, description: '发布50个作品' },
        ],
      };

      render(<UserProfile {...defaultProps} user={userWithProgress} />);

      expect(screen.getByText('作品达人')).toBeInTheDocument();
      expect(screen.getByText('25/50')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    });
  });

  describe('响应式设计', () => {
    test('应该在移动设备上调整布局', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375 });

      render(<UserProfile {...defaultProps} />);

      expect(screen.getByTestId('user-profile')).toHaveClass('mobile-layout');
    });

    test('应该在平板设备上调整布局', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768 });

      render(<UserProfile {...defaultProps} />);

      expect(screen.getByTestId('user-profile')).toHaveClass('tablet-layout');
    });
  });

  describe('无障碍性', () => {
    test('应该提供适当的ARIA标签', () => {
      render(<UserProfile {...defaultProps} />);

      expect(screen.getByRole('main')).toHaveAttribute('aria-label', '张老师的个人资料');
      expect(screen.getByRole('img')).toHaveAttribute('alt', '张老师的头像');
      expect(screen.getByRole('button', { name: '编辑资料' })).toBeInTheDocument();
    });

    test('应该支持键盘导航', async () => {
      render(<UserProfile {...defaultProps} />);

      // Tab键导航到编辑按钮
      await userEvent.tab();
      expect(screen.getByText('编辑资料')).toHaveFocus();

      // Enter键打开编辑对话框
      await userEvent.keyboard('{Enter}');
      expect(screen.getByTestId('edit-profile-dialog')).toBeInTheDocument();
    });

    test('应该提供屏幕阅读器支持', () => {
      render(<UserProfile {...defaultProps} />);

      expect(screen.getByText('贡献分2340分')).toHaveAttribute('aria-label', '贡献分数2340分');
      expect(screen.getByText('排名第15位')).toHaveAttribute('aria-label', '在排行榜中排名第15位');
    });
  });

  describe('性能优化', () => {
    test('应该懒加载作品列表', async () => {
      render(<UserProfile {...defaultProps} />);

      // 初始不应该加载作品
      expect(mockUserService.getUserWorks).not.toHaveBeenCalled();

      // 点击作品标签页
      const worksTab = screen.getByText('作品');
      await userEvent.click(worksTab);

      // 现在应该加载作品
      expect(mockUserService.getUserWorks).toHaveBeenCalled();
    });

    test('应该缓存用户数据', () => {
      const { rerender } = render(<UserProfile {...defaultProps} />);

      // 重新渲染相同用户
      rerender(<UserProfile {...defaultProps} />);

      // 不应该重新请求数据
      expect(mockUserService.getContributionHistory).toHaveBeenCalledTimes(1);
    });

    test('应该防抖处理搜索输入', async () => {
      jest.useFakeTimers();

      render(<UserProfile {...defaultProps} />);

      const worksTab = screen.getByText('作品');
      await userEvent.click(worksTab);

      const searchInput = screen.getByPlaceholderText('搜索作品...');

      // 快速输入
      await userEvent.type(searchInput, '函数');

      // 搜索应该被防抖
      expect(mockUserService.getUserWorks).toHaveBeenCalledTimes(1); // 初始加载

      // 等待防抖时间
      jest.advanceTimersByTime(500);

      await waitFor(() => {
        expect(mockUserService.getUserWorks).toHaveBeenCalledTimes(2); // 搜索调用
      });

      jest.useRealTimers();
    });
  });

  describe('错误处理', () => {
    test('应该处理资料更新失败', async () => {
      mockUserService.updateProfile.mockRejectedValue(new Error('更新失败'));

      render(<UserProfile {...defaultProps} />);

      const editButton = screen.getByText('编辑资料');
      await userEvent.click(editButton);

      const saveButton = screen.getByText('保存');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('更新失败，请重试')).toBeInTheDocument();
      });
    });

    test('应该处理头像上传失败', async () => {
      const mockFile = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
      mockFileUpload.uploadFile.mockRejectedValue(new Error('上传失败'));

      render(<UserProfile {...defaultProps} />);

      const editButton = screen.getByText('编辑资料');
      await userEvent.click(editButton);

      const fileInput = screen.getByLabelText('上传头像');
      await userEvent.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByText('头像上传失败')).toBeInTheDocument();
      });
    });

    test('应该处理数据加载失败', async () => {
      mockUserService.getUserWorks.mockRejectedValue(new Error('加载失败'));

      render(<UserProfile {...defaultProps} />);

      const worksTab = screen.getByText('作品');
      await userEvent.click(worksTab);

      await waitFor(() => {
        expect(screen.getByText('作品加载失败')).toBeInTheDocument();
        expect(screen.getByText('重试')).toBeInTheDocument();
      });
    });
  });
});
