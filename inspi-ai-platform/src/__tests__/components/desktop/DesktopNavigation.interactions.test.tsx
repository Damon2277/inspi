import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { DesktopNavigation } from '@/components/desktop/DesktopNavigation';

jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('DesktopNavigation login prompt', () => {
  it('opens login prompt when clicking login button', () => {
    render(<DesktopNavigation />);

    const loginButton = screen.getByRole('button', { name: '登录' });
    fireEvent.click(loginButton);

    expect(screen.getByRole('heading', { name: '登录账户' })).toBeInTheDocument();
  });
});
