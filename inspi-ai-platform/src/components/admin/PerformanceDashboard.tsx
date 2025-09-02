/**
 * 性能监控仪表板
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { globalWebVitalsMonitor, WebVitalsMetric } from '@/lib/performance/web-vitals';
import { globalCustomMetricsCollector, CustomMetric } from '@/lib/performance/custom-metrics';
import { globalPerformanceAlertManager, AlertEvent, AlertRule } from '@/lib/performance/alerts';
import { globalMemoryMonitor, MemoryInfo } from '@/lib/performance/memory';

/**
 * 仪表板数据
 */
interface DashboardData {
  webVitals: Record<string, WebVitalsMetric>;
  customMetrics: CustomMetric[];
  alerts: AlertEvent[];
  memory: MemoryInfo | null;
  systemStatus: {
    enabled: boolean;
    rulesCount: number;
    activeAlertsCount: number;
    totalEventsCount: number;
  };
}

/**
 * 指标卡片组件
 */
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  unit?: string;
  status?: 'good' | 'warning' | 'error';
  trend?: 'up' | 'down' | 'stable';
  description?: string;
}> = ({ title, value, unit, status = 'good', trend, description }) => {
  const statusColors = {
    good: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
  };

  const trendIcons = {
    up: '↗️',
    down: '↘️',
    stable: '→'
  };

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '8px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: '500',
          color: '#6b7280'
        }}>
          {title}
        </h3>
        {trend && (
          <span style={{ fontSize: '16px' }}>
            {trendIcons[trend]}
          </span>
        )}
      </div>
      
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '4px',
        marginBottom: '4px'
      }}>
        <span style={{
          fontSize: '24px',
          fontWeight: '700',
          color: statusColors[status]
        }}>
          {typeof value === 'number' ? Math.round(value) : value}
        </span>
        {unit && (
          <span style={{
            fontSize: '14px',
            color: '#6b7280'
          }}>
            {unit}
          </span>
        )}
      </div>
      
      {description && (
        <p style={{
          margin: 0,
          fontSize: '12px',
          color: '#9ca3af'
        }}>
          {description}
        </p>
      )}
    </div>
  );
};

/**
 * Web Vitals 面板
 */
