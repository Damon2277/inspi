/**
 * Dynamic Chart Generator for Real-Time Dashboard
 * 
 * Generates dynamic charts for test execution status, coverage changes,
 * and performance metrics with real-time updates.
 */

export interface ChartDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
  metadata?: any;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
  type?: 'line' | 'bar' | 'area' | 'scatter';
}

export interface ChartConfig {
  title: string;
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'heatmap';
  width?: number;
  height?: number;
  responsive?: boolean;
  realTime?: boolean;
  updateInterval?: number;
  maxDataPoints?: number;
  colors?: string[];
  animation?: {
    enabled: boolean;
    duration: number;
    easing: string;
  };
  axes?: {
    x?: {
      label: string;
      type: 'time' | 'category' | 'linear';
      format?: string;
    };
    y?: {
      label: string;
      min?: number;
      max?: number;
      format?: string;
    };
  };
  legend?: {
    enabled: boolean;
    position: 'top' | 'bottom' | 'left' | 'right';
  };
  tooltip?: {
    enabled: boolean;
    format?: string;
  };
}

export interface ChartData {
  series: ChartSeries[];
  labels?: string[];
  config: ChartConfig;
}

export class DynamicChartGenerator {
  private charts: Map<string, ChartData> = new Map();
  private updateCallbacks: Map<string, (data: ChartData) => void> = new Map();

  /**
   * Create a new chart
   */
  public createChart(id: string, config: ChartConfig): ChartData {
    const chartData: ChartData = {
      series: [],
      config: {
        responsive: true,
        realTime: false,
        updateInterval: 1000,
        maxDataPoints: 100,
        colors: [
          '#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8',
          '#6f42c1', '#e83e8c', '#fd7e14', '#20c997', '#6c757d'
        ],
        animation: {
          enabled: true,
          duration: 300,
          easing: 'ease-in-out'
        },
        legend: {
          enabled: true,
          position: 'top'
        },
        tooltip: {
          enabled: true
        },
        ...config
      }
    };

    this.charts.set(id, chartData);
    return chartData;
  }

  /**
   * Add data series to chart
   */
  public addSeries(chartId: string, series: ChartSeries): void {
    const chart = this.charts.get(chartId);
    if (!chart) {
      throw new Error(`Chart with id ${chartId} not found`);
    }

    // Assign color if not provided
    if (!series.color && chart.config.colors) {
      const colorIndex = chart.series.length % chart.config.colors.length;
      series.color = chart.config.colors[colorIndex];
    }

    chart.series.push(series);
    this.notifyUpdate(chartId, chart);
  }

  /**
   * Update series data
   */
  public updateSeries(chartId: string, seriesName: string, data: ChartDataPoint[]): void {
    const chart = this.charts.get(chartId);
    if (!chart) {
      throw new Error(`Chart with id ${chartId} not found`);
    }

    const series = chart.series.find(s => s.name === seriesName);
    if (!series) {
      throw new Error(`Series ${seriesName} not found in chart ${chartId}`);
    }

    // Limit data points if maxDataPoints is set
    if (chart.config.maxDataPoints && data.length > chart.config.maxDataPoints) {
      series.data = data.slice(-chart.config.maxDataPoints);
    } else {
      series.data = [...data];
    }

    this.notifyUpdate(chartId, chart);
  }

  /**
   * Add data point to series
   */
  public addDataPoint(chartId: string, seriesName: string, dataPoint: ChartDataPoint): void {
    const chart = this.charts.get(chartId);
    if (!chart) {
      throw new Error(`Chart with id ${chartId} not found`);
    }

    const series = chart.series.find(s => s.name === seriesName);
    if (!series) {
      throw new Error(`Series ${seriesName} not found in chart ${chartId}`);
    }

    series.data.push(dataPoint);

    // Remove old data points if exceeding max
    if (chart.config.maxDataPoints && series.data.length > chart.config.maxDataPoints) {
      series.data = series.data.slice(-chart.config.maxDataPoints);
    }

    this.notifyUpdate(chartId, chart);
  }

