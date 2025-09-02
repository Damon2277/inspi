import React from 'react';

interface IconContainerProps {
  children: React.ReactNode;
  size?: 'small' | 'default' | 'large';
  className?: string;
}

export const IconContainer: React.FC<IconContainerProps> = ({
  children,
  size = 'default',
  className = ''
}) => {
  const sizeClass = size === 'small' ? 'icon-container-small' : 
                   size === 'large' ? 'icon-container-large' : '';
  
  return (
    <div className={`icon-container ${sizeClass} ${className}`}>
      {children}
    </div>
  );
};