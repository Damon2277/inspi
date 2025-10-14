/**
 * 热门作品组件 - 从共享组件导入
 */

'use client';

import { TrendingWorks } from '@/shared/components/TrendingWorks';

// 导出共享组件，默认使用contribution API端点
export function ContributionTrendingWorks(props: React.ComponentProps<typeof TrendingWorks>) {
  return (
    <TrendingWorks
      apiEndpoint="/api/contribution/trending"
      showViewButton={true}
      cardStyle="detailed"
      {...props}
    />
  );
}

export default ContributionTrendingWorks;
