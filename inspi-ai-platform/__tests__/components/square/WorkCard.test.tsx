import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkCard from '@/components/square/WorkCard';
import { WorkCardData } from '@/types/square';

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />;
  };
});

const mockWork: WorkCardData = {
  id: '1',
  title: '数学加法教学',
  knowledgePoint: '两位数加法',
  subject: '数学',
  gradeLevel: '小学二年级',
  author: {
    id: 'user1',
    name: '张老师',
    avatar: null
  },
  reuseCount: 5,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  tags: ['数学', '加法', '小学'],
  cardCount: 4,
  cardTypes: ['visualization', 'analogy', 'thinking', 'interaction']
};

describe('WorkCard', () => {
  it('renders work information correctly', () => {
    render(<WorkCard work={mockWork} />);
    
    expect(screen.getByText('数学加法教学')).toBeInTheDocument();
    expect(screen.getByText('知识点：两位数加法')).toBeInTheDocument();
    expect(screen.getByText('数学')).toBeInTheDocument();
    expect(screen.getByText('张老师')).toBeInTheDocument();
    expect(screen.getByText('小学二年级')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('displays tags correctly', () => {
    render(<WorkCard work={mockWork} />);
    
    expect(screen.getByText('#数学')).toBeInTheDocument();
    expect(screen.getByText('#加法')).toBeInTheDocument();
    expect(screen.getByText('#小学')).toBeInTheDocument();
  });

  it('shows card type icons', () => {
    render(<WorkCard work={mockWork} />);
    
    // Check if card types are displayed (emojis)
    const cardTypeContainer = screen.getByText('包含卡片：').parentElement;
    expect(cardTypeContainer).toBeInTheDocument();
  });

  it('calls onReuse when reuse button is clicked', () => {
    const mockOnReuse = jest.fn();
    render(<WorkCard work={mockWork} onReuse={mockOnReuse} />);
    
    const reuseButton = screen.getByText('复用');
    fireEvent.click(reuseButton);
    
    expect(mockOnReuse).toHaveBeenCalledWith('1');
  });

  it('calls onView when card is clicked', () => {
    const mockOnView = jest.fn();
    render(<WorkCard work={mockWork} onView={mockOnView} />);
    
    const card = screen.getByText('数学加法教学').closest('div');
    fireEvent.click(card!);
    
    expect(mockOnView).toHaveBeenCalledWith('1');
  });

  it('prevents event propagation when reuse button is clicked', () => {
    const mockOnView = jest.fn();
    const mockOnReuse = jest.fn();
    render(<WorkCard work={mockWork} onView={mockOnView} onReuse={mockOnReuse} />);
    
    const reuseButton = screen.getByText('复用');
    fireEvent.click(reuseButton);
    
    expect(mockOnReuse).toHaveBeenCalledWith('1');
    expect(mockOnView).not.toHaveBeenCalled();
  });

  it('handles work with many tags correctly', () => {
    const workWithManyTags = {
      ...mockWork,
      tags: ['数学', '加法', '小学', '教学', '创意', '互动']
    };
    
    render(<WorkCard work={workWithManyTags} />);
    
    // Should show first 3 tags and "+3" indicator
    expect(screen.getByText('#数学')).toBeInTheDocument();
    expect(screen.getByText('#加法')).toBeInTheDocument();
    expect(screen.getByText('#小学')).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
  });

  it('displays author avatar when provided', () => {
    const workWithAvatar = {
      ...mockWork,
      author: {
        ...mockWork.author,
        avatar: 'https://example.com/avatar.jpg'
      }
    };
    
    render(<WorkCard work={workWithAvatar} />);
    
    const avatar = screen.getByAltText('张老师');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('shows author initial when no avatar provided', () => {
    render(<WorkCard work={mockWork} />);
    
    expect(screen.getByText('张')).toBeInTheDocument();
  });
});