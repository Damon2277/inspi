'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  AdminOrder,
  AdminOrderPaymentMethod,
  AdminOrderStatus,
  OrderSummary,
} from '@/lib/admin/orders';

const currencyFormatter = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' });
const numberFormatter = new Intl.NumberFormat('zh-CN');
const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
const dateFormatter = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' });

const statusMap: Record<AdminOrderStatus, { label: string; color: string; bg: string }> = {
  pending: { label: '待支付', color: 'text-amber-700', bg: 'bg-amber-50' },
  processing: { label: '处理中', color: 'text-blue-600', bg: 'bg-blue-50' },
  completed: { label: '已完成', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  failed: { label: '失败', color: 'text-rose-600', bg: 'bg-rose-50' },
  refunded: { label: '已退款', color: 'text-purple-700', bg: 'bg-purple-50' },
  cancelled: { label: '已取消', color: 'text-gray-600', bg: 'bg-gray-100' },
};

const paymentMethodLabel: Record<AdminOrderPaymentMethod, string> = {
  wechat_pay: '微信支付',
  alipay: '支付宝',
};

interface BannerState {
  type: 'success' | 'error';
  message: string;
}

interface DateRangeState {
  start: string;
  end: string;
}

export function OrderManagementPanel() {
  const pageSize = 6;
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | AdminOrderStatus>('all');
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeState>({ start: '', end: '' });
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const dismissBanner = () => setBanner(null);

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() });
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (query) params.set('search', query);
    if (dateRange.start) params.set('startDate', dateRange.start);
    if (dateRange.end) params.set('endDate', dateRange.end);
    return params.toString();
  }, [dateRange.end, dateRange.start, page, pageSize, query, statusFilter]);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const response = await fetch(`/api/admin/orders?${buildQueryString()}`, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || '加载订单失败');
        }
        if (!isActive) return;
        setOrders(data?.data?.items || []);
        setSummary(data?.data?.summary || null);
        setTotal(data?.data?.total || 0);
      } catch (err) {
        if (!isActive) return;
        console.error('Failed to fetch orders', err);
        setError(err instanceof Error ? err.message : '加载订单失败');
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isActive = false;
    };
  }, [buildQueryString, refreshIndex]);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setQuery(searchInput.trim());
    setPage(1);
  };

  const handleDateChange = (field: keyof DateRangeState, value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const handleSelectOrder = async (order: AdminOrder) => {
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`);
      const data = await response.json();
      if (response.ok && data?.data) {
        setSelectedOrder(data.data);
      } else {
        setSelectedOrder(order);
      }
    } catch (err) {
      console.error('Failed to load order detail', err);
      setSelectedOrder(order);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAction = async (action: 'mark_paid' | 'mark_refunded' | 'cancel') => {
    if (!selectedOrder) return;
    setActionLoading(true);
    setBanner(null);
    try {
      const response = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || '更新订单失败');
      }
      setSelectedOrder(data?.data || null);
      setBanner({ type: 'success', message: '订单状态已更新' });
      setRefreshIndex(prev => prev + 1);
    } catch (err) {
      console.error('Failed to mutate order', err);
      setBanner({ type: 'error', message: err instanceof Error ? err.message : '操作失败' });
    } finally {
      setActionLoading(false);
    }
  };

  const renderStatusBadge = (status: AdminOrderStatus) => {
    const style = statusMap[status];
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.color}`}>
        {style.label}
      </span>
    );
  };

  const summaryCards = useMemo(() => {
    if (!summary) return [];
    return [
      {
        label: '订单总数',
        value: summary.totalOrders,
        description: '全部历史订单',
      },
      {
        label: '本月收入',
        value: summary.revenueThisMonth,
        description: '已成功记账',
        currency: true,
      },
      {
        label: '待处理',
        value: summary.pendingOrders,
        description: '需要跟进',
      },
      {
        label: '退款/异常',
        value: summary.refundedOrders,
        description: '含人工退款',
      },
    ];
  }, [summary]);

  return (
    <section className="bg-white border border-gray-100 rounded-2xl shadow-sm">
      <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">订单管理</h2>
          <p className="text-sm text-gray-500">查看支付状态，人工处理异常订单</p>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <form onSubmit={handleSearchSubmit} className="flex rounded-lg border border-gray-200">
            <input
              type="text"
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              placeholder="搜索订单号 / 用户"
              className="w-full rounded-l-lg border-none px-3 py-2 text-sm focus:outline-none"
            />
            <button type="submit" className="rounded-r-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white">
              搜索
            </button>
          </form>
          <select
            value={statusFilter}
            onChange={event => {
              setStatusFilter(event.target.value as 'all' | AdminOrderStatus);
              setPage(1);
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
          >
            <option value="all">全部状态</option>
            <option value="pending">待支付</option>
            <option value="processing">处理中</option>
            <option value="completed">已完成</option>
            <option value="refunded">已退款</option>
            <option value="failed">失败</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 border-b border-gray-100 px-6 py-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map(card => (
          <div key={card.label} className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3">
            <p className="text-xs font-medium text-gray-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {card.currency ? currencyFormatter.format(card.value) : numberFormatter.format(card.value)}
            </p>
            <p className="text-xs text-gray-500">{card.description}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-4 md:flex-row md:items-center">
        <div className="flex flex-1 gap-3">
          <label className="flex flex-1 flex-col text-xs text-gray-500">
            起始日期
            <input
              type="date"
              value={dateRange.start}
              onChange={event => handleDateChange('start', event.target.value)}
              className="mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
            />
          </label>
          <label className="flex flex-1 flex-col text-xs text-gray-500">
            截止日期
            <input
              type="date"
              value={dateRange.end}
              onChange={event => handleDateChange('end', event.target.value)}
              className="mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
            />
          </label>
        </div>
        <button
          onClick={() => {
            setDateRange({ start: '', end: '' });
            setRefreshIndex(prev => prev + 1);
          }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600"
        >
          清除筛选
        </button>
      </div>

      {banner && (
        <div className={`mx-6 mt-4 rounded-lg border px-4 py-3 text-sm ${banner.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          <div className="flex items-center justify-between">
            <span>{banner.message}</span>
            <button className="text-xs underline" onClick={dismissBanner}>
              关闭
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">订单号 / 用户</th>
              <th className="px-4 py-3">套餐</th>
              <th className="px-4 py-3">金额</th>
              <th className="px-4 py-3">支付方式</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">创建时间</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                  正在加载订单...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                  暂无符合条件的订单
                </td>
              </tr>
            ) : (
              orders.map(order => (
                <tr key={order.id} className="border-b border-gray-100">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500">{order.user.name} · {order.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {order.planName}
                    <p className="text-xs text-gray-400">{order.planCycle === 'monthly' ? '月付' : '年付'}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    {currencyFormatter.format(order.amount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{paymentMethodLabel[order.paymentMethod] || order.paymentMethod}</td>
                  <td className="px-4 py-3 text-sm">{renderStatusBadge(order.status)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{dateTimeFormatter.format(new Date(order.createdAt))}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button className="text-indigo-600 hover:underline" onClick={() => handleSelectOrder(order)}>
                      查看
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 text-sm text-gray-600">
        <p>
          第 {page} / {totalPages} 页 · 共 {total} 笔
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

      {selectedOrder && (
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">订单详情</h3>
              <p className="text-sm text-gray-500">{selectedOrder.orderNumber}</p>
            </div>
            <button className="text-sm text-gray-500 hover:text-gray-700" onClick={() => setSelectedOrder(null)}>
              关闭
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl bg-white p-5 text-sm text-gray-600 md:grid-cols-2">
            <div>
              <p className="text-gray-500">用户</p>
              <p className="font-medium text-gray-900">{selectedOrder.user.name}</p>
              <p>{selectedOrder.user.email}</p>
            </div>
            <div>
              <p className="text-gray-500">金额</p>
              <p className="font-medium text-gray-900">{currencyFormatter.format(selectedOrder.amount)}</p>
              <p className="text-xs text-gray-500">{selectedOrder.planName} · {selectedOrder.planCycle === 'monthly' ? '月付' : '年付'}</p>
            </div>
            <div>
              <p className="text-gray-500">支付方式</p>
              <p className="font-medium text-gray-900">{paymentMethodLabel[selectedOrder.paymentMethod]}</p>
              <p className="text-xs text-gray-500">{selectedOrder.metadata.channel}</p>
            </div>
            <div>
              <p className="text-gray-500">状态</p>
              <p className="font-medium text-gray-900">{renderStatusBadge(selectedOrder.status)}</p>
              {selectedOrder.paidAt && <p className="text-xs text-gray-500">支付时间：{dateTimeFormatter.format(new Date(selectedOrder.paidAt))}</p>}
            </div>
            <div>
              <p className="text-gray-500">地区 / 设备</p>
              <p className="font-medium text-gray-900">{selectedOrder.metadata.region || '—'}</p>
              <p className="text-xs text-gray-500">{selectedOrder.metadata.device || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">发票</p>
              <p className="font-medium text-gray-900">{selectedOrder.invoiceNumber || '未申请'}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl bg-white p-5">
              <h4 className="text-sm font-semibold text-gray-900">支付时间线</h4>
              <ol className="mt-3 space-y-3">
                {selectedOrder.history.map(record => (
                  <li key={`${record.timestamp}-${record.status}`} className="rounded-lg border border-gray-100 px-3 py-2">
                    <p className="text-sm font-medium text-gray-900">{record.label}</p>
                    <p className="text-xs text-gray-500">{dateTimeFormatter.format(new Date(record.timestamp))} · {record.operator}</p>
                    {record.note && <p className="text-xs text-gray-400">{record.note}</p>}
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-xl bg-white p-5">
              <h4 className="text-sm font-semibold text-gray-900">备注 & 商品</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                {selectedOrder.items.map(item => (
                  <li key={item.name} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">数量 {item.quantity}</p>
                    </div>
                    <span className="text-gray-900">{currencyFormatter.format(item.price)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-2">
                {selectedOrder.notes.length === 0 && <p className="text-xs text-gray-400">暂无备注</p>}
                {selectedOrder.notes.map(note => (
                  <div key={`${note.operator}-${note.createdAt}`} className="rounded-lg border border-gray-100 px-3 py-2">
                    <p className="text-xs text-gray-500">{note.operator} · {dateFormatter.format(new Date(note.createdAt))}</p>
                    <p className="text-sm text-gray-900">{note.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {selectedOrder.status !== 'completed' && selectedOrder.status !== 'refunded' && (
              <button
                onClick={() => handleAction('mark_paid')}
                disabled={actionLoading}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                确认收款
              </button>
            )}
            {selectedOrder.status !== 'refunded' && selectedOrder.status !== 'cancelled' && (
              <button
                onClick={() => handleAction('mark_refunded')}
                disabled={actionLoading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
              >
                标记退款
              </button>
            )}
            {(selectedOrder.status === 'pending' || selectedOrder.status === 'processing') && (
              <button
                onClick={() => handleAction('cancel')}
                disabled={actionLoading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
              >
                取消订单
              </button>
            )}
            {detailLoading && <span className="text-xs text-gray-500">刷新详情...</span>}
          </div>
        </div>
      )}
    </section>
  );
}
