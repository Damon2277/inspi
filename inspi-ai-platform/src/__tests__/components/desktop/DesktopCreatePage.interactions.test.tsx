import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { DesktopCreatePage } from '@/components/desktop/pages/DesktopCreatePage';

const mockUseAuth = jest.fn();
const showPromptMock = jest.fn();

jest.mock('@/shared/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/components/auth/LoginPrompt', () => ({
  useLoginPrompt: () => ({
    showPrompt: showPromptMock,
    hidePrompt: jest.fn(),
    LoginPromptComponent: () => null,
    isOpen: false,
  }),
}));

const authMethods = {
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  refreshToken: jest.fn(),
  requestPasswordReset: jest.fn(),
  confirmPasswordReset: jest.fn(),
  changePassword: jest.fn(),
  verifyEmail: jest.fn(),
  resendVerificationEmail: jest.fn(),
  updateUser: jest.fn(),
  checkSession: jest.fn(),
};

describe('DesktopCreatePage interactions', () => {
  beforeEach(() => {
    showPromptMock.mockClear();
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: true,
      ...authMethods,
    });
  });

  it('applies template presets when clicking a recommended template', () => {
    render(<DesktopCreatePage />);

    const templateButton = screen.getByRole('button', { name: /数学概念模板/ });
    fireEvent.click(templateButton);

    const contentArea = screen.getByPlaceholderText('请表述你要教授的知识点，比如“光合作用”、“三角形”') as HTMLTextAreaElement;
    expect(contentArea.value).toContain('教学目标：帮助学生掌握二次函数的图像特征');

    const [subjectSelect, gradeSelect] = screen.getAllByRole('combobox') as HTMLSelectElement[];
    expect(subjectSelect.value).toBe('数学');
    expect(gradeSelect.value).toBe('初中');

    const visualCard = screen.getByRole('heading', { name: '可视化卡' }).closest('.modern-card');
    const thinkingCard = screen.getByRole('heading', { name: '启发思考卡' }).closest('.modern-card');

    expect(visualCard).toHaveStyle('border: 2px solid var(--primary-500)');
    expect(thinkingCard).toHaveStyle('border: 2px solid var(--primary-500)');
  });

  it('prompts login when unauthenticated users try to generate', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
      ...authMethods,
    });

    render(<DesktopCreatePage />);

    const templateButton = screen.getByRole('button', { name: /数学概念模板/ });
    fireEvent.click(templateButton);

    const generateButton = screen.getByRole('button', { name: /开启教学魔法/ });
    fireEvent.click(generateButton);

    expect(showPromptMock).toHaveBeenCalledWith('create', expect.stringContaining('登录'));
  });
});