const WebVitalsPanel: React.FC<{ webVitals: Record<string, WebVitalsMetric> }> = ({ webVitals }) => {
  const getStatusFromRating = (rating: string) => {
    switch (rating) {
      case 'good': return 'good';
      case 'needs-improvement': return 'warning';
      case 'poor': return 'error';
      default: return 'good';
    }
  };

  const getUnit = (name: string) => {
    switch (name) {
      case 'CLS': return '';
      case 'FID':
      case 'FCP':
      case 'LCP':
      case 'TTFB':
      case 'INP': return 'ms';
      default: return '';
    }
  };

  const getDescription = (name: string, rating: string) => {
    const descriptions = {
      CLS: 'Cumulative Layout Shift',
      FID: 'First Input Delay',
      FCP: 'First Contentful Paint',
      LCP: 'Largest Contentful Paint',
      TTFB: 'Time to First Byte',
      INP: 'Interaction to Next Paint'
    };
    return `${descriptions[name as keyof typeof descriptions]} - ${rating}`;
  };

  return (
    <div>
      <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
        Web Vitals
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        {Object.entries(webVitals).map(([name, metric]) => (
          <MetricCard
            key={name}
            title={name}
            value={metric.value}
            unit={getUnit(name)}
            status={getStatusFromRating(metric.rating)}
            description={getDescription(name, metric.rating)}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * 自定义指标面板
 */
const CustomMetricsPanel: React.FC<{ metrics: CustomMetric[] }> = ({ metrics }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const categories = ['all', ...new Set(metrics.map(m => m.category))];
  const filteredMetrics = selectedCategory === 'all' 
    ? metrics 
    : metrics.filter(m => m.category === selectedCategory);

  const recentMetrics = filteredMetrics
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 12);

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
          Custom Metrics
        </h2>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: '4px 8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </option>
          ))}
        </select>
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        {recentMetrics.map((metric, index) => (
          <MetricCard
            key={`${metric.name}-${index}`}
            title={metric.name}
            value={metric.value}
            unit={metric.unit}
            description={`Category: ${metric.category}`}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * 告警面板
 */
const AlertsPanel: React.FC<{ alerts: AlertEvent[] }> = ({ alerts }) => {
  const [showResolved, setShowResolved] = useState(false);
  
  const filteredAlerts = showResolved 
    ? alerts 
    : alerts.filter(alert => !alert.resolved);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return '#dc2626';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
          Alerts ({filteredAlerts.length})
        </h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
          />
          Show resolved
        </label>
      </div>
      
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {filteredAlerts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '32px',
            color: '#6b7280',
            backgroundColor: '#f9fafb',
            borderRadius: '8px'
          }}>
            No alerts to display
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredAlerts.map(alert => (
              <div
                key={alert.id}
                style={{
                  padding: '12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  borderLeftWidth: '4px',
                  borderLeftColor: getLevelColor(alert.level),
                  backgroundColor: alert.resolved ? '#f9fafb' : 'white'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '4px'
                }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: getLevelColor(alert.level),
                    textTransform: 'uppercase'
                  }}>
                    {alert.level}
                  </span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    {formatTime(alert.timestamp)}
                  </span>
                </div>
                
                <h4 style={{
                  margin: '0 0 4px 0',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  {alert.ruleName}
                </h4>
                
                <p style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#6b7280'
                }}>
                  {alert.message}
                </p>
                
                {alert.resolved && (
                  <div style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: '#10b981'
                  }}>
                    ✓ Resolved at {formatTime(alert.resolvedAt!)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 内存监控面板
 */
const MemoryPanel: React.FC<{ memory: MemoryInfo | null }> = ({ memory }) => {
  if (!memory) {
    return (
      <div>
        <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
          Memory Usage
        </h2>
        <div style={{
          textAlign: 'center',
          padding: '32px',
          color: '#6b7280',
          backgroundColor: '#f9fafb',
          borderRadius: '8px'
        }}>
          Memory monitoring not available
        </div>
      </div>
    );
  }

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(1);
  };

  const getMemoryStatus = (percentage: number) => {
    if (percentage > 85) return 'error';
    if (percentage > 70) return 'warning';
    return 'good';
  };

  return (
    <div>
      <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
        Memory Usage
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px'
      }}>
        <MetricCard
          title="Used Memory"
          value={formatBytes(memory.usedJSHeapSize)}
          unit="MB"
          status={getMemoryStatus(memory.usagePercentage)}
        />
        <MetricCard
          title="Total Memory"
          value={formatBytes(memory.totalJSHeapSize)}
          unit="MB"
        />
        <MetricCard
          title="Memory Limit"
          value={formatBytes(memory.jsHeapSizeLimit)}
          unit="MB"
        />
        <MetricCard
          title="Usage"
          value={memory.usagePercentage}
          unit="%"
          status={getMemoryStatus(memory.usagePercentage)}
          description={memory.isNearLimit ? 'Near limit' : 'Normal'}
        />
      </div>
    </div>
  );
};

/**
 * 系统状态面板
 */
const SystemStatusPanel: React.FC<{ status: DashboardData['systemStatus'] }> = ({ status }) => {
  return (
    <div>
      <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
        System Status
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px'
      }}>
        <MetricCard
          title="Monitoring"
          value={status.enabled ? 'Enabled' : 'Disabled'}
          status={status.enabled ? 'good' : 'error'}
        />
        <MetricCard
          title="Alert Rules"
          value={status.rulesCount}
          unit="rules"
        />
        <MetricCard
          title="Active Alerts"
          value={status.activeAlertsCount}
          unit="alerts"
          status={status.activeAlertsCount > 0 ? 'warning' : 'good'}
        />
        <MetricCard
          title="Total Events"
          value={status.totalEventsCount}
          unit="events"
        />
      </div>
    </div>
  );
};

/**
 * 性能监控仪表板主组件
 */
const PerformanceDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData>({
    webVitals: {},
    customMetrics: [],
    alerts: [],
    memory: null,
    systemStatus: {
      enabled: false,
      rulesCount: 0,
      activeAlertsCount: 0,
      totalEventsCount: 0
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(() => {
    try {
      const webVitals = globalWebVitalsMonitor.getMetrics();
      const customMetrics = globalCustomMetricsCollector.getMetrics();
      const alerts = globalPerformanceAlertManager.getEvents(50);
      const memory = globalMemoryMonitor.getCurrentMemoryInfo();
      const systemStatus = globalPerformanceAlertManager.getStatus();

      setData({
        webVitals: Object.fromEntries(webVitals),
        customMetrics,
        alerts,
        memory,
        systemStatus
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, 5000); // 每5秒刷新
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const handleRefresh = () => {
    setIsLoading(true);
    fetchData();
  };

  const handleClearAlerts = () => {
    globalPerformanceAlertManager.clearEvents();
    fetchData();
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        fontSize: '16px',
        color: '#6b7280'
      }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#f9fafb',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: '700',
          color: '#111827'
        }}>
          Performance Dashboard
        </h1>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto refresh
          </label>
          
          <button
            onClick={handleRefresh}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Refresh
          </button>
          
          <button
            onClick={handleClearAlerts}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Clear Alerts
          </button>
        </div>
      </div>

      {/* Dashboard Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <SystemStatusPanel status={data.systemStatus} />
        <WebVitalsPanel webVitals={data.webVitals} />
        <MemoryPanel memory={data.memory} />
        <CustomMetricsPanel metrics={data.customMetrics} />
        <AlertsPanel alerts={data.alerts} />
      </div>
    </div>
  );
};

export default PerformanceDashboard;