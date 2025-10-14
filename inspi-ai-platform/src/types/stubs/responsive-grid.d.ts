declare module '@/shared/components/ResponsiveGrid' {
  import type { ComponentType, ReactNode } from 'react';

  export interface ResponsiveContainerProps {
    children?: ReactNode;
    className?: string;
  }

  export const ResponsiveContainer: ComponentType<ResponsiveContainerProps>;
}
