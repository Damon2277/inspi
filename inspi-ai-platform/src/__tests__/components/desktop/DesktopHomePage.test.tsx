import React from 'react';
import { render, screen } from '@testing-library/react';
import { DesktopHomePage } from '@/components/desktop/pages/DesktopHomePage';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

describe('DesktopHomePage', () => {
  it('renders the main heading', () => {
    render(<DesktopHomePage />);
    expect(screen.getByText(/欢迎来到/)).toBeInTheDocument();
    expect(screen.getAllByText(/Inspi.AI/)[0]).toBeInTheDocument();
  });

  it('renders the hero section', () => {
    render(<DesktopHomePage />);
    expect(screen.getByText(/用AI激发教学创意，让每一次教学都充满魔法/)).toBeInTheDocument();
  });

  it('renders feature cards', () => {
    render(<DesktopHomePage />);
    
    // Check for feature titles
    expect(screen.getByText('AI魔法师')).toBeInTheDocument();
    expect(screen.getByText('智慧广场')).toBeInTheDocument();
    expect(screen.getByText('我的作品')).toBeInTheDocument();
  });

  it('renders feature descriptions', () => {
    render(<DesktopHomePage />);
    
    expect(screen.getByText(/智能生成教学卡片，让知识点生动有趣/)).toBeInTheDocument();
    expect(screen.getByText(/发现优质教学资源，与同行交流分享/)).toBeInTheDocument();
    expect(screen.getByText(/管理个人作品，追踪教学效果/)).toBeInTheDocument();
  });

  it('renders statistics section', () => {
    render(<DesktopHomePage />);
    
    expect(screen.getByText('数据说话，效果显著')).toBeInTheDocument();
    expect(screen.getByText('教学卡片')).toBeInTheDocument();
    expect(screen.getByText('活跃教师')).toBeInTheDocument();
    expect(screen.getByText('学科覆盖')).toBeInTheDocument();
    expect(screen.getByText('学生受益')).toBeInTheDocument();
  });

  it('renders CTA section', () => {
    render(<DesktopHomePage />);
    
    expect(screen.getByText(/准备好开始你的AI教学之旅了吗？/)).toBeInTheDocument();
    expect(screen.getByText(/加入我们，让AI成为你最得力的教学助手/)).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    render(<DesktopHomePage />);
    
    expect(screen.getByText(/开始创作/)).toBeInTheDocument();
    expect(screen.getByText(/探索广场/)).toBeInTheDocument();
    expect(screen.getByText('立即注册')).toBeInTheDocument();
    expect(screen.getByText('了解更多')).toBeInTheDocument();
  });

  it('has correct navigation links', () => {
    render(<DesktopHomePage />);
    
    const createLink = screen.getByText(/开始创作/).closest('a');
    const squareLink = screen.getByText(/探索广场/).closest('a');
    
    expect(createLink).toHaveAttribute('href', '/create');
    expect(squareLink).toHaveAttribute('href', '/square');
  });

  it('renders with proper structure', () => {
    const { container } = render(<DesktopHomePage />);
    
    // Check for main sections
    const sections = container.querySelectorAll('section');
    expect(sections).toHaveLength(4); // Hero, Features, Stats, CTA
  });
});