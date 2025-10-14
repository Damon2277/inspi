import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { DesktopHomePage } from '@/components/desktop/pages/DesktopHomePage';

jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

describe('DesktopHomePage login prompts', () => {
  it('opens login prompt from hero create button', () => {
    render(<DesktopHomePage />);

    const createButton = screen.getByRole('button', { name: '立即开启创作' });
    fireEvent.click(createButton);

    expect(screen.getByRole('heading', { name: '登录账户' })).toBeInTheDocument();
  });

  it.each([
    '可视化卡',
    '类比延展卡',
    '启发思考卡',
    '互动氛围卡',
  ])('opens login prompt when selecting %s', (cardName) => {
    render(<DesktopHomePage />);

    const cardButton = screen.getByRole('button', { name: new RegExp(cardName) });
    fireEvent.click(cardButton);

    expect(screen.getByRole('heading', { name: '登录账户' })).toBeInTheDocument();
  });
});
