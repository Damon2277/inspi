import {
  SUBSCRIPTION_PLANS,
  CARD_TYPES,
  SUBJECTS,
  GRADE_LEVELS,
  API_ENDPOINTS,
} from '@/utils/constants'

describe('Constants', () => {
  describe('SUBSCRIPTION_PLANS', () => {
    it('has all required plan types', () => {
      expect(SUBSCRIPTION_PLANS).toHaveProperty('free')
      expect(SUBSCRIPTION_PLANS).toHaveProperty('pro')
      expect(SUBSCRIPTION_PLANS).toHaveProperty('super')
    })

    it('has correct structure for each plan', () => {
      Object.values(SUBSCRIPTION_PLANS).forEach(plan => {
        expect(plan).toHaveProperty('name')
        expect(plan).toHaveProperty('price')
        expect(plan).toHaveProperty('limits')
        expect(plan).toHaveProperty('features')
        expect(plan.price).toHaveProperty('monthly')
        expect(plan.price).toHaveProperty('yearly')
        expect(plan.limits).toHaveProperty('generations')
        expect(plan.limits).toHaveProperty('reuses')
      })
    })
  })

  describe('CARD_TYPES', () => {
    it('has all required card types', () => {
      expect(CARD_TYPES).toHaveProperty('visualization')
      expect(CARD_TYPES).toHaveProperty('analogy')
      expect(CARD_TYPES).toHaveProperty('thinking')
      expect(CARD_TYPES).toHaveProperty('interaction')
    })

    it('has correct structure for each card type', () => {
      Object.values(CARD_TYPES).forEach(cardType => {
        expect(cardType).toHaveProperty('title')
        expect(cardType).toHaveProperty('description')
        expect(cardType).toHaveProperty('icon')
      })
    })
  })

  describe('SUBJECTS', () => {
    it('includes common subjects', () => {
      expect(SUBJECTS).toContain('语文')
      expect(SUBJECTS).toContain('数学')
      expect(SUBJECTS).toContain('英语')
      expect(SUBJECTS).toContain('物理')
      expect(SUBJECTS).toContain('化学')
    })
  })

  describe('GRADE_LEVELS', () => {
    it('includes all grade levels', () => {
      expect(GRADE_LEVELS).toContain('小学一年级')
      expect(GRADE_LEVELS).toContain('初中一年级')
      expect(GRADE_LEVELS).toContain('高中一年级')
      expect(GRADE_LEVELS).toContain('大学')
    })
  })

  describe('API_ENDPOINTS', () => {
    it('has all required endpoint categories', () => {
      expect(API_ENDPOINTS).toHaveProperty('auth')
      expect(API_ENDPOINTS).toHaveProperty('magic')
      expect(API_ENDPOINTS).toHaveProperty('works')
      expect(API_ENDPOINTS).toHaveProperty('profile')
      expect(API_ENDPOINTS).toHaveProperty('subscription')
    })

    it('has correct auth endpoints', () => {
      expect(API_ENDPOINTS.auth).toHaveProperty('login')
      expect(API_ENDPOINTS.auth).toHaveProperty('register')
      expect(API_ENDPOINTS.auth).toHaveProperty('me')
      expect(API_ENDPOINTS.auth).toHaveProperty('logout')
    })
  })
})