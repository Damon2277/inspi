import { render, screen } from '@testing-library/react';

import { GlassCard } from '@/components/ui/GlassCard';

describe('GlassCard', () => {
  test('renders children correctly', () => {
    render(
      <GlassCard>
        <h3>Test Title</h3>
        <p>Test content</p>
      </GlassCard>,
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  test('applies correct CSS classes', () => {
    const { container } = render(
      <GlassCard className="custom-class">
        <p>Content</p>
      </GlassCard>,
    );

    const card = container.firstChild;
    expect(card).toHaveClass('glassmorphism-card');
    expect(card).toHaveClass('custom-class');
  });

  test('applies hover class by default', () => {
    const { container } = render(
      <GlassCard>
        <p>Content</p>
      </GlassCard>,
    );

    const card = container.firstChild;
    expect(card).toHaveClass('hover:transform');
  });

  test('does not apply hover class when hover is false', () => {
    const { container } = render(
      <GlassCard hover={false}>
        <p>Content</p>
      </GlassCard>,
    );

    const card = container.firstChild;
    expect(card).not.toHaveClass('hover:transform');
  });
});
