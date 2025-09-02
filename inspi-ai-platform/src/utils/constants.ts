// Subscription Plans
export const SUBSCRIPTION_PLANS = {
  free: {
    name: '免费版',
    price: { monthly: 0, yearly: 0 },
    limits: { generations: 5, reuses: 2 },
    features: ['每日5次AI生成', '每日2次复用', '基础知识图谱'],
  },
  pro: {
    name: 'Pro版',
    price: { monthly: 199, yearly: 1888 },
    limits: { generations: 20, reuses: 10 },
    features: ['每日20次AI生成', '每日10次复用', '高级知识图谱', '优先客服支持'],
  },
  super: {
    name: 'Super版',
    price: { monthly: 399, yearly: 3888 },
    limits: { generations: 100, reuses: 30 },
    features: ['每日100次AI生成', '每日30次复用', '无限知识图谱', '专属客服支持', '高级分析功能'],
  },
} as const;

// Teaching Card Types
export const CARD_TYPES = {
  visualization: {
    title: '化抽象为"看见"',
    description: '让知识，在学生眼前\'活\'起来。',
    icon: '👁️',
  },
  analogy: {
    title: '用生活的温度，点亮知识',
    description: '让每一次学习成为亲切的探索。',
    icon: '🔗',
  },
  thinking: {
    title: '抛出一个好问题，胜过一万句灌输',
    description: '培养的更是终身受用的思考力。',
    icon: '💭',
  },
  interaction: {
    title: '让课堂\'破冰\'，让知识\'升温\'',
    description: '在欢声笑语中，知识自然流淌。',
    icon: '🎯',
  },
} as const;

// Subjects and Grade Levels
export const SUBJECTS = [
  '语文', '数学', '英语', '物理', '化学', '生物',
  '历史', '地理', '政治', '音乐', '美术', '体育',
  '信息技术', '通用技术', '心理健康', '其他'
] as const;

export const GRADE_LEVELS = [
  '小学一年级', '小学二年级', '小学三年级', '小学四年级', '小学五年级', '小学六年级',
  '初中一年级', '初中二年级', '初中三年级',
  '高中一年级', '高中二年级', '高中三年级',
  '大学', '其他'
] as const;

// API Endpoints
export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    me: '/api/auth/me',
    logout: '/api/auth/logout',
  },
  magic: {
    generate: '/api/magic/generate',
    regenerate: '/api/magic/regenerate',
  },
  works: {
    list: '/api/works',
    create: '/api/works',
    detail: (id: string) => `/api/works/${id}`,
    reuse: (id: string) => `/api/works/${id}/reuse`,
  },
  profile: {
    get: (id: string) => `/api/profile/${id}`,
    knowledgeGraph: (id: string) => `/api/profile/${id}/knowledge-graph`,
  },
  subscription: {
    plans: '/api/subscription/plans',
    subscribe: '/api/subscription/subscribe',
    cancel: '/api/subscription/cancel',
  },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接失败，请检查网络后重试',
  UNAUTHORIZED: '请先登录后再进行此操作',
  FORBIDDEN: '您没有权限进行此操作',
  NOT_FOUND: '请求的资源不存在',
  RATE_LIMIT_EXCEEDED: '操作过于频繁，请稍后再试',
  VALIDATION_ERROR: '输入信息有误，请检查后重试',
  INTERNAL_ERROR: '服务器内部错误，请稍后重试',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: '登录成功',
  REGISTER_SUCCESS: '注册成功',
  WORK_CREATED: '作品创建成功',
  WORK_PUBLISHED: '作品发布成功',
  WORK_REUSED: '复用成功，可以开始编辑了',
  SUBSCRIPTION_SUCCESS: '订阅成功',
} as const;