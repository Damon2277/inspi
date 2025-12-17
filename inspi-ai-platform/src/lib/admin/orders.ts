import type { Currency } from '@/shared/types/subscription';

export type AdminOrderStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
export type AdminOrderPaymentMethod = 'wechat_pay' | 'alipay';
export type AdminOrderRisk = 'low' | 'medium' | 'high';

export interface AdminOrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface AdminOrderHistory {
  status: AdminOrderStatus;
  label: string;
  timestamp: string;
  operator: string;
  note?: string;
}

export interface AdminOrderNote {
  operator: string;
  message: string;
  createdAt: string;
}

export interface AdminOrderMetadata {
  region?: string;
  device?: string;
  coupon?: string;
  channel?: string;
}

export interface AdminOrderUser {
  id: string;
  name: string;
  email: string;
  company?: string;
  tier: string;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  user: AdminOrderUser;
  planName: string;
  planCycle: 'monthly' | 'yearly';
  amount: number;
  currency: Currency;
  paymentMethod: AdminOrderPaymentMethod;
  status: AdminOrderStatus;
  riskLevel: AdminOrderRisk;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  refundedAt?: string;
  invoiceNumber?: string;
  tags: string[];
  items: AdminOrderItem[];
  history: AdminOrderHistory[];
  notes: AdminOrderNote[];
  metadata: AdminOrderMetadata;
}

export interface OrderSummary {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  refundedOrders: number;
  revenueToday: number;
  revenueThisMonth: number;
  averageOrderValue: number;
  paymentBreakdown: Record<AdminOrderPaymentMethod, number>;
}

