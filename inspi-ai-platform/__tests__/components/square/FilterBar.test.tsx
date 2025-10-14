import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import '@testing-library/jest-dom';
import FilterBar from '@/components/square/FilterBar';
import { FilterOptions } from '@/types/square';

const mockFilters: FilterOptions = {
  subjects: [
    { value: 'math', label: '数学', count: 10 },
    { value: 'chinese', label: '语文', count: 8 },
    { value: 'english', label: '英语', count: 6 },
  ],
  gradeLevels: [
    { value: 'grade1', label: '小学一年级', count: 5 },
    { value: 'grade2', label: '小学二年级', count: 7 },
    { value: 'grade3', label: '小学三年级', count: 4 },
  ],
  sortOptions: [
    { value: 'latest', label: '最新发布' },
    { value: 'popular', label: '最受欢迎' },
    { value: 'reuse_count', label: '复用最多' },
  ],
};

describe('FilterBar', () => {
  const mockProps = {
    filters: mockFilters,
    onSubjectChange: jest.fn(),
    onGradeLevelChange: jest.fn(),
    onSortChange: jest.fn(),
    onReset: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders filter button and sort dropdown', () => {
    render(<FilterBar {...mockProps} />);

    expect(screen.getByText('筛选')).toBeInTheDocument();
    expect(screen.getByDisplayValue('最新发布')).toBeInTheDocument();
  });

  it('expands filter panel when filter button is clicked', () => {
    render(<FilterBar {...mockProps} />);

    const filterButton = screen.getByText('筛选');
    fireEvent.click(filterButton);

    expect(screen.getByText('学科')).toBeInTheDocument();
    expect(screen.getByText('学段')).toBeInTheDocument();
  });

  it('displays subject filters correctly', () => {
    render(<FilterBar {...mockProps} />);

    const filterButton = screen.getByText('筛选');
    fireEvent.click(filterButton);

    expect(screen.getByText('数学')).toBeInTheDocument();
    expect(screen.getByText('(10)')).toBeInTheDocument();
    expect(screen.getByText('语文')).toBeInTheDocument();
    expect(screen.getByText('(8)')).toBeInTheDocument();
  });

  it('calls onSubjectChange when subject is clicked', () => {
    render(<FilterBar {...mockProps} />);

    const filterButton = screen.getByText('筛选');
    fireEvent.click(filterButton);

    const mathButton = screen.getByText('数学');
    fireEvent.click(mathButton);

    expect(mockProps.onSubjectChange).toHaveBeenCalledWith('math');
  });

  it('calls onGradeLevelChange when grade level is clicked', () => {
    render(<FilterBar {...mockProps} />);

    const filterButton = screen.getByText('筛选');
    fireEvent.click(filterButton);

    const gradeButton = screen.getByText('小学一年级');
    fireEvent.click(gradeButton);

    expect(mockProps.onGradeLevelChange).toHaveBeenCalledWith('grade1');
  });

  it('calls onSortChange when sort option is changed', () => {
    render(<FilterBar {...mockProps} />);

    const sortSelect = screen.getByDisplayValue('最新发布');
    fireEvent.change(sortSelect, { target: { value: 'popular' } });

    expect(mockProps.onSortChange).toHaveBeenCalledWith('popular');
  });

  it('shows active filter indicators', () => {
    render(
      <FilterBar
        {...mockProps}
        selectedSubject="math"
        selectedGradeLevel="grade1"
      />,
    );

    expect(screen.getByText('学科: math')).toBeInTheDocument();
    expect(screen.getByText('学段: grade1')).toBeInTheDocument();
  });

  it('shows reset button when filters are active', () => {
    render(
      <FilterBar
        {...mockProps}
        selectedSubject="math"
      />,
    );

    expect(screen.getByText('清除筛选')).toBeInTheDocument();
  });

  it('calls onReset when reset button is clicked', () => {
    render(
      <FilterBar
        {...mockProps}
        selectedSubject="math"
      />,
    );

    const resetButton = screen.getByText('清除筛选');
    fireEvent.click(resetButton);

    expect(mockProps.onReset).toHaveBeenCalled();
  });

  it('highlights selected filters', () => {
    render(
      <FilterBar
        {...mockProps}
        selectedSubject="math"
      />,
    );

    const filterButton = screen.getByText('筛选');
    fireEvent.click(filterButton);

    const mathButton = screen.getByText('数学');
    expect(mathButton).toHaveClass('bg-indigo-100', 'text-indigo-800');
  });

  it('shows filter count badge when filters are active', () => {
    render(
      <FilterBar
        {...mockProps}
        selectedSubject="math"
        selectedGradeLevel="grade1"
      />,
    );

    const badge = screen.getByText('2');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-indigo-600');
  });
});
