'use client';

import React from 'react';
import { DesktopSquarePage } from '@/components/desktop/pages/DesktopSquarePage';
import { DesktopLayout } from '@/components/desktop';

/**
 * 广场页面 - 暂时只显示桌面端版本
 */
export default function SquarePage() {
  // 直接显示桌面端版本，不做响应式检测
  return (
    <DesktopLayout>
      <DesktopSquarePage />
    </DesktopLayout>
  );
}

/* 
// 移动端代码已注释，等桌面端调试完成后再启用
export default function SquarePage() {
  const { isMobile } = useResponsive();

  if (!isMobile) {
    return (
      <AppLayout>
        <DesktopSquarePage />
      </AppLayout>
    );
  }

  // 移动端广场界面...
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(false);

  // 大量移动端代码...
  
  return (
    <AppLayout>
      <MobilePageHeader title="智慧广场" />
      // 移动端界面...
    </AppLayout>
  );
}
*/