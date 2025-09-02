'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { GlassCard, Button } from '@/components/ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Design System Error:', error, errorInfo);
    
    // 发送错误到监控服务
    // sendErrorToService(error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="container section-padding">
          <GlassCard className="max-w-2xl mx-auto text-center">
            <h2 className="heading-2 mb-4">出现了一些问题</h2>
            <p className="body-text mb-6">
              页面遇到了技术问题，我们正在努力修复。请尝试刷新页面或返回首页。
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                variant="primary"
                onClick={() => window.location.reload()}
              >
                刷新页面
              </Button>
              <Button 
                variant="secondary"
                onClick={() => window.location.href = '/'}
              >
                返回首页
              </Button>
            </div>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}