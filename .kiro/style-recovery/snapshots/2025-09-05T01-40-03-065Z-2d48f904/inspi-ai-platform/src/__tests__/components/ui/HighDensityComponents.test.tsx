import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  HighDensityGrid, 
  CompactCard, 
  DenseTable, 
  DenseList,
  VisualWeight,
  SectionDivider,
  ContentHierarchy,
  HighlightBox
} from '@/components/ui';

// Mock useResponsive hook
jest.mock('@/hooks/useResponsive', () => ({
  useResponsive: () => ({
    isDesktop: true,
    isWide: false,
    isTablet: false,
    isMobile: false
  })
}));

describe('高密度布局组件', () => {
  describe('HighDensityGrid', () => {
    it('应该正确渲染子元素', () => {
      render(
        <HighDensityGrid>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </HighDensityGrid>
      );
      
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });
  });

  describe('CompactCard', () => {
    it('应该显示标题和描述', () => {
      render(
        <CompactCard
          title="测试标题"
          description="测试描述"
          preview="测试预览内容"
        />
      );
      
      expect(screen.getByText('测试标题')).toBeInTheDocument();
      expect(screen.getByText('测试描述')).toBeInTheDocument();
      expect(screen.getByText('测试预览内容')).toBeInTheDocument();
    });
  });

  describe('DenseTable', () => {
    const mockData = [
      { id: 1, name: '项目1', status: '进行中' },
      { id: 2, name: '项目2', status: '已完成' }
    ];

    const mockColumns = [
      { key: 'name' as const, title: '名称' },
      { key: 'status' as const, title: '状态' }
    ];

    it('应该显示表格数据', () => {
      render(
        <DenseTable
          data={mockData}
          columns={mockColumns}
        />
      );
      
      expect(screen.getByText('名称')).toBeInTheDocument();
      expect(screen.getByText('状态')).toBeInTheDocument();
      expect(screen.getByText('项目1')).toBeInTheDocument();
      expect(screen.getByText('进行中')).toBeInTheDocument();
    });
  });

  describe('DenseList', () => {
    const mockData = ['项目1', '项目2', '项目3'];

    it('应该渲染列表项', () => {
      render(
        <DenseList
          data={mockData}
          renderItem={(item) => <div>{item}</div>}
        />
      );
      
      expect(screen.getByText('项目1')).toBeInTheDocument();
      expect(screen.getByText('项目2')).toBeInTheDocument();
      expect(screen.getByText('项目3')).toBeInTheDocument();
    });
  });
});

describe('视觉层次组件', () => {
  describe('VisualWeight', () => {
    it('应该应用正确的权重样式', () => {
      render(
        <VisualWeight weight="primary">
          主要内容
        </VisualWeight>
      );
      
      const element = screen.getByText('主要内容');
      expect(element).toHaveClass('visual-weight-primary');
    });
  });

  describe('SectionDivider', () => {
    it('应该渲染分割线', () => {
      render(<SectionDivider type="line" />);
      
      const divider = document.querySelector('.section-divider');
      expect(divider).toBeInTheDocument();
    });

    it('应该显示标签', () => {
      render(<SectionDivider type="line" label="测试标签" />);
      
      expect(screen.getByText('测试标签')).toBeInTheDocument();
    });
  });

  describe('ContentHierarchy', () => {
    it('应该渲染子元素', () => {
      render(
        <ContentHierarchy>
          <div>内容1</div>
          <div>内容2</div>
        </ContentHierarchy>
      );
      
      expect(screen.getByText('内容1')).toBeInTheDocument();
      expect(screen.getByText('内容2')).toBeInTheDocument();
    });
  });

  describe('HighlightBox', () => {
    it('应该显示突出显示的内容', () => {
      render(
        <HighlightBox variant="info" title="信息标题">
          信息内容
        </HighlightBox>
      );
      
      expect(screen.getByText('信息标题')).toBeInTheDocument();
      expect(screen.getByText('信息内容')).toBeInTheDocument();
    });
  });
});