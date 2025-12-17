'use client';

import React, { useEffect, useState } from 'react';

interface AdminUser {
  _id: string;
  email: string;
  name?: string;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  isBlocked?: boolean;
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  roles?: string[];
  usage?: {
    dailyGenerations?: number;
    dailyReuses?: number;
  };
}

interface UserFormValues {
  name: string;
  email: string;
  password?: string;
  subscriptionTier: string;
  isBlocked: boolean;
  emailVerified: boolean;
}

const TIER_OPTIONS = [
  { value: 'free', label: '免费' },
  { value: 'pro', label: '专业版' },
];

const formatDateTime = (value?: string) => {
  if (!value) return '--';
  try {
    return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
};

const formatDate = (value?: string) => {
  if (!value) return '--';
  try {
    return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value;
  }
};

export function UserManagementPanel() {
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [formState, setFormState] = useState({ open: false, mode: 'create' as 'create' | 'edit', user: null as AdminUser | null });

  useEffect(() => {
    let cancelled = false;

    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
        });
        if (query) params.set('search', query);
        if (statusFilter !== 'all') params.set('status', statusFilter);

        const response = await fetch(`/api/admin/users?${params.toString()}`, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || '加载用户列表失败');
        }
        if (cancelled) return;
        setUsers(data.data.items || []);
        setTotal(data.data.total || 0);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load users', err);
        setError(err instanceof Error ? err.message : '加载用户列表失败');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchUsers();
    return () => {
      cancelled = true;
    };
  }, [page, query, statusFilter, refreshIndex, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  };

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(event.target.value as 'all' | 'active' | 'blocked');
    setPage(1);
  };

  const refreshUsers = () => setRefreshIndex(prev => prev + 1);

  const handleSelectUser = async (user: AdminUser) => {
    setSelectedUser(user);
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${user._id}`, { cache: 'no-store' });
      const data = await response.json();
      if (response.ok && data?.data) {
        setSelectedUser(data.data);
      }
    } catch (err) {
      console.error('Failed to load user detail', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-alert
      const confirmed = window.confirm('确认删除该用户？此操作不可恢复。');
      if (!confirmed) return;
    }
    try {
      const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || '删除用户失败');
      }
      if (selectedUser?._id === userId) {
        setSelectedUser(null);
      }
      refreshUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除用户失败');
    }
  };

  const handleToggleStatus = async (user: AdminUser) => {
    try {
      const response = await fetch(`/api/admin/users/${user._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBlocked: !user.isBlocked }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || '更新状态失败');
      }
      const updatedUser = data?.data;
      if (selectedUser && updatedUser && selectedUser._id === updatedUser._id) {
        setSelectedUser(updatedUser);
      }
      refreshUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新状态失败');
    }
  };

  const handleOpenCreate = () => {
    setFormState({ open: true, mode: 'create', user: null });
  };

  const handleOpenEdit = (user: AdminUser) => {
    setFormState({ open: true, mode: 'edit', user });
  };

  const handleFormSubmit = async (values: UserFormValues) => {
    const isEdit = formState.mode === 'edit' && formState.user;
    const endpoint = isEdit ? `/api/admin/users/${formState.user?._id}` : '/api/admin/users';
    const method = isEdit ? 'PATCH' : 'POST';
    const body: Record<string, any> = {
      name: values.name,
      email: values.email,
      subscriptionTier: values.subscriptionTier,
      isBlocked: values.isBlocked,
      emailVerified: values.emailVerified,
    };
    if (!isEdit || values.password) {
      body.password = values.password;
    }

    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || '保存用户失败');
    }

    const updatedUser = data?.data;

    setFormState({ open: false, mode: 'create', user: null });
    if (selectedUser && updatedUser && selectedUser._id === updatedUser._id) {
      setSelectedUser(updatedUser);
    }
    refreshUsers();
  };

  const clearSelection = () => setSelectedUser(null);

  const renderTableBody = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={6} className="py-8 text-center text-sm text-gray-500">
            正在加载用户列表...
          </td>
        </tr>
      );
    }

    if (error) {
      return (
        <tr>
          <td colSpan={6} className="py-6 text-center text-sm text-red-600">
            {error}
          </td>
        </tr>
      );
    }

    if (users.length === 0) {
      return (
        <tr>
          <td colSpan={6} className="py-6 text-center text-sm text-gray-500">
            暂无用户记录
          </td>
        </tr>
      );
    }

    return users.map(user => (
      <tr key={user._id} className="border-b border-gray-100 last:border-0">
        <td className="px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">{user.name || '—'}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
            {user.subscriptionTier || 'free'}
          </span>
        </td>
        <td className="px-4 py-3 text-sm">
          {user.isBlocked ? (
            <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">禁用</span>
          ) : (
            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">启用</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(user.createdAt)}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(user.lastLoginAt)}</td>
        <td className="px-4 py-3 text-right text-sm font-medium space-x-2">
          <button className="text-indigo-600 hover:underline" onClick={() => handleSelectUser(user)}>详情</button>
          <button className="text-gray-600 hover:underline" onClick={() => handleOpenEdit(user)}>编辑</button>
          <button className="text-rose-600 hover:underline" onClick={() => handleDeleteUser(user._id)}>删除</button>
          <button className="text-xs text-gray-500 hover:text-gray-700" onClick={() => handleToggleStatus(user)}>
            {user.isBlocked ? '启用' : '禁用'}
          </button>
        </td>
      </tr>
    ));
  };

  return (
    <section className="bg-white border border-gray-100 rounded-2xl shadow-sm">
      <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">用户管理</h2>
          <p className="text-sm text-gray-500">搜索、筛选并维护平台用户</p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <form onSubmit={handleSearchSubmit} className="flex items-center">
            <input
              type="text"
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              placeholder="搜索邮箱或姓名"
              className="w-full rounded-l-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 md:w-64"
            />
            <button type="submit" className="rounded-r-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
              搜索
            </button>
          </form>
          <select
            value={statusFilter}
            onChange={handleStatusChange}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="all">全部状态</option>
            <option value="active">启用</option>
            <option value="blocked">禁用</option>
          </select>
          <button
            onClick={handleOpenCreate}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-gray-800"
          >
            新增用户
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">用户信息</th>
              <th className="px-4 py-3">套餐</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">注册时间</th>
              <th className="px-4 py-3">最近登录</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white">{renderTableBody()}</tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 text-sm text-gray-600">
        <p>
          第 {page} / {totalPages} 页，共 {total} 人
        </p>
        <div className="space-x-2">
          <button
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            disabled={page === 1}
            className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-50"
          >
            上一页
          </button>
          <button
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      </div>

      {selectedUser && (
        <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">用户详情</h3>
              <p className="text-sm text-gray-500">{selectedUser.email}</p>
            </div>
            <button onClick={clearSelection} className="text-sm text-gray-500 hover:text-gray-700">关闭</button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-gray-600 md:grid-cols-2">
            <div>
              <p className="text-gray-500">用户名称</p>
              <p className="font-medium text-gray-900">{selectedUser.name || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">状态</p>
              <p className="font-medium text-gray-900">{selectedUser.isBlocked ? '禁用' : '启用'}</p>
            </div>
            <div>
              <p className="text-gray-500">套餐等级</p>
              <p className="font-medium text-gray-900">{selectedUser.subscriptionTier || 'free'}</p>
            </div>
            <div>
              <p className="text-gray-500">邮箱验证</p>
              <p className="font-medium text-gray-900">{selectedUser.emailVerified ? '已验证' : '未验证'}</p>
            </div>
            <div>
              <p className="text-gray-500">注册时间</p>
              <p className="font-medium text-gray-900">{formatDateTime(selectedUser.createdAt)}</p>
            </div>
            <div>
              <p className="text-gray-500">最近登录</p>
              <p className="font-medium text-gray-900">{detailLoading ? '加载中...' : formatDateTime(selectedUser.lastLoginAt)}</p>
            </div>
          </div>
        </div>
      )}

      <UserFormModal
        open={formState.open}
        mode={formState.mode}
        initialValues={formState.user}
        onClose={() => setFormState({ open: false, mode: 'create', user: null })}
        onSubmit={handleFormSubmit}
      />
    </section>
  );
}

interface UserFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues: AdminUser | null;
  onClose: () => void;
  onSubmit: (values: UserFormValues) => Promise<void>;
}