export interface OrderQueryOptions {
  page?: number;
  pageSize?: number;
  status?: AdminOrderStatus | 'all';
  method?: AdminOrderPaymentMethod | 'all';
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface OrderQueryResult {
  items: AdminOrder[];
  total: number;
  page: number;
  pageSize: number;
  summary: OrderSummary;
}

export interface OrderMutationInput {
  status?: AdminOrderStatus;
  note?: string;
  action?: 'mark_paid' | 'mark_refunded' | 'cancel';
  operator?: string;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const daysAgo = (days: number, hours = 0) => new Date(Date.now() - days * 86400000 + hours * 3600000).toISOString();
const currency: Currency = 'CNY';

const baseOrders: AdminOrder[] = [
  {
    id: 'order_1001',
    orderNumber: 'ORD-240115-AX8',
    user: { id: 'user_101', name: '李明', email: 'li.ming@example.com', company: '新芽设计', tier: 'pro' },
    planName: '专业版',
    planCycle: 'yearly',
    amount: 1299,
    currency,
    paymentMethod: 'wechat_pay',
    status: 'completed',
    riskLevel: 'low',
    createdAt: daysAgo(1, 5),
    updatedAt: daysAgo(1, 1),
    paidAt: daysAgo(1, 2),
    invoiceNumber: 'INV-2024-011',
    tags: ['年付', '自动续费'],
    items: [{ name: 'Pro 年度订阅', quantity: 1, price: 1299 }],
    history: [
      { status: 'pending', label: '创建订单', timestamp: daysAgo(1, 5), operator: '系统' },
      { status: 'completed', label: '支付完成 (微信)', timestamp: daysAgo(1, 2), operator: '微信支付' },
    ],
    notes: [
      { operator: '客服Yuki', message: '确认发票抬头信息无误', createdAt: daysAgo(1, 1) },
    ],
    metadata: { region: '上海', device: 'iOS', coupon: 'NY2024', channel: '官网' },
  },
  {
    id: 'order_1002',
    orderNumber: 'ORD-240116-KP2',
    user: { id: 'user_102', name: '王雪', email: 'snow.wang@example.com', company: '华北数造', tier: 'pro' },
    planName: '专业版',
    planCycle: 'monthly',
    amount: 129,
    currency,
    paymentMethod: 'wechat_pay',
    status: 'pending',
    riskLevel: 'medium',
    createdAt: daysAgo(0, 6),
    updatedAt: daysAgo(0, 6),
    tags: ['月付'],
    items: [{ name: 'Pro 月度订阅', quantity: 1, price: 129 }],
    history: [
      { status: 'pending', label: '等待支付', timestamp: daysAgo(0, 6), operator: '系统' },
    ],
    notes: [],
    metadata: { region: '北京', device: 'Android', channel: '官网' },
  },
  {
    id: 'order_1003',
    orderNumber: 'ORD-240111-BZ4',
    user: { id: 'user_103', name: '陈晨', email: 'chen.chen@example.com', company: '晨星科技', tier: 'basic' },
    planName: '基础版',
    planCycle: 'monthly',
    amount: 69,
    currency,
    paymentMethod: 'wechat_pay',
    status: 'refunded',
    riskLevel: 'low',
    createdAt: daysAgo(4, 3),
    updatedAt: daysAgo(2, 2),
    paidAt: daysAgo(4, 2),
    refundedAt: daysAgo(2, 2),
    tags: ['手动退款'],
    items: [{ name: 'Basic 月度订阅', quantity: 1, price: 69 }],
    history: [
      { status: 'pending', label: '创建订单', timestamp: daysAgo(4, 3), operator: '系统' },
      { status: 'completed', label: '付款完成', timestamp: daysAgo(4, 2), operator: '微信支付' },
      { status: 'refunded', label: '重复付款退款', timestamp: daysAgo(2, 2), operator: '运营' },
    ],
    notes: [
      { operator: '运营Max', message: '用户重复支付，已全额退款', createdAt: daysAgo(2, 2) },
    ],
    metadata: { region: '杭州', device: 'Windows', channel: '官网' },
  },
  {
    id: 'order_1004',
    orderNumber: 'ORD-240113-LM5',
    user: { id: 'user_104', name: '赵莉', email: 'lisa.zhao@example.com', company: '潮流品牌LAB', tier: 'basic' },
    planName: '基础版',
    planCycle: 'monthly',
    amount: 89,
    currency,
    paymentMethod: 'wechat_pay',
    status: 'completed',
    riskLevel: 'low',
    createdAt: daysAgo(2, 4),
    updatedAt: daysAgo(2, 1),
    paidAt: daysAgo(2, 2),
    tags: ['优惠券'],
    items: [{ name: 'Basic 月度订阅', quantity: 1, price: 89 }],
    history: [
      { status: 'pending', label: '创建订单', timestamp: daysAgo(2, 4), operator: '系统' },
      { status: 'completed', label: '支付完成', timestamp: daysAgo(2, 2), operator: '微信支付' },
    ],
    notes: [
      { operator: '客服Yuki', message: '已补发欢迎邮件', createdAt: daysAgo(2, 1) },
    ],
    metadata: { region: '广州', device: 'Mac', coupon: 'WINTER10', channel: '官网' },
  },
  {
    id: 'order_1005',
    orderNumber: 'ORD-240110-QD3',
    user: { id: 'user_105', name: '丁成', email: 'd.cheng@example.com', company: '迅合互动', tier: 'pro' },
    planName: '专业版',
    planCycle: 'monthly',
    amount: 129,
    currency,
    paymentMethod: 'wechat_pay',
    status: 'cancelled',
    riskLevel: 'low',
    createdAt: daysAgo(6, 2),
    updatedAt: daysAgo(5, 4),
    tags: ['逾期取消'],
    items: [{ name: 'Pro 月度订阅', quantity: 1, price: 129 }],
    history: [
      { status: 'pending', label: '创建订单', timestamp: daysAgo(6, 2), operator: '系统' },
      { status: 'cancelled', label: '超过支付有效期', timestamp: daysAgo(5, 4), operator: '系统' },
    ],
    notes: [],
    metadata: { region: '西安', device: 'Windows', channel: '官网' },
  },
  {
    id: 'order_1006',
    orderNumber: 'ORD-240107-VX1',
    user: { id: 'user_106', name: 'Glow Studio', email: 'ops@glowstudio.cn', company: 'Glow Studio', tier: 'pro' },
    planName: '团队版',
    planCycle: 'yearly',
    amount: 2599,
    currency,
    paymentMethod: 'alipay',
    status: 'completed',
    riskLevel: 'low',
    createdAt: daysAgo(8, 5),
    updatedAt: daysAgo(8, 2),
    paidAt: daysAgo(8, 3),
    invoiceNumber: 'INV-2024-007',
    tags: ['企业采购', '10人'],
    items: [{ name: '团队版 10 席位', quantity: 1, price: 2599 }],
    history: [
      { status: 'pending', label: '创建订单', timestamp: daysAgo(8, 5), operator: '系统' },
      { status: 'processing', label: '待支付宝回调', timestamp: daysAgo(8, 4), operator: '系统' },
      { status: 'completed', label: '支付宝支付成功', timestamp: daysAgo(8, 3), operator: '支付宝' },
    ],
    notes: [
      { operator: '企业客服Mia', message: '需要邮寄纸质发票', createdAt: daysAgo(8, 2) },
    ],
    metadata: { region: '深圳', device: 'Mac', channel: '企业通道' },
  },
  {
    id: 'order_1007',
    orderNumber: 'ORD-240116-RS7',
    user: { id: 'user_107', name: '唐峰', email: 'tom.tang@example.com', tier: 'pro' },
    planName: '专业版',
    planCycle: 'monthly',
    amount: 129,
    currency,
    paymentMethod: 'wechat_pay',
    status: 'processing',
    riskLevel: 'medium',
    createdAt: daysAgo(0, 3),
    updatedAt: daysAgo(0, 2),
    tags: ['待回调'],
    items: [{ name: 'Pro 月度订阅', quantity: 1, price: 129 }],
    history: [
      { status: 'pending', label: '创建订单', timestamp: daysAgo(0, 3), operator: '系统' },
      { status: 'processing', label: '等待微信支付确认', timestamp: daysAgo(0, 2), operator: '系统' },
    ],
    notes: [],
    metadata: { region: '成都', device: 'Android', channel: '官网' },
  },
  {
    id: 'order_1008',
    orderNumber: 'ORD-240114-MC9',
    user: { id: 'user_108', name: '顾岚', email: 'lan.gu@example.com', company: '岚影工作室', tier: 'basic' },
    planName: '基础版',
    planCycle: 'monthly',
    amount: 89,
    currency,
    paymentMethod: 'wechat_pay',
    status: 'completed',
    riskLevel: 'low',
    createdAt: daysAgo(3, 1),
    updatedAt: daysAgo(3, 1),
    paidAt: daysAgo(3, 0),
    tags: ['渠道'],
    items: [{ name: 'Basic 月度订阅', quantity: 1, price: 89 }],
    history: [
      { status: 'pending', label: '创建订单', timestamp: daysAgo(3, 1), operator: '系统' },
      { status: 'completed', label: '渠道支付入账', timestamp: daysAgo(3, 0), operator: '渠道对账' },
    ],
    notes: [],
    metadata: { region: '南京', device: 'Windows', channel: '渠道合作' },
  },
  {
    id: 'order_1009',
    orderNumber: 'ORD-240115-FT1',
    user: { id: 'user_109', name: '梁静', email: 'jing.liang@example.com', tier: 'free' },
    planName: '专业版',
    planCycle: 'monthly',
    amount: 129,
    currency,
    paymentMethod: 'wechat_pay',
    status: 'failed',
    riskLevel: 'high',
    createdAt: daysAgo(1, 12),
    updatedAt: daysAgo(1, 11),
    tags: ['风控'],
    items: [{ name: 'Pro 月度订阅', quantity: 1, price: 129 }],
    history: [
      { status: 'pending', label: '创建订单', timestamp: daysAgo(1, 12), operator: '系统' },
      { status: 'failed', label: '支付失败，需复核', timestamp: daysAgo(1, 11), operator: '风控' },
    ],
    notes: [
      { operator: '风控', message: '手机号异常，需人工审核', createdAt: daysAgo(1, 11) },
    ],
    metadata: { region: '未知', device: 'Android', channel: '官网' },
  },
  {
    id: 'order_1010',
    orderNumber: 'ORD-240109-ZT6',
    user: { id: 'user_110', name: 'Future Lab', email: 'team@futurelab.cn', company: 'Future Lab', tier: 'pro' },
    planName: '团队版',
    planCycle: 'monthly',
    amount: 599,
    currency,
    paymentMethod: 'alipay',
    status: 'completed',
    riskLevel: 'low',
    createdAt: daysAgo(5, 3),
    updatedAt: daysAgo(5, 2),
    paidAt: daysAgo(5, 2),
    invoiceNumber: 'INV-2024-009',
    tags: ['团队', '协作'],
    items: [{ name: '团队版 5 席位', quantity: 1, price: 599 }],
    history: [
      { status: 'pending', label: '创建订单', timestamp: daysAgo(5, 3), operator: '系统' },
      { status: 'completed', label: '支付完成', timestamp: daysAgo(5, 2), operator: '支付宝' },
    ],
    notes: [
      { operator: '企业客服Mia', message: '已创建 5 个协作席位', createdAt: daysAgo(5, 2) },
    ],
    metadata: { region: '苏州', device: 'Mac', channel: '企业通道' },
  },
];

let orderStore: AdminOrder[] = baseOrders.map(order => clone(order));

const statusLabelMap: Record<AdminOrderStatus, string> = {
  pending: '待支付',
  processing: '处理中',
  completed: '已完成',
  failed: '支付失败',
  refunded: '已退款',
  cancelled: '已取消',
};

const normalizePageValue = (value: number, min = 1, max = 100) => {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.floor(value), min), max);
};

