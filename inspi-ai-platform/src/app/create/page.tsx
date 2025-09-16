'use client';

import React from 'react';
import { DesktopCreatePage } from '@/components/desktop/pages/DesktopCreatePage';
import { DesktopLayout } from '@/components/desktop';

/**
 * 创作页面 - 暂时只显示桌面端版本
 */
export default function CreatePage() {
  // 直接显示桌面端版本，不做响应式检测
  return (
    <DesktopLayout>
      <DesktopCreatePage />
    </DesktopLayout>
  );
}

/* 
// 移动端代码已注释，等桌面端调试完成后再启用
export default function CreatePage() {
  const { isMobile } = useResponsive();

  if (!isMobile) {
    return (
      <AppLayout>
        <DesktopCreatePage />
      </AppLayout>
    );
  }

  // 移动端创作界面...
  const [knowledge, setKnowledge] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // 大量移动端代码...
  
  return (
    <AppLayout>
      <MobilePageHeader title="AI魔法师" />
      // 移动端界面...
    </AppLayout>
  );
}
*/