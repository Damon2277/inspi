'use client';

import React, { useState, useEffect, useRef } from 'react';

interface PerformanceMetrics {
  fps: number;
  memory: number;
  renderTime: number;
  componentCount: number;
}

export function PerformanceMonitor({ show = false }: { show?: boolean }) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memory: 0,
    renderTime: 0,
    componentCount: 0,
  });

  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const animationId = useRef<number>();

  useEffect(() => {
    if (!show) return;

    const measureFPS = () => {
      frameCount.current++;
      const currentTime = performance.now();

      if (currentTime >= lastTime.current + 1000) {
        const fps = Math.round((frameCount.current * 1000) / (currentTime - lastTime.current));

        // 获取内存使用情况（如果浏览器支持）
        const memory = (performance as any).memory
          ? Math.round((performance as any).memory.usedJSHeapSize / 1048576)
          : 0;

        // 计算React组件数量
        const componentCount = document.querySelectorAll('[data-react-component]').length;

        setMetrics(prev => ({
          ...prev,
          fps,
          memory,
          componentCount,
        }));

        frameCount.current = 0;
        lastTime.current = currentTime;
      }

      animationId.current = requestAnimationFrame(measureFPS);
    };

    animationId.current = requestAnimationFrame(measureFPS);

    return () => {
      if (animationId.current) {
        cancelAnimationFrame(animationId.current);
      }
    };
  }, [show]);

  if (!show) return null;

  const getFPSColor = (fps: number) => {
    if (fps >= 50) return '#10b981';
    if (fps >= 30) return '#f59e0b';
    return '#ef4444';
  };

  const getMemoryColor = (memory: number) => {
    if (memory <= 50) return '#10b981';
    if (memory <= 100) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '8px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 10000,
        minWidth: '200px',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div style={{ marginBottom: '8px', fontWeight: 'bold', borderBottom: '1px solid #444', paddingBottom: '8px' }}>
        性能监控
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>FPS:</span>
          <span style={{ color: getFPSColor(metrics.fps), fontWeight: 'bold' }}>
            {metrics.fps}
          </span>
        </div>

        {metrics.memory > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>内存:</span>
            <span style={{ color: getMemoryColor(metrics.memory), fontWeight: 'bold' }}>
              {metrics.memory} MB
            </span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>组件数:</span>
          <span style={{ fontWeight: 'bold' }}>
            {metrics.componentCount}
          </span>
        </div>
      </div>

      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #444' }}>
        <div
          style={{
            height: '4px',
            background: '#333',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${(metrics.fps / 60) * 100}%`,
              background: getFPSColor(metrics.fps),
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
}
