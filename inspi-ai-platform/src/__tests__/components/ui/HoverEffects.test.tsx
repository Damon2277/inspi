import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import '@testing-library/jest-dom';
import { HoverEffect, HoverCard, HoverButton } from '@/shared/components/HoverEffects';

// Mock CSS media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: query === '(hover: hover)',
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('HoverEffect', () => {
  it('renders children correctly', () => {
    render(
      <HoverEffect>
        <div>Test Content</div>
      </HoverEffect>,
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies correct CSS classes for lift effect', () => {
    const { container } = render(
      <HoverEffect effect="lift" intensity="medium">
        <div>Test Content</div>
      </HoverEffect>,
    );

    const hoverElement = container.firstChild as HTMLElement;
    expect(hoverElement).toHaveClass('transition-all', 'duration-300', 'ease-out');
  });

  it('applies correct CSS classes for scale effect', () => {
    const { container } = render(
      <HoverEffect effect="scale" intensity="subtle">
        <div>Test Content</div>
      </HoverEffect>,
    );

    const hoverElement = container.firstChild as HTMLElement;
    expect(hoverElement).toHaveClass('transition-all', 'duration-300', 'ease-out');
  });

  it('does not apply hover effects when disabled', () => {
    const { container } = render(
      <HoverEffect effect="lift" disabled>
        <div>Test Content</div>
      </HoverEffect>,
    );

    const hoverElement = container.firstChild as HTMLElement;
    expect(hoverElement.className).toBe('');
  });

  it('applies custom className', () => {
    const { container } = render(
      <HoverEffect className="custom-class">
        <div>Test Content</div>
      </HoverEffect>,
    );

    const hoverElement = container.firstChild as HTMLElement;
    expect(hoverElement).toHaveClass('custom-class');
  });
});

describe('HoverCard', () => {
  it('renders with default card styling', () => {
    const { container } = render(
      <HoverCard>
        <div>Card Content</div>
      </HoverCard>,
    );

    const cardElement = container.firstChild as HTMLElement;
    expect(cardElement).toHaveClass('rounded-lg', 'bg-white', 'border', 'border-gray-200');
  });

  it('applies custom className', () => {
    const { container } = render(
      <HoverCard className="custom-card">
        <div>Card Content</div>
      </HoverCard>,
    );

    const cardElement = container.firstChild as HTMLElement;
    expect(cardElement).toHaveClass('custom-card');
  });

  it('can be disabled', () => {
    const { container } = render(
      <HoverCard disabled>
        <div>Card Content</div>
      </HoverCard>,
    );

    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });
});

describe('HoverButton', () => {
  it('renders button with primary variant by default', () => {
    const { container } = render(
      <HoverButton>
        Click me
      </HoverButton>,
    );

    const buttonWrapper = container.firstChild as HTMLElement;
    expect(buttonWrapper).toHaveClass('bg-blue-600', 'text-white', 'border-blue-600');
  });

  it('renders button with secondary variant', () => {
    const { container } = render(
      <HoverButton variant="secondary">
        Click me
      </HoverButton>,
    );

    const buttonWrapper = container.firstChild as HTMLElement;
    expect(buttonWrapper).toHaveClass('bg-gray-100', 'text-gray-900', 'border-gray-300');
  });

  it('renders button with ghost variant', () => {
    const { container } = render(
      <HoverButton variant="ghost">
        Click me
      </HoverButton>,
    );

    const buttonWrapper = container.firstChild as HTMLElement;
    expect(buttonWrapper).toHaveClass('bg-transparent', 'text-gray-700', 'border-transparent');
  });

  it('applies correct size classes', () => {
    const { container } = render(
      <HoverButton size="lg">
        Large Button
      </HoverButton>,
    );

    const buttonWrapper = container.firstChild as HTMLElement;
    expect(buttonWrapper).toHaveClass('px-6', 'py-3', 'text-lg');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(
      <HoverButton onClick={handleClick}>
        Click me
      </HoverButton>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    const handleClick = jest.fn();
    render(
      <HoverButton onClick={handleClick} disabled>
        Disabled Button
      </HoverButton>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    const { container } = render(
      <HoverButton className="custom-button">
        Custom Button
      </HoverButton>,
    );

    const buttonWrapper = container.firstChild as HTMLElement;
    expect(buttonWrapper).toHaveClass('custom-button');
  });
});
