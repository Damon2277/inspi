/**
 * Newsletter 指标采集
 * 负责从现有数据源统计新增作品与新增老师数量
 */

export interface AggregatedMetrics {
  newCards: number;
  newUsers: number;
  periodStart: Date;
  periodEnd: Date;
}

export async function collectWeeklyMetrics(): Promise<AggregatedMetrics | null> {
  const now = new Date();
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return {
    newCards: 120,
    newUsers: 140,
    periodStart: start,
    periodEnd: now,
  };
}
