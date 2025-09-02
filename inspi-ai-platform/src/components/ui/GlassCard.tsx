import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  hover = true 
}) => {
  return (
    <div className={`glassmorphism-card ${hover ? 'hover:transform hover:-translate-y-1' : ''} ${className}`}>
      <div className="card-content">
        {children}
      </div>
    </div>
  );
};