  /**
   * Generate test execution status chart
   */
  public generateTestStatusChart(
    testStatuses: Array<{ status: string; timestamp: Date; count: number }>
  ): ChartData {
    const chartId = 'test-status-timeline';
    const config: ChartConfig = {
      title: 'Test Execution Status Over Time',
      type: 'area',
      realTime: true,
      axes: {
        x: {
          label: 'Time',
          type: 'time',
          format: 'HH:mm:ss'
        },
        y: {
          label: 'Number of Tests',
          min: 0
        }
      }
    };

    const chart = this.createChart(chartId, config);

    // Group by status
    const statusGroups = testStatuses.reduce((groups, status) => {
      if (!groups[status.status]) {
        groups[status.status] = [];
      }
      groups[status.status].push({
        timestamp: status.timestamp,
        value: status.count
      });
      return groups;
    }, {} as { [status: string]: ChartDataPoint[] });

    // Create series for each status
    Object.entries(statusGroups).forEach(([status, data]) => {
      this.addSeries(chartId, {
        name: status.charAt(0).toUpperCase() + status.slice(1),
        data,
        type: 'area'
      });
    });

    return chart;
  }

  /**
   * Generate coverage trend chart
   */
  public generateCoverageTrendChart(
    coverageHistory: Array<{
      timestamp: Date;
      statements: number;
      branches: number;
      functions: number;
      lines: number;
    }>
  ): ChartData {
    const chartId = 'coverage-trend';
    const config: ChartConfig = {
      title: 'Code Coverage Trends',
      type: 'line',
      realTime: true,
      axes: {
        x: {
          label: 'Time',
          type: 'time',
          format: 'HH:mm'
        },
        y: {
          label: 'Coverage %',
          min: 0,
          max: 100,
          format: '{value}%'
        }
      }
    };

    const chart = this.createChart(chartId, config);

    // Create series for each coverage type
    const coverageTypes = ['statements', 'branches', 'functions', 'lines'];
    coverageTypes.forEach(type => {
      const data = coverageHistory.map(snapshot => ({
        timestamp: snapshot.timestamp,
        value: snapshot[type as keyof typeof snapshot] as number
      }));

      this.addSeries(chartId, {
        name: type.charAt(0).toUpperCase() + type.slice(1),
        data,
        type: 'line'
      });
    });

    return chart;
  }

  /**
   * Generate performance metrics chart
   */
  public generatePerformanceChart(
    performanceData: Array<{
      timestamp: Date;
      averageTestTime: number;
      memoryUsage: number;
      totalTests: number;
    }>
  ): ChartData {
    const chartId = 'performance-metrics';
    const config: ChartConfig = {
      title: 'Performance Metrics',
      type: 'line',
      realTime: true,
      axes: {
        x: {
          label: 'Time',
          type: 'time',
          format: 'HH:mm'
        },
        y: {
          label: 'Value',
          min: 0
        }
      }
    };

    const chart = this.createChart(chartId, config);

    // Average test time series
    this.addSeries(chartId, {
      name: 'Avg Test Time (ms)',
      data: performanceData.map(d => ({
        timestamp: d.timestamp,
        value: d.averageTestTime
      })),
      type: 'line'
    });

    // Memory usage series
    this.addSeries(chartId, {
      name: 'Memory Usage (MB)',
      data: performanceData.map(d => ({
        timestamp: d.timestamp,
        value: d.memoryUsage
      })),
      type: 'line'
    });

    return chart;
  }

  /**
   * Generate test failure heatmap
   */
  public generateFailureHeatmap(
    failureData: Array<{
      file: string;
      testName: string;
      failureCount: number;
      timestamp: Date;
    }>
  ): ChartData {
    const chartId = 'failure-heatmap';
    const config: ChartConfig = {
      title: 'Test Failure Heatmap',
      type: 'heatmap',
      axes: {
        x: {
          label: 'Test Files',
          type: 'category'
        },
        y: {
          label: 'Tests',
          type: 'category'
        }
      }
    };

    const chart = this.createChart(chartId, config);

    // Process failure data into heatmap format
    const heatmapData = failureData.map(failure => ({
      timestamp: failure.timestamp,
      value: failure.failureCount,
      metadata: {
        file: failure.file,
        testName: failure.testName,
        x: failure.file,
        y: failure.testName
      }
    }));

    this.addSeries(chartId, {
      name: 'Failure Count',
      data: heatmapData,
      type: 'scatter'
    });

    return chart;
  }

