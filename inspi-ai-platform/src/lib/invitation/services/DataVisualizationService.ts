/**
 * 数据可视化服务
 * 提供各种图表数据的生成和配置
 */

import { DatabaseService } from '../database';
import { TimePeriod, SharePlatform } from '../types';

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'radar'
  title: string
  subtitle?: string
  data: ChartDataset
  options?: ChartOptions
}

export interface ChartDataset {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    backgroundColor?: string | string[]
    borderColor?: string | string[]
    borderWidth?: number
    fill?: boolean
    tension?: number
  }>
}

export interface ChartOptions {
  responsive?: boolean
  maintainAspectRatio?: boolean
  plugins?: {
    legend?: {
      display?: boolean
      position?: 'top' | 'bottom' | 'left' | 'right'
    }
    tooltip?: {
      enabled?: boolean
      mode?: 'index' | 'dataset' | 'point' | 'nearest'
    }
  }
  scales?: {
    x?: {
      display?: boolean
      title?: {
        display?: boolean
        text?: string
      }
    }
    y?: {
      display?: boolean
      beginAtZero?: boolean
      title?: {
        display?: boolean
        text?: string
      }
    }
  }
}

export interface DataVisualizationService {
  // 生成邀请趋势图
  generateInviteTrendChart(period: TimePeriod, granularity?: 'day' | 'week' | 'month'): Promise<ChartConfig>

  // 生成转化漏斗图
  generateConversionFunnelChart(period: TimePeriod): Promise<ChartConfig>

  // 生成平台分布饼图
  generatePlatformDistributionChart(period: TimePeriod): Promise<ChartConfig>

  // 生成排行榜柱状图
  generateLeaderboardChart(period: TimePeriod, limit?: number): Promise<ChartConfig>

  // 生成用户活跃度热力图数据
  generateUserActivityHeatmap(period: TimePeriod): Promise<{
    data: Array<{ x: string; y: string; value: number }>
    config: any
  }>

  // 生成转化率对比图
  generateConversionComparisonChart(periods: TimePeriod[]): Promise<ChartConfig>

  // 生成实时数据仪表盘
  generateRealTimeDashboard(): Promise<{
    metrics: Array<{
      title: string
      value: number
      change: number
      trend: 'up' | 'down' | 'stable'
      format: 'number' | 'percentage' | 'currency'
    }>
    charts: ChartConfig[]
  }>

  // 生成地理分布图数据
  generateGeographicDistribution(period: TimePeriod): Promise<{
    type: 'map'
    data: Array<{
      region: string
      value: number
      coordinates?: [number, number]
    }>
  }>

  // 获取图表颜色主题
  getChartColorThemes(): { [themeName: string]: string[] }

  // 导出图表为图片
  exportChartAsImage(chartConfig: ChartConfig, format: 'png' | 'jpg' | 'svg'): Promise<Buffer>
}

