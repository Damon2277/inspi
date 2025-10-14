'use client';

import {
  EyeIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import React, { useState, useEffect } from 'react';

// 类型定义
interface InviteCode {
  id: string;
  code: string;
  inviterName: string;
  inviterEmail: string;
  createdAt: Date;
  usageCount: number;
  maxUsage: number | null;
  isActive: boolean;
  expiresAt: Date | null;
}

interface InviteFilters {
  search: string;
  status: 'all' | 'active' | 'inactive' | 'expired';
  sortBy: 'createdAt' | 'usageCount' | 'code';
  sortOrder: 'asc' | 'desc';
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalPages: number;
  totalCount: number;
}

export function InviteManagement() {
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [filters, setFilters] = useState<InviteFilters>({
    search: '',
    status: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    totalPages: 1,
    totalCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载邀请码数据
  useEffect(() => {
    loadInvites();
  }, [filters, pagination.page]);

  const loadInvites = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 800));

      // 模拟数据
      const mockInvites: InviteCode[] = [
        {
          id: '1',
          code: 'INVITE2024001',
          inviterName: '张三',
          inviterEmail: 'zhangsan@example.com',
          createdAt: new Date('2024-01-15'),
          usageCount: 3,
          maxUsage: 5,
          isActive: true,
          expiresAt: new Date('2024-12-31'),
        },
        {
          id: '2',
          code: 'INVITE2024002',
          inviterName: '李四',
          inviterEmail: 'lisi@example.com',
          createdAt: new Date('2024-01-10'),
          usageCount: 1,
          maxUsage: 3,
          isActive: true,
          expiresAt: null,
        },
        {
          id: '3',
          code: 'INVITE2024003',
          inviterName: '王五',
          inviterEmail: 'wangwu@example.com',
          createdAt: new Date('2024-01-05'),
          usageCount: 5,
          maxUsage: 5,
          isActive: false,
          expiresAt: new Date('2024-06-30'),
        },
      ];

      // 应用过滤器
      let filteredInvites = mockInvites;

      if (filters.search) {
        filteredInvites = filteredInvites.filter(invite =>
          invite.code.toLowerCase().includes(filters.search.toLowerCase()) ||
          invite.inviterName.toLowerCase().includes(filters.search.toLowerCase()) ||
          invite.inviterEmail.toLowerCase().includes(filters.search.toLowerCase()),
        );
      }

      if (filters.status !== 'all') {
        filteredInvites = filteredInvites.filter(invite => {
          switch (filters.status) {
            case 'active':
              return invite.isActive && (!invite.expiresAt || invite.expiresAt > new Date());
            case 'inactive':
              return !invite.isActive;
            case 'expired':
              return invite.expiresAt && invite.expiresAt <= new Date();
            default:
              return true;
          }
        });
      }

      setInvites(filteredInvites);
      const newPagination = {
        ...pagination,
        totalCount: filteredInvites.length,
        totalPages: Math.ceil(filteredInvites.length / pagination.limit),
      };
      setPagination(newPagination);

    } catch (err) {
      console.error('加载邀请码失败:', err);
      setError('加载邀请码失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value });
    setPagination({ ...pagination, page: 1 });
  };

  // 处理状态过滤
  const handleStatusFilter = (status: InviteFilters['status']) => {
    setFilters({ ...filters, status });
    setPagination({ ...pagination, page: 1 });
  };

  // 处理页面切换
  const handlePageChange = (page: number) => {
    setPagination({ ...pagination, page });
  };

  // 格式化日期
  const formatDate = (date: Date | null) => {
    if (!date) return '永不过期';
    return date.toLocaleDateString('zh-CN');
  };

  // 获取状态标签
  const getStatusBadge = (invite: InviteCode) => {
    if (!invite.isActive) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">已停用</span>;
    }
    if (invite.expiresAt && invite.expiresAt <= new Date()) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">已过期</span>;
    }
    if (invite.maxUsage && invite.usageCount >= invite.maxUsage) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">已用完</span>;
    }
    return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">活跃</span>;
  };

  // 计算使用率
  const getUsagePercentage = (invite: InviteCode) => {
    if (!invite.maxUsage) return 0;
    return Math.min((invite.usageCount / invite.maxUsage) * 100, 100);
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500">
          <p className="text-lg font-medium">加载失败</p>
          <p className="mt-1">{error}</p>
          <button
            onClick={loadInvites}
            className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* 头部 */}
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              邀请码管理
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              管理和监控所有邀请码的使用情况
            </p>
          </div>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors flex items-center">
            <PlusIcon className="h-4 w-4 mr-2" />
            创建邀请码
          </button>
        </div>
      </div>

      {/* 过滤器 */}
      <div className="px-4 py-4 sm:px-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
          {/* 搜索框 */}
          <div className="flex-1 min-w-0">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="搜索邀请码、邀请人姓名或邮箱..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>

          {/* 状态过滤 */}
          <div className="flex space-x-2">
            {[
              { key: 'all', label: '全部' },
              { key: 'active', label: '活跃' },
              { key: 'inactive', label: '已停用' },
              { key: 'expired', label: '已过期' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleStatusFilter(key as InviteFilters['status'])}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  filters.status === key
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 表格 */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-500">加载邀请码中...</p>
        </div>
      ) : invites.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  邀请码
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  邀请人
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  使用情况
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  过期时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invites.map((invite) => (
                <tr key={invite.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {invite.code}
                    </div>
                    <div className="text-sm text-gray-500">
                      创建于 {formatDate(invite.createdAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {invite.inviterName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {invite.inviterEmail}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {invite.usageCount} / {invite.maxUsage || '无限制'}
                    </div>
                    {invite.maxUsage && (
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${getUsagePercentage(invite)}%` }}
                        ></div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(invite)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(invite.expiresAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button className="text-gray-600 hover:text-gray-900">
                      编辑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">没有找到邀请码</p>
        </div>
      )}

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  显示第 <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> 到{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.totalCount)}
                  </span>{' '}
                  条，共 <span className="font-medium">{pagination.totalCount}</span> 条记录
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === pagination.page
                          ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