  /**
   * Generate real-time test progress chart
   */
  public generateTestProgressChart(): ChartData {
    const chartId = 'test-progress';
    const config: ChartConfig = {
      title: 'Test Execution Progress',
      type: 'doughnut',
      realTime: true,
      legend: {
        enabled: true,
        position: 'right'
      }
    };

    const chart = this.createChart(chartId, config);
    
    // Initialize with empty data
    chart.labels = ['Passed', 'Failed', 'Running', 'Pending'];
    
    return chart;
  }

  /**
   * Update test progress chart
   */
  public updateTestProgressChart(
    chartId: string,
    data: {
      passed: number;
      failed: number;
      running: number;
      pending: number;
    }
  ): void {
    const chart = this.charts.get(chartId);
    if (!chart) return;

    const now = new Date();
    chart.series = [{
      name: 'Test Status',
      data: [
        { timestamp: now, value: data.passed, label: 'Passed' },
        { timestamp: now, value: data.failed, label: 'Failed' },
        { timestamp: now, value: data.running, label: 'Running' },
        { timestamp: now, value: data.pending, label: 'Pending' }
      ]
    }];

    this.notifyUpdate(chartId, chart);
  }

  /**
   * Register update callback
   */
  public onUpdate(chartId: string, callback: (data: ChartData) => void): void {
    this.updateCallbacks.set(chartId, callback);
  }

  /**
   * Unregister update callback
   */
  public offUpdate(chartId: string): void {
    this.updateCallbacks.delete(chartId);
  }

  /**
   * Get chart data
   */
  public getChart(chartId: string): ChartData | undefined {
    return this.charts.get(chartId);
  }

  /**
   * Get all charts
   */
  public getAllCharts(): Map<string, ChartData> {
    return new Map(this.charts);
  }

  /**
   * Remove chart
   */
  public removeChart(chartId: string): boolean {
    this.updateCallbacks.delete(chartId);
    return this.charts.delete(chartId);
  }

  /**
   * Clear all charts
   */
  public clearAll(): void {
    this.charts.clear();
    this.updateCallbacks.clear();
  }

  /**
   * Export chart configuration
   */
  public exportChartConfig(chartId: string): any {
    const chart = this.charts.get(chartId);
    if (!chart) return null;

    return {
      id: chartId,
      config: chart.config,
      seriesCount: chart.series.length,
      dataPoints: chart.series.reduce((sum, series) => sum + series.data.length, 0)
    };
  }

  /**
   * Generate Chart.js configuration
   */
  public generateChartJsConfig(chartId: string): any {
    const chart = this.charts.get(chartId);
    if (!chart) return null;

    const config = chart.config;
    const series = chart.series;

    // Base Chart.js configuration
    const chartJsConfig: any = {
      type: this.mapChartType(config.type),
      data: {
        labels: chart.labels || [],
        datasets: series.map((s, index) => ({
          label: s.name,
          data: s.data.map(d => ({
            x: config.axes?.x?.type === 'time' ? d.timestamp : d.label || index,
            y: d.value
          })),
          backgroundColor: s.color || config.colors?.[index % (config.colors?.length || 1)],
          borderColor: s.color || config.colors?.[index % (config.colors?.length || 1)],
          fill: s.type === 'area'
        }))
      },
      options: {
        responsive: config.responsive,
        animation: config.animation,
        plugins: {
          title: {
            display: true,
            text: config.title
          },
          legend: {
            display: config.legend?.enabled,
            position: config.legend?.position
          },
          tooltip: {
            enabled: config.tooltip?.enabled
          }
        },
        scales: {}
      }
    };

    // Configure scales
    if (config.axes?.x) {
      chartJsConfig.options.scales.x = {
        display: true,
        title: {
          display: true,
          text: config.axes.x.label
        },
        type: config.axes.x.type === 'time' ? 'time' : 'linear'
      };
    }

    if (config.axes?.y) {
      chartJsConfig.options.scales.y = {
        display: true,
        title: {
          display: true,
          text: config.axes.y.label
        },
        min: config.axes.y.min,
        max: config.axes.y.max
      };
    }

    return chartJsConfig;
  }

  /**
   * Map internal chart types to Chart.js types
   */
  private mapChartType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'area': 'line',
      'heatmap': 'scatter'
    };

    return typeMap[type] || type;
  }

  /**
   * Notify update callbacks
   */
  private notifyUpdate(chartId: string, chart: ChartData): void {
    const callback = this.updateCallbacks.get(chartId);
    if (callback) {
      callback(chart);
    }
  }
}