export class DataVisualizationServiceImpl implements DataVisualizationService {
  private colorThemes = {
    default: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
    pastel: ['#93c5fd', '#86efac', '#fde68a', '#fca5a5', '#c4b5fd', '#67e8f9'],
    dark: ['#1e40af', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'],
    monochrome: ['#374151', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6'],
  };

  constructor(private db: DatabaseService) {}

  /**
   * 生成邀请趋势图
   */
  async generateInviteTrendChart(
    period: TimePeriod,
    granularity: 'day' | 'week' | 'month' = 'day',
  ): Promise<ChartConfig> {
    try {
      let dateFormat: string;
      let groupBy: string;

      switch (granularity) {
        case 'week':
          dateFormat = '%Y-%u';
          groupBy = 'YEARWEEK(ic.created_at)';
          break;
        case 'month':
          dateFormat = '%Y-%m';
          groupBy = 'DATE_FORMAT(ic.created_at, "%Y-%m")';
          break;
        default:
          dateFormat = '%Y-%m-%d';
          groupBy = 'DATE(ic.created_at)';
      }

      const query = `
        SELECT 
          DATE_FORMAT(ic.created_at, '${dateFormat}') as date,
          COUNT(DISTINCT ic.id) as invites,
          COUNT(DISTINCT ir.id) as registrations,
          COUNT(DISTINCT CASE WHEN ir.is_activated = 1 THEN ir.id END) as activations
        FROM invite_codes ic
        LEFT JOIN invite_registrations ir ON ic.id = ir.invite_code_id
        WHERE ic.created_at BETWEEN ? AND ?
        GROUP BY ${groupBy}
        ORDER BY date
      `;

      const results = await this.db.query(query, [period.start, period.end]);

      const labels = results.map((row: any) => row.date);
      const invitesData = results.map((row: any) => parseInt(row.invites, 10) || 0);
      const registrationsData = results.map((row: any) => parseInt(row.registrations, 10) || 0);
      const activationsData = results.map((row: any) => parseInt(row.activations, 10) || 0);

      return {
        type: 'line',
        title: '邀请趋势分析',
        subtitle: `${period.start.toLocaleDateString()} - ${period.end.toLocaleDateString()}`,
        data: {
          labels,
          datasets: [
            {
              label: '邀请数',
              data: invitesData,
              borderColor: this.colorThemes.default[0],
              backgroundColor: this.colorThemes.pastel[0],
              fill: false,
              tension: 0.4,
            },
            {
              label: '注册数',
              data: registrationsData,
              borderColor: this.colorThemes.default[1],
              backgroundColor: this.colorThemes.pastel[1],
              fill: false,
              tension: 0.4,
            },
            {
              label: '激活数',
              data: activationsData,
              borderColor: this.colorThemes.default[2],
              backgroundColor: this.colorThemes.pastel[2],
              fill: false,
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
            },
            tooltip: {
              enabled: true,
              mode: 'index',
            },
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: '时间',
              },
            },
            y: {
              display: true,
              beginAtZero: true,
              title: {
                display: true,
                text: '数量',
              },
            },
          },
        },
      };
    } catch (error) {
      console.error('Failed to generate invite trend chart:', error);
      throw new Error('Failed to generate invite trend chart');
    }
  }

