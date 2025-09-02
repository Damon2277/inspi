import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  test('renders with primary variant by default', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-primary');
    expect(button).toHaveTextContent('Click me');
  });

  test('renders with secondary variant', () => {
    render(<Button variant="secondary">Click me</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-secondary');
  });

  test('applies size classes correctly', () => {
    const { rerender } = render(<Button size="large">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-large');

    rerender(<Button size="small">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-small');
  });

  test('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('passes through additional props', () => {
    render(<Button disabled data-testid="test-button">Disabled</Button>);
    
    const button = screen.getByTestId('test-button');
    expect(button).toBeDisabled();
  });

  test('applies custom className', () => {
    render(<Button className="custom-class">Button</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
    expect(button).toHaveClass('btn-primary'); // Should still have base class
  });
});