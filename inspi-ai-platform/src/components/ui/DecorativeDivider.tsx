import React from 'react';

interface DecorativeDividerProps {
  className?: string;
}

export const DecorativeDivider: React.FC<DecorativeDividerProps> = ({ 
  className = '' 
}) => {
  return <div className={`decorative-divider ${className}`} />;
};