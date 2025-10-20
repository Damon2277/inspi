jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn(async () => ({})),
  disconnectDB: jest.fn(async () => {}),
}));

jest.mock('@/models/subscription', () => {
  const usageStore = new Map<string, any>();
  const subscriptionStore = new Map<string, any>();
  const transactionStore = new Map<string, any>();

  const wrapDoc = (store: Map<string, any>, key: string, data: any) => {
    const doc = { ...data };
    Object.defineProperty(doc, 'save', {
      enumerable: false,
      value: async function save() {
        store.set(key, { ...doc });
        return doc;
      },
    });
    return doc;
  };

  const SubscriptionStatus = {
    ACTIVE: 'active',
    CANCELLED: 'cancelled',
    GRACE_PERIOD: 'grace_period',
    EXPIRED: 'expired',
  } as const;

  const PaymentStatus = {
    PENDING: 'pending',
    SUCCESS: 'success',
    FAILED: 'failed',
  } as const;

  const PaymentType = {
    INITIAL: 'initial',
    RENEWAL: 'renewal',
  } as const;

  const UsageStats = {
    async findOne(query: { userId?: string }) {
      if (!query.userId) return null;
      const record = usageStore.get(query.userId);
      return record ? wrapDoc(usageStore, query.userId, record) : null;
    },
    async create(doc: any) {
      const record = wrapDoc(usageStore, doc.userId, { ...doc });
      usageStore.set(doc.userId, { ...record });
      return record;
    },
    async updateMany(_: unknown, update: { $set: Record<string, any> }) {
      let modified = 0;
      usageStore.forEach((value, key) => {
        usageStore.set(key, { ...value, ...update.$set });
        modified += 1;
      });
      return { modifiedCount: modified };
    },
  };

  const UserSubscription = {
    async findOne(query: { userId?: string }) {
      if (!query.userId) return null;
      const record = subscriptionStore.get(query.userId);
      return record ? wrapDoc(subscriptionStore, query.userId, record) : null;
    },
    async findOneAndUpdate(
      query: { userId?: string },
      update: Record<string, any>,
      options: { upsert?: boolean; new?: boolean } = {},
    ) {
      if (!query.userId) return null;
      const existing = subscriptionStore.get(query.userId);
      const next = existing ? { ...existing, ...update } : { ...update, userId: query.userId };

      if (!existing && !options.upsert) {
        return null;
      }

      subscriptionStore.set(query.userId, { ...next });
      return wrapDoc(subscriptionStore, query.userId, next);
    },
    async create(doc: any) {
      subscriptionStore.set(doc.userId, { ...doc });
      return wrapDoc(subscriptionStore, doc.userId, doc);
    },
  };

  const PaymentTransaction = {
    async create(doc: any) {
      transactionStore.set(doc.orderId, { ...doc });
      return wrapDoc(transactionStore, doc.orderId, doc);
    },
    async findOne(query: { orderId?: string }) {
      if (!query.orderId) return null;
      const record = transactionStore.get(query.orderId);
      return record ? wrapDoc(transactionStore, query.orderId, record) : null;
    },
  };

  const SubscriptionLog = {
    create: jest.fn(),
  };

  const reset = () => {
    usageStore.clear();
    subscriptionStore.clear();
    transactionStore.clear();
  };

  return {
    __esModule: true,
    SubscriptionStatus,
    PaymentStatus,
    PaymentType,
    UsageStats,
    UserSubscription,
    PaymentTransaction,
    SubscriptionLog,
    __testing: { reset },
  };
});

describe('Subscription services', () => {
  beforeAll(() => {
    process.env.WECHAT_PAY_MOCK = 'true';
  });

  beforeEach(() => {
    const mocked = jest.requireMock('@/models/subscription') as { __testing: { reset: () => void } };
    mocked.__testing.reset();
  });

  it('limits free users to three daily requests', async () => {
    const { QuotaService } = await import('@/services/quota.service');

    const userId = 'free-user';

    const first = await QuotaService.checkAndConsume(userId);
    expect(first.allowed).toBe(true);
    expect(first.quotaType).toBe('daily');
    expect(first.remaining).toBe(2);

    await QuotaService.checkAndConsume(userId);
    await QuotaService.checkAndConsume(userId);

    const fourth = await QuotaService.checkAndConsume(userId);
    expect(fourth.allowed).toBe(false);
    expect(fourth.reason).toContain('免费额度已用尽');
    expect(fourth.remaining).toBe(0);
  });

  it('resets and tracks monthly quota for subscribers', async () => {
    const { QuotaService } = await import('@/services/quota.service');
    const { UserSubscription } = await import('@/models/subscription');

    const userId = 'pro-user';

    await QuotaService.createSubscription(userId);

    const initial = await QuotaService.checkAndConsume(userId);
    expect(initial.allowed).toBe(true);
    expect(initial.quotaType).toBe('monthly');
    expect(initial.remaining).toBe(299);

    const subscription = await UserSubscription.findOne({ userId });
    expect(subscription).not.toBeNull();

    if (subscription) {
      subscription.monthlyQuotaRemaining = 1;
      subscription.monthlyQuotaUsed = 299;
      await subscription.save();
    }

    const last = await QuotaService.checkAndConsume(userId);
    expect(last.allowed).toBe(true);
    expect(last.remaining).toBe(0);

    const exceed = await QuotaService.checkAndConsume(userId);
    expect(exceed.allowed).toBe(false);
    expect(exceed.reason).toContain('额度已用尽');
  });

  it('creates mock payment transactions and stores metadata', async () => {
    const { WeChatPayService } = await import('@/services/wechat-pay.service');
    const { PaymentTransaction, PaymentStatus, PaymentType } = await import('@/models/subscription');

    const result = await WeChatPayService.createPayment({
      userId: 'payer@example.com',
      type: PaymentType.INITIAL,
    });

    expect(result.orderId).toMatch(/^INSPI/);
    expect(result.qrCodeUrl).toContain('https://pay.weixin.qq.com/mock');

    const transaction = await PaymentTransaction.findOne({ orderId: result.orderId });
    expect(transaction).not.toBeNull();
    expect(transaction?.status).toBe(PaymentStatus.PENDING);
    expect(transaction?.qrCodeUrl).toBe(result.qrCodeUrl);
  });

  it('handles success callbacks and provisions subscription quota', async () => {
    const { WeChatPayService } = await import('@/services/wechat-pay.service');
    const { PaymentStatus, PaymentType, UserSubscription } = await import('@/models/subscription');

    const userId = 'success@example.com';

    const payment = await WeChatPayService.createPayment({
      userId,
      type: PaymentType.INITIAL,
    });

    const handled = await WeChatPayService.handlePaymentCallback({
      orderId: payment.orderId,
      transactionId: 'mock-tx-123',
      status: 'success',
      paidAt: new Date(),
    });

    expect(handled).toBe(true);

    const status = await WeChatPayService.queryPaymentStatus(payment.orderId);
    expect(status).toBe(PaymentStatus.SUCCESS);

    const subscription = await UserSubscription.findOne({ userId });
    expect(subscription).not.toBeNull();
    expect(subscription?.monthlyQuotaRemaining).toBeGreaterThan(0);
  });
});
