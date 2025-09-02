import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'default' | 'large';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'default',
  children,
  className = '',
  ...props
}) => {
  const baseClass = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
  const sizeClass = size === 'large' ? 'btn-large' : size === 'small' ? 'btn-small' : '';
  
  return (
    <button 
      className={`${baseClass} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};