const withinRange = (input: AdminOrder, start?: Date, end?: Date) => {
  if (!start && !end) return true;
  const created = new Date(input.createdAt).getTime();
  if (start && created < start.getTime()) return false;
  if (end && created > end.getTime()) return false;
  return true;
};

const buildSummary = (source: AdminOrder[]): OrderSummary => {
  const summaryBase = {
    totalOrders: source.length,
    completedOrders: 0,
    pendingOrders: 0,
    refundedOrders: 0,
    revenueToday: 0,
    revenueThisMonth: 0,
    averageOrderValue: 0,
    paymentBreakdown: {
      wechat_pay: 0,
      alipay: 0,
    } as Record<AdminOrderPaymentMethod, number>,
  };

  if (!source.length) {
    return summaryBase;
  }

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let totalAmount = 0;

  for (const order of source) {
    totalAmount += order.amount;
    summaryBase.paymentBreakdown[order.paymentMethod] += order.amount;

    if (order.status === 'completed') {
      summaryBase.completedOrders += 1;
      if (order.paidAt) {
        const paidAt = new Date(order.paidAt);
        if (paidAt.toISOString().startsWith(todayKey)) {
          summaryBase.revenueToday += order.amount;
        }
        const paidMonthKey = `${paidAt.getFullYear()}-${String(paidAt.getMonth() + 1).padStart(2, '0')}`;
        if (paidMonthKey === monthKey) {
          summaryBase.revenueThisMonth += order.amount;
        }
      }
    } else if (order.status === 'pending' || order.status === 'processing') {
      summaryBase.pendingOrders += 1;
    } else if (order.status === 'refunded') {
      summaryBase.refundedOrders += 1;
    }
  }

  summaryBase.averageOrderValue = Number((totalAmount / source.length).toFixed(2));
  summaryBase.revenueToday = Number(summaryBase.revenueToday.toFixed(2));
  summaryBase.revenueThisMonth = Number(summaryBase.revenueThisMonth.toFixed(2));

  return summaryBase;
};

