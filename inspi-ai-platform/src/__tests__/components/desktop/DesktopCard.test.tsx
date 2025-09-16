import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { 
  DesktopCard, 
  DesktopCardHeader, 
  DesktopCardTitle, 
  DesktopCardContent, 
  DesktopCardFooter 
} from '@/components/desktop/DesktopCard';

describe('DesktopCard', () => {
  it('renders with default props', () => {
    render(<DesktopCard>Card content</DesktopCard>);
    const card = screen.getByText('Card content');
    expect(card).toHaveClass('desktop-card');
  });

  it('handles different variants', () => {
    const { rerender } = render(<DesktopCard variant="default">Default</DesktopCard>);
    expect(screen.getByText('Default')).toHaveClass('desktop-card');

    rerender(<DesktopCard variant="elevated">Elevated</DesktopCard>);
    expect(screen.getByText('Elevated')).toHaveClass('desktop-card-elevated');

    rerender(<DesktopCard variant="outlined">Outlined</DesktopCard>);
    expect(screen.getByText('Outlined')).toHaveClass('desktop-card-outlined');
  });

  it('handles different sizes', () => {
    const { rerender } = render(<DesktopCard size="sm">Small</DesktopCard>);
    expect(screen.getByText('Small')).toHaveClass('desktop-card-sm');

    rerender(<DesktopCard size="md">Medium</DesktopCard>);
    expect(screen.getByText('Medium')).toHaveClass('desktop-card-md');

    rerender(<DesktopCard size="lg">Large</DesktopCard>);
    expect(screen.getByText('Large')).toHaveClass('desktop-card-lg');
  });

  it('handles hover prop', () => {
    render(<DesktopCard hover>Hover card</DesktopCard>);
    expect(screen.getByText('Hover card')).toHaveClass('hover:shadow-md', 'hover:-translate-y-1');
  });

  it('handles onClick', () => {
    const handleClick = jest.fn();
    render(<DesktopCard onClick={handleClick}>Clickable card</DesktopCard>);
    
    fireEvent.click(screen.getByText('Clickable card'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    render(<DesktopCard className="custom-class">Custom</DesktopCard>);
    expect(screen.getByText('Custom')).toHaveClass('custom-class');
  });
});

describe('DesktopCardHeader', () => {
  it('renders correctly', () => {
    render(<DesktopCardHeader>Header content</DesktopCardHeader>);
    const header = screen.getByText('Header content');
    expect(header).toHaveClass('border-b', 'border-gray-200', 'pb-4', 'mb-4');
  });

  it('applies custom className', () => {
    render(<DesktopCardHeader className="custom-header">Header</DesktopCardHeader>);
    expect(screen.getByText('Header')).toHaveClass('custom-header');
  });
});

describe('DesktopCardTitle', () => {
  it('renders correctly', () => {
    render(<DesktopCardTitle>Card Title</DesktopCardTitle>);
    const title = screen.getByText('Card Title');
    expect(title).toHaveClass('text-lg', 'font-semibold', 'text-gray-900');
  });

  it('applies custom className', () => {
    render(<DesktopCardTitle className="custom-title">Title</DesktopCardTitle>);
    expect(screen.getByText('Title')).toHaveClass('custom-title');
  });
});

describe('DesktopCardContent', () => {
  it('renders correctly', () => {
    render(<DesktopCardContent>Card content</DesktopCardContent>);
    const content = screen.getByText('Card content');
    expect(content).toHaveClass('text-gray-600');
  });

  it('applies custom className', () => {
    render(<DesktopCardContent className="custom-content">Content</DesktopCardContent>);
    expect(screen.getByText('Content')).toHaveClass('custom-content');
  });
});

describe('DesktopCardFooter', () => {
  it('renders correctly', () => {
    render(<DesktopCardFooter>Footer content</DesktopCardFooter>);
    const footer = screen.getByText('Footer content');
    expect(footer).toHaveClass('border-t', 'border-gray-200', 'pt-4', 'mt-4');
  });

  it('applies custom className', () => {
    render(<DesktopCardFooter className="custom-footer">Footer</DesktopCardFooter>);
    expect(screen.getByText('Footer')).toHaveClass('custom-footer');
  });
});

describe('DesktopCard composition', () => {
  it('renders complete card structure', () => {
    render(
      <DesktopCard>
        <DesktopCardHeader>
          <DesktopCardTitle>Test Card</DesktopCardTitle>
        </DesktopCardHeader>
        <DesktopCardContent>
          This is the card content
        </DesktopCardContent>
        <DesktopCardFooter>
          Footer actions
        </DesktopCardFooter>
      </DesktopCard>
    );

    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('This is the card content')).toBeInTheDocument();
    expect(screen.getByText('Footer actions')).toBeInTheDocument();
  });
});