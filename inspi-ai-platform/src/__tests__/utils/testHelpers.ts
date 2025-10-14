// Test helper utilities
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
};

export const mockTeachingCard = {
  id: 'test-card-id',
  title: 'Test Card',
  content: 'Test content',
  type: 'concept' as const,
};

export const createMockRequest = (data: any = {}) => ({
  body: data,
  headers: {},
  method: 'GET',
  ...data,
});

export const createMockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};
