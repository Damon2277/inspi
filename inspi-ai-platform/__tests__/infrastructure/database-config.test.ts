/**
 * @jest-environment node
 */

describe('Database Configuration', () => {
  it('should have MongoDB URI configured', () => {
    // Check if MongoDB URI is set in environment
    expect(process.env.MONGODB_URI).toBeDefined()
    expect(process.env.MONGODB_URI).toContain('mongodb')
  })

  it('should have Redis URL configured', () => {
    // Check if Redis URL is set in environment
    expect(process.env.REDIS_URL).toBeDefined()
    expect(process.env.REDIS_URL).toContain('redis')
  })

  it('should have NextAuth secret configured', () => {
    // Check if NextAuth secret is set
    expect(process.env.NEXTAUTH_SECRET).toBeDefined()
    expect(process.env.NEXTAUTH_SECRET.length).toBeGreaterThan(0)
  })
})