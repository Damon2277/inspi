import { render, screen } from '@testing-library/react';

import Home from '@/app/page';

describe('Home Page', () => {
  it('renders the main heading', () => {
    render(<Home />);

    expect(screen.getByText('别让备课的深夜，')).toBeInTheDocument();
    expect(screen.getByText('磨灭您教学的热情')).toBeInTheDocument();
  });

  it('renders the tagline', () => {
    render(<Home />);

    expect(screen.getByText(/Inspi\.AI，是您最懂教学的灵感搭档/)).toBeInTheDocument();
  });

  it('renders feature cards', () => {
    render(<Home />);

    expect(screen.getByText(/化抽象为.*看见/)).toBeInTheDocument();
    expect(screen.getByText(/用生活的温度.*点亮知识/)).toBeInTheDocument();
    expect(screen.getByText(/抛出一个好问题.*胜过一万句灌输/)).toBeInTheDocument();
    expect(screen.getByText(/让课堂.*破冰.*让知识.*升温/)).toBeInTheDocument();
  });

  it('renders call-to-action buttons', () => {
    render(<Home />);

    expect(screen.getByText('开始创作教学魔法')).toBeInTheDocument();
    expect(screen.getByText('浏览智慧广场')).toBeInTheDocument();
    expect(screen.getByText('免费开始使用')).toBeInTheDocument();
  });

  it('renders the final CTA section', () => {
    render(<Home />);

    expect(screen.getByText('您的每一次奇思妙想，都值得被精彩呈现')).toBeInTheDocument();
  });
});
