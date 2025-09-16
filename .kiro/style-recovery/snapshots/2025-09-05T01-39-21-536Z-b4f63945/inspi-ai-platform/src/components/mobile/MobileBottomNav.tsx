'use client';

import React from 'react';
import { Navigation } from '@/components/navigation/Navigation';

/**
 * 移动端底部导航组件
 * @deprecated 现在由统一的 Navigation 组件处理，保留此组件仅为向后兼容
 */
export function MobileBottomNav() {
  // 重定向到统一的Navigation组件
  return <Navigation />;
}