function UserFormModal({ open, mode, initialValues, onClose, onSubmit }: UserFormModalProps) {
  const [formValues, setFormValues] = useState<UserFormValues>({
    name: initialValues?.name || '',
    email: initialValues?.email || '',
    subscriptionTier: initialValues?.subscriptionTier || 'free',
    isBlocked: initialValues?.isBlocked || false,
    emailVerified: initialValues?.emailVerified || false,
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormValues({
        name: initialValues?.name || '',
        email: initialValues?.email || '',
        subscriptionTier: initialValues?.subscriptionTier || 'free',
        isBlocked: initialValues?.isBlocked || false,
        emailVerified: initialValues?.emailVerified || false,
        password: '',
      });
      setError(null);
    }
  }, [initialValues, open]);

  if (!open) return null;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = event.target;
    const { name, value, type } = target;
    const nextValue = type === 'checkbox' && target instanceof HTMLInputElement
      ? target.checked
      : value;
    setFormValues(prev => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!formValues.email.trim()) {
      setError('请输入邮箱');
      return;
    }

    if (mode === 'create' && !formValues.password) {
      setError('请设置初始密码');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(formValues);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {mode === 'create' ? '新增用户' : '编辑用户'}
            </h3>
            <p className="text-sm text-gray-500">填写基础信息即可完成 {mode === 'create' ? '创建' : '更新'}</p>
          </div>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">关闭</button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          <div>
            <label className="text-sm font-medium text-gray-700">姓名</label>
            <input
              name="name"
              type="text"
              value={formValues.name}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="可选"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">邮箱</label>
            <input
              name="email"
              type="email"
              value={formValues.email}
              onChange={handleChange}
              disabled={mode === 'edit'}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">密码{mode === 'edit' && '（如需重置）'}</label>
            <input
              name="password"
              type="password"
              value={formValues.password}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder={mode === 'create' ? '至少6位密码' : '留空表示保持不变'}
            />
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
            <div className="md:flex md:items-center md:gap-3">
              <label className="text-sm font-medium text-gray-700 md:mb-0">套餐等级</label>
              <select
                name="subscriptionTier"
                value={formValues.subscriptionTier}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 md:mt-0 md:min-w-[160px]"
              >
                {TIER_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-4 md:self-center">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="isBlocked"
                  checked={formValues.isBlocked}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-indigo-600"
                />
                禁用账号
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="emailVerified"
                  checked={formValues.emailVerified}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-indigo-600"
                />
                邮箱已验证
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700">
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
