import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchBar from '@/components/square/SearchBar';
import { SearchSuggestion } from '@/types/square';

const mockSuggestions: SearchSuggestion[] = [
  { type: 'knowledge_point', value: '两位数加法', count: 5 },
  { type: 'title', value: '数学加法教学', count: 3 },
  { type: 'author', value: '张老师', count: 8 },
  { type: 'tag', value: '数学', count: 12 }
];

describe('SearchBar', () => {
  const mockProps = {
    onSearch: jest.fn(),
    onSuggestionClick: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input with placeholder', () => {
    render(<SearchBar {...mockProps} />);
    
    const input = screen.getByPlaceholderText('搜索知识点、标题或作者...');
    expect(input).toBeInTheDocument();
  });

  it('updates input value when typing', () => {
    render(<SearchBar {...mockProps} />);
    
    const input = screen.getByPlaceholderText('搜索知识点、标题或作者...');
    fireEvent.change(input, { target: { value: '数学' } });
    
    expect(input).toHaveValue('数学');
  });

  it('calls onSearch when form is submitted', () => {
    render(<SearchBar {...mockProps} />);
    
    const input = screen.getByPlaceholderText('搜索知识点、标题或作者...');
    fireEvent.change(input, { target: { value: '数学' } });
    fireEvent.submit(input.closest('form')!);
    
    expect(mockProps.onSearch).toHaveBeenCalledWith('数学');
  });

  it('calls onSearch when Enter key is pressed', () => {
    render(<SearchBar {...mockProps} />);
    
    const input = screen.getByPlaceholderText('搜索知识点、标题或作者...');
    fireEvent.change(input, { target: { value: '数学' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(mockProps.onSearch).toHaveBeenCalledWith('数学');
  });

  it('shows suggestions when input has value and suggestions are provided', () => {
    render(<SearchBar {...mockProps} suggestions={mockSuggestions} />);
    
    const input = screen.getByPlaceholderText('搜索知识点、标题或作者...');
    fireEvent.change(input, { target: { value: '数学' } });
    fireEvent.focus(input);
    
    expect(screen.getByText('两位数加法')).toBeInTheDocument();
    expect(screen.getByText('数学加法教学')).toBeInTheDocument();
    expect(screen.getByText('张老师')).toBeInTheDocument();
  });

  it('calls onSuggestionClick when suggestion is clicked', () => {
    render(<SearchBar {...mockProps} suggestions={mockSuggestions} />);
    
    const input = screen.getByPlaceholderText('搜索知识点、标题或作者...');
    fireEvent.change(input, { target: { value: '数学' } });
    fireEvent.focus(input);
    
    const suggestion = screen.getByText('两位数加法');
    fireEvent.click(suggestion);
    
    expect(mockProps.onSuggestionClick).toHaveBeenCalledWith(mockSuggestions[0]);
  });

  it('navigates suggestions with arrow keys', () => {
    render(<SearchBar {...mockProps} suggestions={mockSuggestions} />);
    
    const input = screen.getByPlaceholderText('搜索知识点、标题或作者...');
    fireEvent.change(input, { target: { value: '数学' } });
    fireEvent.focus(input);
    
    // Navigate down
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    
    // Press Enter to select
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(mockProps.onSuggestionClick).toHaveBeenCalledWith(mockSuggestions[1]);
  });

  it('clears search when clear button is clicked', () => {
    render(<SearchBar {...mockProps} value="数学" />);
    
    const clearButton = screen.getByRole('button');
    fireEvent.click(clearButton);
    
    expect(mockProps.onSearch).toHaveBeenCalledWith('');
  });

  it('shows loading spinner when loading prop is true', () => {
    render(<SearchBar {...mockProps} loading={true} />);
    
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('hides suggestions when Escape key is pressed', () => {
    render(<SearchBar {...mockProps} suggestions={mockSuggestions} />);
    
    const input = screen.getByPlaceholderText('搜索知识点、标题或作者...');
    fireEvent.change(input, { target: { value: '数学' } });
    fireEvent.focus(input);
    
    expect(screen.getByText('两位数加法')).toBeInTheDocument();
    
    fireEvent.keyDown(input, { key: 'Escape' });
    
    expect(screen.queryByText('两位数加法')).not.toBeInTheDocument();
  });

  it('displays suggestion type labels correctly', () => {
    render(<SearchBar {...mockProps} suggestions={mockSuggestions} />);
    
    const input = screen.getByPlaceholderText('搜索知识点、标题或作者...');
    fireEvent.change(input, { target: { value: '数学' } });
    fireEvent.focus(input);
    
    expect(screen.getByText('知识点')).toBeInTheDocument();
    expect(screen.getByText('标题')).toBeInTheDocument();
    expect(screen.getByText('作者')).toBeInTheDocument();
    expect(screen.getByText('标签')).toBeInTheDocument();
  });

  it('displays suggestion counts correctly', () => {
    render(<SearchBar {...mockProps} suggestions={mockSuggestions} />);
    
    const input = screen.getByPlaceholderText('搜索知识点、标题或作者...');
    fireEvent.change(input, { target: { value: '数学' } });
    fireEvent.focus(input);
    
    expect(screen.getByText('5 个作品')).toBeInTheDocument();
    expect(screen.getByText('3 个作品')).toBeInTheDocument();
    expect(screen.getByText('8 个作品')).toBeInTheDocument();
    expect(screen.getByText('12 个作品')).toBeInTheDocument();
  });
});