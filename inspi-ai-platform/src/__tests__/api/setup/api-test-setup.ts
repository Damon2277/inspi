// API Test Setup
import { NextRequest, NextResponse } from 'next/server';

export const createMockRequest = (options: {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  url?: string;
} = {}) => {
  const {
    method = 'GET',
    body = null,
    headers = {},
    url = 'http://localhost:3000/api/test',
  } = options;

  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : null,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
};

export const createMockResponse = () => {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
};

export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
};
