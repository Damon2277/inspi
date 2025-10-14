import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { LoginPrompt } from '@/components/auth/LoginPrompt';

jest.mock('@/components/auth/AuthProviders', () => ({
  AuthProviders: ({ children }: { children: React.ReactNode }) => <React.Fragment>{children}</React.Fragment>,
}));

jest.mock('@/shared/hooks/useAuth', () => ({
  useAuth: () => ({
    login: jest.fn().mockResolvedValue({ success: true }),
    isLoading: false,
  }),
}));

describe('LoginPrompt action elements', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    operation: 'create' as const,
  };

  it('shows all primary login actions', () => {
    render(<LoginPrompt {...defaultProps} />);

    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '使用 Google 登录' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '忘记密码？' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '立即注册' })).toBeInTheDocument();
  });
});