export function queryAdminOrders(options: OrderQueryOptions = {}): OrderQueryResult {
  const page = normalizePageValue(options.page ?? 1);
  const pageSize = normalizePageValue(options.pageSize ?? 10, 1, 50);
  const searchTerm = options.search?.trim().toLowerCase();

  let filtered = orderStore.slice();

  if (options.status && options.status !== 'all') {
    filtered = filtered.filter(order => order.status === options.status);
  }
  if (options.method && options.method !== 'all') {
    filtered = filtered.filter(order => order.paymentMethod === options.method);
  }
  if (searchTerm) {
    filtered = filtered.filter(order =>
      order.orderNumber.toLowerCase().includes(searchTerm) ||
      order.user.email.toLowerCase().includes(searchTerm) ||
      order.user.name.toLowerCase().includes(searchTerm),
    );
  }
  filtered = filtered.filter(item => withinRange(item, options.startDate, options.endDate));

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = filtered.length;
  const startIndex = (page - 1) * pageSize;
  const items = filtered.slice(startIndex, startIndex + pageSize).map(order => clone(order));
  const summary = buildSummary(orderStore);

  return {
    items,
    total,
    page,
    pageSize,
    summary,
  };
}

export const getAdminOrder = (orderId: string): AdminOrder | null => {
  const record = orderStore.find(order => order.id === orderId);
  return record ? clone(record) : null;
};