  /**
   * 生成转化漏斗图
   */
  async generateConversionFunnelChart(period: TimePeriod): Promise<ChartConfig> {
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT ic.id) as total_invites,
          COUNT(DISTINCT se.invite_code_id) as total_clicks,
          COUNT(DISTINCT ir.id) as total_registrations,
          COUNT(DISTINCT CASE WHEN ir.is_activated = 1 THEN ir.id END) as total_activations
        FROM invite_codes ic
        LEFT JOIN share_events se ON ic.id = se.invite_code_id AND se.event_type = 'click'
        LEFT JOIN invite_registrations ir ON ic.id = ir.invite_code_id
        WHERE ic.created_at BETWEEN ? AND ?
      `;

      const result = await this.db.queryOne<{
        total_invites: number | string;
        total_clicks: number | string;
        total_registrations: number | string;
        total_activations: number | string;
      }>(query, [period.start, period.end]);

      const totalInvites = Number(result?.total_invites) || 0;
      const totalClicks = Number(result?.total_clicks) || 0;
      const totalRegistrations = Number(result?.total_registrations) || 0;
      const totalActivations = Number(result?.total_activations) || 0;

      const funnelData = [
        { step: '邀请生成', count: totalInvites },
        { step: '链接点击', count: totalClicks },
        { step: '用户注册', count: totalRegistrations },
        { step: '用户激活', count: totalActivations },
      ];

      return {
        type: 'bar',
        title: '邀请转化漏斗',
        subtitle: '展示用户从邀请到激活的完整转化路径',
        data: {
          labels: funnelData.map(d => d.step),
          datasets: [{
            label: '用户数量',
            data: funnelData.map(d => d.count),
            backgroundColor: [
              this.colorThemes.default[0],
              this.colorThemes.default[1],
              this.colorThemes.default[2],
              this.colorThemes.default[3],
            ],
            borderColor: [
              this.colorThemes.dark[0],
              this.colorThemes.dark[1],
              this.colorThemes.dark[2],
              this.colorThemes.dark[3],
            ],
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              enabled: true,
              mode: 'point',
            },
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: '转化步骤',
              },
            },
            y: {
              display: true,
              beginAtZero: true,
              title: {
                display: true,
                text: '用户数量',
              },
            },
          },
        },
      };
    } catch (error) {
      console.error('Failed to generate conversion funnel chart:', error);
      throw new Error('Failed to generate conversion funnel chart');
    }
  }

  /**
   * 生成平台分布饼图
   */
  async generatePlatformDistributionChart(period: TimePeriod): Promise<ChartConfig> {
    try {
      const query = `
        SELECT 
          se.platform,
          COUNT(*) as share_count
        FROM share_events se
        WHERE se.timestamp BETWEEN ? AND ?
        AND se.event_type = 'share'
        GROUP BY se.platform
        ORDER BY share_count DESC
      `;

      const results = await this.db.query(query, [period.start, period.end]);

      const labels = results.map((row: any) => this.getPlatformDisplayName(row.platform));
      const data = results.map((row: any) => parseInt(row.share_count, 10) || 0);

      return {
        type: 'doughnut',
        title: '分享平台分布',
        subtitle: '各平台分享次数占比',
        data: {
          labels,
          datasets: [{
            label: '分享次数',
            data,
            backgroundColor: this.colorThemes.default.slice(0, labels.length),
            borderColor: this.colorThemes.dark.slice(0, labels.length),
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: true,
              position: 'right',
            },
            tooltip: {
              enabled: true,
              mode: 'point',
            },
          },
        },
      };
    } catch (error) {
      console.error('Failed to generate platform distribution chart:', error);
      throw new Error('Failed to generate platform distribution chart');
    }
  }

  /**
   * 生成排行榜柱状图
   */
  async generateLeaderboardChart(period: TimePeriod, limit: number = 10): Promise<ChartConfig> {
    try {
      const query = `
        SELECT 
          u.name as user_name,
          COUNT(DISTINCT ir.id) as invite_count
        FROM users u
        JOIN invite_codes ic ON u.id = ic.inviter_id
        LEFT JOIN invite_registrations ir ON ic.id = ir.invite_code_id
        WHERE ic.created_at BETWEEN ? AND ?
        GROUP BY u.id, u.name
        HAVING invite_count > 0
        ORDER BY invite_count DESC
        LIMIT ?
      `;

      const results = await this.db.query(query, [period.start, period.end, limit]);

      const labels = results.map((row: any) => row.user_name);
      const data = results.map((row: any) => parseInt(row.invite_count, 10) || 0);

      return {
        type: 'bar',
        title: '邀请排行榜',
        subtitle: `前${limit}名邀请者`,
        data: {
          labels,
          datasets: [{
            label: '邀请数量',
            data,
            backgroundColor: this.colorThemes.default[0],
            borderColor: this.colorThemes.dark[0],
            borderWidth: 1,
          }],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: false,
            },
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: '用户',
              },
            },
            y: {
              display: true,
              beginAtZero: true,
              title: {
                display: true,
                text: '邀请数量',
              },
            },
          },
        },
      };
    } catch (error) {
      console.error('Failed to generate leaderboard chart:', error);
      throw new Error('Failed to generate leaderboard chart');
    }
  }

  /**
   * 生成用户活跃度热力图数据
   */
  async generateUserActivityHeatmap(period: TimePeriod): Promise<{
    data: Array<{ x: string; y: string; value: number }>
    config: any
  }> {
    try {
      const query = `
        SELECT 
          HOUR(ic.created_at) as hour,
          DAYNAME(ic.created_at) as day_name,
          COUNT(*) as activity_count
        FROM invite_codes ic
        WHERE ic.created_at BETWEEN ? AND ?
        GROUP BY HOUR(ic.created_at), DAYNAME(ic.created_at), DAYOFWEEK(ic.created_at)
        ORDER BY DAYOFWEEK(ic.created_at), HOUR(ic.created_at)
      `;

      const results = await this.db.query(query, [period.start, period.end]);

      const data = results.map((row: any) => ({
        x: `${row.hour}:00`,
        y: row.day_name,
        value: parseInt(row.activity_count, 10) || 0,
      }));

      return {
        data,
        config: {
          title: '用户活跃度热力图',
          subtitle: '按时间和星期分布的邀请活动',
          colorScale: ['#f3f4f6', '#3b82f6'],
          tooltip: {
            format: (d: any) => `${d.y} ${d.x}: ${d.value} 次邀请`,
          },
        },
      };
    } catch (error) {
      console.error('Failed to generate user activity heatmap:', error);
      throw new Error('Failed to generate user activity heatmap');
    }
  }

  /**
   * 生成转化率对比图
   */
  async generateConversionComparisonChart(periods: TimePeriod[]): Promise<ChartConfig> {
    try {
      const conversionData = [];

      for (const period of periods) {
        const query = `
          SELECT 
            COUNT(DISTINCT ic.id) as total_invites,
            COUNT(DISTINCT ir.id) as total_registrations
          FROM invite_codes ic
          LEFT JOIN invite_registrations ir ON ic.id = ir.invite_code_id
          WHERE ic.created_at BETWEEN ? AND ?
        `;

        const result = await this.db.queryOne<{
          total_invites: number | string;
          total_registrations: number | string;
        }>(query, [period.start, period.end]);
        const totalInvites = Number(result?.total_invites) || 0;
        const totalRegistrations = Number(result?.total_registrations) || 0;
        const conversionRate = totalInvites > 0 ? (totalRegistrations / totalInvites) * 100 : 0;

        conversionData.push({
          period: `${period.start.toLocaleDateString()} - ${period.end.toLocaleDateString()}`,
          conversionRate,
        });
      }

      return {
        type: 'line',
        title: '转化率趋势对比',
        subtitle: '不同时期的转化率变化',
        data: {
          labels: conversionData.map(d => d.period),
          datasets: [{
            label: '转化率 (%)',
            data: conversionData.map(d => d.conversionRate),
            borderColor: this.colorThemes.default[1],
            backgroundColor: this.colorThemes.pastel[1],
            fill: true,
            tension: 0.4,
          }],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: true,
              position: 'top',
            },
          },
          scales: {
            y: {
              display: true,
              beginAtZero: true,
              title: {
                display: true,
                text: '转化率 (%)',
              },
            },
          },
        },
      };
    } catch (error) {
      console.error('Failed to generate conversion comparison chart:', error);
      throw new Error('Failed to generate conversion comparison chart');
    }
  }

  /**
   * 生成实时数据仪表盘
   */
  async generateRealTimeDashboard(): Promise<{
    metrics: Array<{
      title: string
      value: number
      change: number
      trend: 'up' | 'down' | 'stable'
      format: 'number' | 'percentage' | 'currency'
    }>
    charts: ChartConfig[]
  }> {
    try {
      // 获取实时指标
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const todayQuery = `
        SELECT 
          COUNT(DISTINCT ic.id) as today_invites,
          COUNT(DISTINCT ir.id) as today_registrations
        FROM invite_codes ic
        LEFT JOIN invite_registrations ir ON ic.id = ir.invite_code_id
        WHERE DATE(ic.created_at) = CURDATE()
      `;

      const yesterdayQuery = `
        SELECT 
          COUNT(DISTINCT ic.id) as yesterday_invites,
          COUNT(DISTINCT ir.id) as yesterday_registrations
        FROM invite_codes ic
        LEFT JOIN invite_registrations ir ON ic.id = ir.invite_code_id
        WHERE DATE(ic.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
      `;

      const [todayResult, yesterdayResult] = await Promise.all([
        this.db.queryOne<{
          today_invites: number | string;
          today_registrations: number | string;
        }>(todayQuery),
        this.db.queryOne<{
          yesterday_invites: number | string;
          yesterday_registrations: number | string;
        }>(yesterdayQuery),
      ]);

      const todayInvites = Number(todayResult?.today_invites) || 0;
      const todayRegistrations = Number(todayResult?.today_registrations) || 0;
      const yesterdayInvites = Number(yesterdayResult?.yesterday_invites) || 0;
      const yesterdayRegistrations = Number(yesterdayResult?.yesterday_registrations) || 0;

      const calculateChange = (today: number, yesterday: number) => {
        if (!yesterday) return 0;
        return ((today - yesterday) / yesterday) * 100;
      };

      const calculateTrend = (change: number) => {
        if (change > 0) return 'up' as const;
        if (change < 0) return 'down' as const;
        return 'stable' as const;
      };

      const conversionRate = todayInvites > 0 ? (todayRegistrations / todayInvites) * 100 : 0;
      const inviteChange = calculateChange(todayInvites, yesterdayInvites);
      const registrationChange = calculateChange(todayRegistrations, yesterdayRegistrations);

      const metrics = [
        {
          title: '今日邀请',
          value: todayInvites,
          change: inviteChange,
          trend: calculateTrend(inviteChange),
          format: 'number' as const,
        },
        {
          title: '今日注册',
          value: todayRegistrations,
          change: registrationChange,
          trend: calculateTrend(registrationChange),
          format: 'number' as const,
        },
        {
          title: '转化率',
          value: conversionRate,
          change: 0, // 需要计算
          trend: 'stable' as const,
          format: 'percentage' as const,
        },
      ];

      // 生成小型图表
      const last7DaysPeriod: TimePeriod = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const trendChart = await this.generateInviteTrendChart(last7DaysPeriod, 'day');
      trendChart.title = '7天趋势';

      return {
        metrics,
        charts: [trendChart],
      };
    } catch (error) {
      console.error('Failed to generate real-time dashboard:', error);
      throw new Error('Failed to generate real-time dashboard');
    }
  }

  /**
   * 生成地理分布图数据
   */
  async generateGeographicDistribution(period: TimePeriod): Promise<{
    type: 'map'
    data: Array<{
      region: string
      value: number
      coordinates?: [number, number]
    }>
  }> {
    try {
      // 这里需要用户地理位置数据，暂时返回模拟数据
      const mockData = [
        { region: '北京', value: 45, coordinates: [116.4074, 39.9042] as [number, number] },
        { region: '上海', value: 38, coordinates: [121.4737, 31.2304] as [number, number] },
        { region: '广州', value: 32, coordinates: [113.2644, 23.1291] as [number, number] },
        { region: '深圳', value: 28, coordinates: [114.0579, 22.5431] as [number, number] },
        { region: '杭州', value: 22, coordinates: [120.1551, 30.2741] as [number, number] },
      ];

      return {
        type: 'map',
        data: mockData,
      };
    } catch (error) {
      console.error('Failed to generate geographic distribution:', error);
      throw new Error('Failed to generate geographic distribution');
    }
  }

  /**
   * 获取图表颜色主题
   */
  getChartColorThemes(): { [themeName: string]: string[] } {
    return this.colorThemes;
  }

  /**
   * 导出图表为图片
   */
  async exportChartAsImage(chartConfig: ChartConfig, format: 'png' | 'jpg' | 'svg'): Promise<Buffer> {
    try {
      // 这里应该使用图表渲染库（如Chart.js + Canvas）
      // 暂时返回空Buffer
      console.log(`Exporting chart as ${format}:`, chartConfig.title);
      return Buffer.from(`Chart image placeholder for ${chartConfig.title}`);
    } catch (error) {
      console.error('Failed to export chart as image:', error);
      throw new Error('Failed to export chart as image');
    }
  }

  /**
   * 获取平台显示名称
   */
  private getPlatformDisplayName(platform: string): string {
    const platformNames: { [key: string]: string } = {
      'wechat': '微信',
      'qq': 'QQ',
      'dingtalk': '钉钉',
      'wework': '企业微信',
      'email': '邮件',
      'link': '链接复制',
    };
    return platformNames[platform] || platform;
  }
}
