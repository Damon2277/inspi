/**
 * 内容安全验证演示页面
 */

import ContentSecurityDemo from '@/components/examples/ContentSecurityDemo';

export default function ContentSecurityPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ContentSecurityDemo />
    </div>
  );
}

export const metadata = {
  title: '内容安全验证演示 - Inspi AI Platform',
  description: '演示敏感词过滤、XSS防护和内容验证功能'
};