const pushHistory = (history: AdminOrderHistory[], entry: AdminOrderHistory | null) => {
  if (!entry) return history.slice();
  return [...history, entry];
};

export function mutateAdminOrder(orderId: string, input: OrderMutationInput): AdminOrder | null {
  const index = orderStore.findIndex(order => order.id === orderId);
  if (index === -1) {
    return null;
  }

  const target = orderStore[index];
  const operator = input.operator?.trim() || '系统管理员';
  const nowIso = new Date().toISOString();
  let nextStatus: AdminOrderStatus = target.status;
  const updates: Partial<AdminOrder> = {};
  let historyEntry: AdminOrderHistory | null = null;

  if (input.action) {
    switch (input.action) {
      case 'mark_paid':
        nextStatus = 'completed';
        updates.paidAt = nowIso;
        historyEntry = {
          status: 'completed',
          label: '人工确认收款',
          timestamp: nowIso,
          operator,
        };
        break;
      case 'mark_refunded':
        nextStatus = 'refunded';
        updates.refundedAt = nowIso;
        historyEntry = {
          status: 'refunded',
          label: '标记为已退款',
          timestamp: nowIso,
          operator,
        };
        break;
      case 'cancel':
        nextStatus = 'cancelled';
        historyEntry = {
          status: 'cancelled',
          label: '取消订单',
          timestamp: nowIso,
          operator,
        };
        break;
      default:
        break;
    }
  }

  if (input.status && input.status !== nextStatus) {
    nextStatus = input.status;
    historyEntry = {
      status: nextStatus,
      label: `状态更新为${statusLabelMap[nextStatus]}`,
      timestamp: nowIso,
      operator,
    };
  }

  updates.status = nextStatus;
  updates.updatedAt = nowIso;

  const appendedNotes = target.notes.slice();
  if (input.note?.trim()) {
    appendedNotes.push({ operator, message: input.note.trim(), createdAt: nowIso });
  }
  updates.notes = appendedNotes;

  const updatedRecord: AdminOrder = {
    ...target,
    ...updates,
    history: pushHistory(target.history, historyEntry),
  };

  orderStore[index] = updatedRecord;
  return clone(updatedRecord);
}

export function resetAdminOrdersForTests() {
  orderStore = baseOrders.map(order => clone(order));
}
