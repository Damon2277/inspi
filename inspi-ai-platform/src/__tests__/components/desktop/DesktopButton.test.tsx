import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DesktopButton, DesktopButtonGroup } from '@/components/desktop/DesktopButton';

describe('DesktopButton', () => {
  it('renders with default props', () => {
    render(<DesktopButton>Click me</DesktopButton>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('desktop-button');
  });

  it('handles different variants', () => {
    const { rerender } = render(<DesktopButton variant="primary">Primary</DesktopButton>);
    expect(screen.getByRole('button')).toHaveClass('desktop-button-primary');

    rerender(<DesktopButton variant="secondary">Secondary</DesktopButton>);
    expect(screen.getByRole('button')).toHaveClass('desktop-button-secondary');

    rerender(<DesktopButton variant="outline">Outline</DesktopButton>);
    expect(screen.getByRole('button')).toHaveClass('desktop-button-outline');
  });

  it('handles different sizes', () => {
    const { rerender } = render(<DesktopButton size="sm">Small</DesktopButton>);
    expect(screen.getByRole('button')).toHaveClass('desktop-button-sm');

    rerender(<DesktopButton size="md">Medium</DesktopButton>);
    expect(screen.getByRole('button')).toHaveClass('desktop-button-md');

    rerender(<DesktopButton size="lg">Large</DesktopButton>);
    expect(screen.getByRole('button')).toHaveClass('desktop-button-lg');
  });

  it('handles loading state', () => {
    render(<DesktopButton loading>Loading</DesktopButton>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('handles disabled state', () => {
    render(<DesktopButton disabled>Disabled</DesktopButton>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('handles fullWidth prop', () => {
    render(<DesktopButton fullWidth>Full Width</DesktopButton>);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });

  it('calls onClick handler', () => {
    const handleClick = jest.fn();
    render(<DesktopButton onClick={handleClick}>Click me</DesktopButton>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = jest.fn();
    render(<DesktopButton onClick={handleClick} disabled>Disabled</DesktopButton>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not call onClick when loading', () => {
    const handleClick = jest.fn();
    render(<DesktopButton onClick={handleClick} loading>Loading</DesktopButton>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });
});

describe('DesktopButtonGroup', () => {
  it('renders button group correctly', () => {
    render(
      <DesktopButtonGroup>
        <DesktopButton>Button 1</DesktopButton>
        <DesktopButton>Button 2</DesktopButton>
        <DesktopButton>Button 3</DesktopButton>
      </DesktopButtonGroup>
    );

    const group = screen.getByRole('group');
    expect(group).toHaveClass('flex', 'space-x-3');
    
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('applies custom className', () => {
    render(
      <DesktopButtonGroup className="custom-class">
        <DesktopButton>Button</DesktopButton>
      </DesktopButtonGroup>
    );

    expect(screen.getByRole('group')).toHaveClass('custom-class');
  });
});