/**
 * 贡献度趋势图表组件
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';

interface ContributionChartProps {
  userId: string;
  className?: string;
  period?: 'daily' | 'weekly' | 'monthly';
}

interface ChartData {
  date: string;
  points: number;
  cumulative: number;
}

const ContributionChart: React.FC<ContributionChartProps> = ({
  userId,
  className = '',
  period = 'weekly'
}) => {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 模拟数据生成（实际应该从API获取）
  const generateMockData = () => {
    const days = period === 'daily' ? 7 : period === 'weekly' ? 4 : 12;
    const mockData: ChartData[] = [];
    let cumulative = 0;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const points = Math.floor(Math.random() * 50) + 10;
      cumulative += points;
      
      mockData.push({
        date: date.toISOString().split('T')[0],
        points,
        cumulative
      });
    }

    return mockData;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // TODO: 实际的API调用
        // const response = await fetch(`/api/contribution/trends?userId=${userId}&period=${period}`);
        // const result = await response.json();
        
        // 模拟API延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockData = generateMockData();
        setData(mockData);
      } catch (err) {
        console.error('获取趋势数据失败:', err);
        setError(err instanceof Error ? err.message : '获取趋势数据失败');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }
  }, [userId, period]);

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 计算数据范围
    const maxPoints = Math.max(...data.map(d => d.points));
    const maxCumulative = Math.max(...data.map(d => d.cumulative));

    // 绘制背景网格
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    
    // 垂直网格线
    for (let i = 0; i <= data.length; i++) {
      const x = padding + (i * chartWidth) / data.length;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // 水平网格线
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i * chartHeight) / 5;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // 绘制每日积分柱状图
    ctx.fillStyle = '#3B82F6';
    data.forEach((point, index) => {
      const x = padding + (index * chartWidth) / data.length;
      const barWidth = chartWidth / data.length * 0.6;
      const barHeight = (point.points / maxPoints) * chartHeight;
      const y = height - padding - barHeight;

      ctx.fillRect(x + barWidth * 0.2, y, barWidth, barHeight);
    });

    // 绘制累积积分折线图
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 3;
    ctx.beginPath();

    data.forEach((point, index) => {
      const x = padding + (index * chartWidth) / data.length + (chartWidth / data.length) / 2;
      const y = height - padding - (point.cumulative / maxCumulative) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // 绘制累积积分数据点
    ctx.fillStyle = '#10B981';
    data.forEach((point, index) => {
      const x = padding + (index * chartWidth) / data.length + (chartWidth / data.length) / 2;
      const y = height - padding - (point.cumulative / maxCumulative) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // 绘制坐标轴标签
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';

    // X轴标签（日期）
    data.forEach((point, index) => {
      const x = padding + (index * chartWidth) / data.length + (chartWidth / data.length) / 2;
      const date = new Date(point.date);
      const label = `${date.getMonth() + 1}/${date.getDate()}`;
      ctx.fillText(label, x, height - 10);
    });

    // Y轴标签
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i * chartHeight) / 5;
      const value = Math.round((maxPoints * (5 - i)) / 5);
      ctx.fillText(value.toString(), padding - 10, y + 4);
    }
  };

  useEffect(() => {
    if (!loading && data.length > 0) {
      drawChart();
    }
  }, [data, loading]);

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-red-500 text-xl mr-3">⚠️</div>
              <div>
                <h3 className="text-red-800 font-medium">加载失败</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">贡献度趋势</h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
              <span className="text-gray-600">每日积分</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-2 bg-green-500 rounded mr-2"></div>
              <span className="text-gray-600">累积积分</span>
            </div>
          </div>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={300}
            className="w-full h-auto border border-gray-200 rounded"
          />
        </div>

        {data.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-semibold text-blue-600">
                {data[data.length - 1]?.points || 0}
              </div>
              <div className="text-sm text-blue-700">最近积分</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-semibold text-green-600">
                {data[data.length - 1]?.cumulative || 0}
              </div>
              <div className="text-sm text-green-700">累积积分</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="text-lg font-semibold text-purple-600">
                {Math.round(data.reduce((sum, d) => sum + d.points, 0) / data.length)}
              </div>
              <div className="text-sm text-purple-700">平均积分</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContributionChart;