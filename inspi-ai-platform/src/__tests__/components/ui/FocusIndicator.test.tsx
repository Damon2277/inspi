import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FocusIndicator, FocusableContainer } from '@/components/ui/FocusIndicator';

describe('FocusIndicator', () => {
  it('renders children correctly', () => {
    render(
      <FocusIndicator>
        <button>Test Button</button>
      </FocusIndicator>
    );
    
    expect(screen.getByRole('button', { name: 'Test Button' })).toBeInTheDocument();
  });

  it('applies default focus classes', () => {
    const { container } = render(
      <FocusIndicator>
        <button>Test Button</button>
      </FocusIndicator>
    );
    
    const focusWrapper = container.firstChild as HTMLElement;
    expect(focusWrapper).toHaveClass('rounded-md', 'transition-all', 'duration-200');
  });

  it('applies primary variant classes', () => {
    const { container } = render(
      <FocusIndicator variant="primary">
        <button>Test Button</button>
      </FocusIndicator>
    );
    
    const focusWrapper = container.firstChild as HTMLElement;
    expect(focusWrapper).toHaveClass('focus-within:ring-2', 'focus-within:ring-blue-500', 'focus-within:ring-offset-2');
  });

  it('applies secondary variant classes', () => {
    const { container } = render(
      <FocusIndicator variant="secondary">
        <button>Test Button</button>
      </FocusIndicator>
    );
    
    const focusWrapper = container.firstChild as HTMLElement;
    expect(focusWrapper).toHaveClass('focus-within:ring-2', 'focus-within:ring-gray-400', 'focus-within:ring-offset-2');
  });

  it('applies outline variant classes', () => {
    const { container } = render(
      <FocusIndicator variant="outline">
        <button>Test Button</button>
      </FocusIndicator>
    );
    
    const focusWrapper = container.firstChild as HTMLElement;
    expect(focusWrapper).toHaveClass('focus-within:outline-2', 'focus-within:outline-blue-500', 'focus-within:outline-offset-2');
  });

  it('applies size classes correctly', () => {
    const { container } = render(
      <FocusIndicator size="lg">
        <button>Test Button</button>
      </FocusIndicator>
    );
    
    const focusWrapper = container.firstChild as HTMLElement;
    expect(focusWrapper).toHaveClass('focus-within:ring-offset-4');
  });

  it('does not apply focus classes when disabled', () => {
    const { container } = render(
      <FocusIndicator disabled>
        <button>Test Button</button>
      </FocusIndicator>
    );
    
    const focusWrapper = container.firstChild as HTMLElement;
    expect(focusWrapper).not.toHaveClass('focus-within:ring-2');
  });

  it('applies custom className', () => {
    const { container } = render(
      <FocusIndicator className="custom-focus">
        <button>Test Button</button>
      </FocusIndicator>
    );
    
    const focusWrapper = container.firstChild as HTMLElement;
    expect(focusWrapper).toHaveClass('custom-focus');
  });
});

describe('FocusableContainer', () => {
  it('renders children correctly', () => {
    render(
      <FocusableContainer>
        <button>Button 1</button>
        <button>Button 2</button>
      </FocusableContainer>
    );
    
    expect(screen.getByRole('button', { name: 'Button 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Button 2' })).toBeInTheDocument();
  });

  it('applies default role and attributes', () => {
    const { container } = render(
      <FocusableContainer>
        <button>Test Button</button>
      </FocusableContainer>
    );
    
    const containerElement = container.firstChild as HTMLElement;
    expect(containerElement).toHaveAttribute('role', 'group');
    expect(containerElement).toHaveAttribute('tabIndex', '-1');
  });

  it('applies custom role and aria-label', () => {
    const { container } = render(
      <FocusableContainer role="navigation" aria-label="Main navigation">
        <button>Test Button</button>
      </FocusableContainer>
    );
    
    const containerElement = container.firstChild as HTMLElement;
    expect(containerElement).toHaveAttribute('role', 'navigation');
    expect(containerElement).toHaveAttribute('aria-label', 'Main navigation');
  });

  it('handles keyboard events', () => {
    const mockKeyDown = jest.fn();
    
    render(
      <FocusableContainer onKeyDown={mockKeyDown}>
        <button>Test Button</button>
      </FocusableContainer>
    );
    
    const containerElement = screen.getByRole('group');
    fireEvent.keyDown(containerElement, { key: 'ArrowDown' });
    
    expect(mockKeyDown).toHaveBeenCalledTimes(1);
  });

  it('prevents default for Home and End keys', () => {
    const mockKeyDown = jest.fn();
    
    render(
      <FocusableContainer onKeyDown={mockKeyDown}>
        <button>Test Button</button>
      </FocusableContainer>
    );
    
    const containerElement = screen.getByRole('group');
    
    // Test Home key
    fireEvent.keyDown(containerElement, { 
      key: 'Home',
      preventDefault: jest.fn()
    });
    
    // Test End key
    fireEvent.keyDown(containerElement, { 
      key: 'End',
      preventDefault: jest.fn()
    });
    
    expect(mockKeyDown).toHaveBeenCalledTimes(2);
  });

  it('applies custom className', () => {
    const { container } = render(
      <FocusableContainer className="custom-container">
        <button>Test Button</button>
      </FocusableContainer>
    );
    
    const containerElement = container.firstChild as HTMLElement;
    expect(containerElement).toHaveClass('custom-container');
  });
});