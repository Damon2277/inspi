/**
 * DynamicChartGenerator Unit Tests
 * 
 * Comprehensive test suite for the dynamic chart generation system,
 * covering chart creation, data management, real-time updates,
 * and Chart.js integration.
 */

import { DynamicChartGenerator, ChartConfig, ChartSeries, ChartDataPoint } from '../../../../lib/testing/dashboard/DynamicChartGenerator';

describe('DynamicChartGenerator', () => {
  let chartGenerator: DynamicChartGenerator;

  beforeEach(() => {
    chartGenerator = new DynamicChartGenerator();
  });

  afterEach(() => {
    chartGenerator.clearAll();
  });

  describe('Chart Creation', () => {
    it('should create a new chart with default configuration', () => {
      const config: ChartConfig = {
        title: 'Test Chart',
        type: 'line'
      };

      const chart = chartGenerator.createChart('test-chart', config);

      expect(chart).toBeDefined();
      expect(chart.config.title).toBe('Test Chart');
      expect(chart.config.type).toBe('line');
      expect(chart.config.responsive).toBe(true);
      expect(chart.series).toHaveLength(0);
    });

    it('should create chart with custom configuration', () => {
      const config: ChartConfig = {
        title: 'Custom Chart',
        type: 'bar',
        width: 800,
        height: 400,
        responsive: false,
        realTime: true,
        maxDataPoints: 50,
        colors: ['#ff0000', '#00ff00', '#0000ff']
      };

      const chart = chartGenerator.createChart('custom-chart', config);

      expect(chart.config.width).toBe(800);
      expect(chart.config.height).toBe(400);
      expect(chart.config.responsive).toBe(false);
      expect(chart.config.realTime).toBe(true);
      expect(chart.config.maxDataPoints).toBe(50);
      expect(chart.config.colors).toEqual(['#ff0000', '#00ff00', '#0000ff']);
    });

    it('should retrieve created chart', () => {
      const config: ChartConfig = {
        title: 'Retrievable Chart',
        type: 'pie'
      };

      chartGenerator.createChart('retrievable-chart', config);
      const retrievedChart = chartGenerator.getChart('retrievable-chart');

      expect(retrievedChart).toBeDefined();
      expect(retrievedChart?.config.title).toBe('Retrievable Chart');
    });

    it('should return undefined for non-existent chart', () => {
      const chart = chartGenerator.getChart('non-existent');
      expect(chart).toBeUndefined();
    });
  });

  describe('Series Management', () => {
    beforeEach(() => {
      chartGenerator.createChart('test-chart', {
        title: 'Test Chart',
        type: 'line'
      });
    });

    it('should add series to chart', () => {
      const series: ChartSeries = {
        name: 'Test Series',
        data: [
          { timestamp: new Date(), value: 10 },
          { timestamp: new Date(), value: 20 }
        ],
        type: 'line'
      };

      chartGenerator.addSeries('test-chart', series);
      const chart = chartGenerator.getChart('test-chart');

      expect(chart?.series).toHaveLength(1);
      expect(chart?.series[0].name).toBe('Test Series');
      expect(chart?.series[0].data).toHaveLength(2);
    });

    it('should assign colors to series automatically', () => {
      const series1: ChartSeries = {
        name: 'Series 1',
        data: [],
        type: 'line'
      };

      const series2: ChartSeries = {
        name: 'Series 2',
        data: [],
        type: 'line'
      };

      chartGenerator.addSeries('test-chart', series1);
      chartGenerator.addSeries('test-chart', series2);

      const chart = chartGenerator.getChart('test-chart');
      expect(chart?.series[0].color).toBeDefined();
      expect(chart?.series[1].color).toBeDefined();
      expect(chart?.series[0].color).not.toBe(chart?.series[1].color);
    });

    it('should update series data', () => {
      const initialSeries: ChartSeries = {
        name: 'Updatable Series',
        data: [{ timestamp: new Date(), value: 10 }],
        type: 'line'
      };

      chartGenerator.addSeries('test-chart', initialSeries);

      const newData: ChartDataPoint[] = [
        { timestamp: new Date(), value: 20 },
        { timestamp: new Date(), value: 30 }
      ];

      chartGenerator.updateSeries('test-chart', 'Updatable Series', newData);

      const chart = chartGenerator.getChart('test-chart');
      expect(chart?.series[0].data).toHaveLength(2);
      expect(chart?.series[0].data[0].value).toBe(20);
      expect(chart?.series[0].data[1].value).toBe(30);
    });

    it('should add data points to series', () => {
      const series: ChartSeries = {
        name: 'Growing Series',
        data: [{ timestamp: new Date(), value: 10 }],
        type: 'line'
      };

      chartGenerator.addSeries('test-chart', series);

      const newDataPoint: ChartDataPoint = {
        timestamp: new Date(),
        value: 20,
        label: 'New Point'
      };

      chartGenerator.addDataPoint('test-chart', 'Growing Series', newDataPoint);

      const chart = chartGenerator.getChart('test-chart');
      expect(chart?.series[0].data).toHaveLength(2);
      expect(chart?.series[0].data[1].value).toBe(20);
      expect(chart?.series[0].data[1].label).toBe('New Point');
    });

    it('should limit data points based on maxDataPoints', () => {
      // Create chart with small max data points
      chartGenerator.createChart('limited-chart', {
        title: 'Limited Chart',
        type: 'line',
        maxDataPoints: 3
      });

      const series: ChartSeries = {
        name: 'Limited Series',
        data: [],
        type: 'line'
      };

      chartGenerator.addSeries('limited-chart', series);

      // Add more data points than the limit
      for (let i = 0; i < 5; i++) {
        chartGenerator.addDataPoint('limited-chart', 'Limited Series', {
          timestamp: new Date(Date.now() + i * 1000),
          value: i
        });
      }

      const chart = chartGenerator.getChart('limited-chart');
      expect(chart?.series[0].data).toHaveLength(3);
      expect(chart?.series[0].data[0].value).toBe(2); // Should keep last 3 points
      expect(chart?.series[0].data[2].value).toBe(4);
    });

    it('should throw error for non-existent chart when adding series', () => {
      const series: ChartSeries = {
        name: 'Test Series',
        data: [],
        type: 'line'
      };

      expect(() => {
        chartGenerator.addSeries('non-existent', series);
      }).toThrow('Chart with id non-existent not found');
    });

    it('should throw error for non-existent series when updating', () => {
      expect(() => {
        chartGenerator.updateSeries('test-chart', 'non-existent-series', []);
      }).toThrow('Series non-existent-series not found in chart test-chart');
    });
  });

  describe('Predefined Chart Generators', () => {
    it('should generate test status chart', () => {
      const testStatuses = [
        { status: 'passed', timestamp: new Date(Date.now() - 2000), count: 5 },
        { status: 'failed', timestamp: new Date(Date.now() - 1000), count: 2 },
        { status: 'running', timestamp: new Date(), count: 3 }
      ];

      const chart = chartGenerator.generateTestStatusChart(testStatuses);

      expect(chart.config.title).toBe('Test Execution Status Over Time');
      expect(chart.config.type).toBe('area');
      expect(chart.series.length).toBeGreaterThan(0);
    });

    it('should generate coverage trend chart', () => {
      const coverageHistory = [
        {
          timestamp: new Date(Date.now() - 2000),
          statements: 80,
          branches: 75,
          functions: 85,
          lines: 78
        },
        {
          timestamp: new Date(Date.now() - 1000),
          statements: 85,
          branches: 80,
          functions: 90,
          lines: 83
        }
      ];

      const chart = chartGenerator.generateCoverageTrendChart(coverageHistory);

      expect(chart.config.title).toBe('Code Coverage Trends');
      expect(chart.config.type).toBe('line');
      expect(chart.series).toHaveLength(4); // statements, branches, functions, lines
      expect(chart.series[0].name).toBe('Statements');
      expect(chart.series[0].data).toHaveLength(2);
    });

    it('should generate performance chart', () => {
      const performanceData = [
        {
          timestamp: new Date(Date.now() - 2000),
          averageTestTime: 100,
          memoryUsage: 64,
          totalTests: 50
        },
        {
          timestamp: new Date(Date.now() - 1000),
          averageTestTime: 120,
          memoryUsage: 72,
          totalTests: 60
        }
      ];

      const chart = chartGenerator.generatePerformanceChart(performanceData);

      expect(chart.config.title).toBe('Performance Metrics');
      expect(chart.series).toHaveLength(2); // averageTestTime, memoryUsage
      expect(chart.series[0].name).toBe('Avg Test Time (ms)');
      expect(chart.series[1].name).toBe('Memory Usage (MB)');
    });

    it('should generate failure heatmap', () => {
      const failureData = [
        {
          file: 'test1.spec.ts',
          testName: 'Test A',
          failureCount: 3,
          timestamp: new Date()
        },
        {
          file: 'test2.spec.ts',
          testName: 'Test B',
          failureCount: 1,
          timestamp: new Date()
        }
      ];

      const chart = chartGenerator.generateFailureHeatmap(failureData);

      expect(chart.config.title).toBe('Test Failure Heatmap');
      expect(chart.config.type).toBe('heatmap');
      expect(chart.series).toHaveLength(1);
      expect(chart.series[0].data).toHaveLength(2);
    });

    it('should generate test progress chart', () => {
      const chart = chartGenerator.generateTestProgressChart();

      expect(chart.config.title).toBe('Test Execution Progress');
      expect(chart.config.type).toBe('doughnut');
      expect(chart.labels).toEqual(['Passed', 'Failed', 'Running', 'Pending']);
    });

    it('should update test progress chart', () => {
      const chart = chartGenerator.generateTestProgressChart();
      const chartId = 'test-progress';
      
      // Manually add the chart to the generator
      (chartGenerator as any).charts.set(chartId, chart);

      chartGenerator.updateTestProgressChart(chartId, {
        passed: 10,
        failed: 2,
        running: 3,
        pending: 5
      });

      const updatedChart = chartGenerator.getChart(chartId);
      expect(updatedChart?.series).toHaveLength(1);
      expect(updatedChart?.series[0].data).toHaveLength(4);
      expect(updatedChart?.series[0].data[0].value).toBe(10);
    });
  });

  describe('Chart Management', () => {
    it('should get all charts', () => {
      chartGenerator.createChart('chart1', { title: 'Chart 1', type: 'line' });
      chartGenerator.createChart('chart2', { title: 'Chart 2', type: 'bar' });

      const allCharts = chartGenerator.getAllCharts();
      expect(allCharts.size).toBe(2);
      expect(allCharts.has('chart1')).toBe(true);
      expect(allCharts.has('chart2')).toBe(true);
    });

    it('should remove chart', () => {
      chartGenerator.createChart('removable-chart', { title: 'Removable', type: 'pie' });
      
      const removed = chartGenerator.removeChart('removable-chart');
      expect(removed).toBe(true);
      
      const chart = chartGenerator.getChart('removable-chart');
      expect(chart).toBeUndefined();
    });

    it('should return false when removing non-existent chart', () => {
      const removed = chartGenerator.removeChart('non-existent');
      expect(removed).toBe(false);
    });

    it('should clear all charts', () => {
      chartGenerator.createChart('chart1', { title: 'Chart 1', type: 'line' });
      chartGenerator.createChart('chart2', { title: 'Chart 2', type: 'bar' });

      chartGenerator.clearAll();

      const allCharts = chartGenerator.getAllCharts();
      expect(allCharts.size).toBe(0);
    });
  });

  describe('Update Callbacks', () => {
    it('should register and call update callbacks', (done) => {
      chartGenerator.createChart('callback-chart', { title: 'Callback Chart', type: 'line' });

      chartGenerator.onUpdate('callback-chart', (data) => {
        expect(data.config.title).toBe('Callback Chart');
        done();
      });

      const series: ChartSeries = {
        name: 'Test Series',
        data: [{ timestamp: new Date(), value: 10 }],
        type: 'line'
      };

      chartGenerator.addSeries('callback-chart', series);
    });

    it('should unregister update callbacks', () => {
      chartGenerator.createChart('callback-chart', { title: 'Callback Chart', type: 'line' });

      let callbackCalled = false;
      chartGenerator.onUpdate('callback-chart', () => {
        callbackCalled = true;
      });

      chartGenerator.offUpdate('callback-chart');

      const series: ChartSeries = {
        name: 'Test Series',
        data: [{ timestamp: new Date(), value: 10 }],
        type: 'line'
      };

      chartGenerator.addSeries('callback-chart', series);

      // Give some time for potential callback
      setTimeout(() => {
        expect(callbackCalled).toBe(false);
      }, 100);
    });
  });

  describe('Chart.js Integration', () => {
    beforeEach(() => {
      chartGenerator.createChart('chartjs-test', {
        title: 'Chart.js Test',
        type: 'line',
        axes: {
          x: { label: 'Time', type: 'time' },
          y: { label: 'Value', min: 0, max: 100 }
        }
      });

      const series: ChartSeries = {
        name: 'Test Data',
        data: [
          { timestamp: new Date(Date.now() - 2000), value: 10 },
          { timestamp: new Date(Date.now() - 1000), value: 20 }
        ],
        type: 'line',
        color: '#ff0000'
      };

      chartGenerator.addSeries('chartjs-test', series);
    });

    it('should generate Chart.js configuration', () => {
      const config = chartGenerator.generateChartJsConfig('chartjs-test');

      expect(config).toBeDefined();
      expect(config.type).toBe('line');
      expect(config.data.datasets).toHaveLength(1);
      expect(config.data.datasets[0].label).toBe('Test Data');
      expect(config.data.datasets[0].data).toHaveLength(2);
      expect(config.options.plugins.title.text).toBe('Chart.js Test');
    });

    it('should configure scales correctly', () => {
      const config = chartGenerator.generateChartJsConfig('chartjs-test');

      expect(config.options.scales.x).toBeDefined();
      expect(config.options.scales.x.title.text).toBe('Time');
      expect(config.options.scales.x.type).toBe('time');

      expect(config.options.scales.y).toBeDefined();
      expect(config.options.scales.y.title.text).toBe('Value');
      expect(config.options.scales.y.min).toBe(0);
      expect(config.options.scales.y.max).toBe(100);
    });

    it('should return null for non-existent chart', () => {
      const config = chartGenerator.generateChartJsConfig('non-existent');
      expect(config).toBeNull();
    });

    it('should map chart types correctly', () => {
      chartGenerator.createChart('area-chart', { title: 'Area Chart', type: 'area' });
      chartGenerator.createChart('heatmap-chart', { title: 'Heatmap Chart', type: 'heatmap' });

      const areaConfig = chartGenerator.generateChartJsConfig('area-chart');
      const heatmapConfig = chartGenerator.generateChartJsConfig('heatmap-chart');

      expect(areaConfig.type).toBe('line'); // area maps to line
      expect(heatmapConfig.type).toBe('scatter'); // heatmap maps to scatter
    });
  });

  describe('Export Configuration', () => {
    it('should export chart configuration', () => {
      chartGenerator.createChart('export-test', { title: 'Export Test', type: 'bar' });
      
      const series: ChartSeries = {
        name: 'Export Series',
        data: [
          { timestamp: new Date(), value: 10 },
          { timestamp: new Date(), value: 20 },
          { timestamp: new Date(), value: 30 }
        ],
        type: 'bar'
      };

      chartGenerator.addSeries('export-test', series);

      const exportConfig = chartGenerator.exportChartConfig('export-test');

      expect(exportConfig).toBeDefined();
      expect(exportConfig.id).toBe('export-test');
      expect(exportConfig.config.title).toBe('Export Test');
      expect(exportConfig.seriesCount).toBe(1);
      expect(exportConfig.dataPoints).toBe(3);
    });

    it('should return null for non-existent chart export', () => {
      const exportConfig = chartGenerator.exportChartConfig('non-existent');
      expect(exportConfig).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid chart operations gracefully', () => {
      expect(() => {
        chartGenerator.addDataPoint('non-existent', 'series', { timestamp: new Date(), value: 10 });
      }).toThrow();

      expect(() => {
        chartGenerator.updateSeries('non-existent', 'series', []);
      }).toThrow();
    });

    it('should handle malformed data gracefully', () => {
      chartGenerator.createChart('error-test', { title: 'Error Test', type: 'line' });

      expect(() => {
        chartGenerator.addSeries('error-test', {
          name: '',
          data: [],
          type: 'line'
        });
      }).not.toThrow();

      expect(() => {
        chartGenerator.addDataPoint('error-test', '', {
          timestamp: new Date(),
          value: NaN
        });
      }).toThrow(); // Should throw because series doesn't exist
    });
  });
});