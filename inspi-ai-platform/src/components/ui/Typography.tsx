import React from 'react';

interface TypographyProps {
  variant: 'h1' | 'h2' | 'h3' | 'body' | 'subtitle';
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
}

export const Typography: React.FC<TypographyProps> = ({
  variant,
  children,
  className = '',
  gradient = false
}) => {
  const baseClass = {
    h1: 'heading-1',
    h2: 'heading-2', 
    h3: 'heading-3',
    body: 'body-text',
    subtitle: 'subtitle'
  }[variant];

  const gradientClass = gradient ? 'gradient-text' : '';
  const Tag = variant === 'body' || variant === 'subtitle' ? 'p' : variant;

  return (
    <Tag className={`${baseClass} ${gradientClass} ${className}`}>
      {children}
    </Tag>
  );
};