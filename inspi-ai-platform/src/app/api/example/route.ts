/**
 * 示例API路由 - 展示标准化错误处理
 */

import { NextRequest } from 'next/server';

import {
  createSuccessResponse,
  createValidationErrorResponse,
  createNotFoundErrorResponse,
  createBusinessErrorResponse,
  withErrorHandling,
  validateRequestBody,
  parsePaginationParams,
} from '@/lib/api/responses';
import { logger } from '@/lib/logging/logger';
import { CustomError } from '@/shared/errors/CustomError';
import { ErrorCode } from '@/shared/errors/types';

/**
 * 示例数据接口
 */
interface ExampleData {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

/**
 * 创建数据请求接口
 */
interface CreateExampleRequest {
  name: string;
  email: string;
}

/**
 * 更新数据请求接口
 */
interface UpdateExampleRequest {
  name?: string;
  email?: string;
}

// 模拟数据存储
const mockData: ExampleData[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    createdAt: '2024-01-02T00:00:00Z',
  },
];

/**
 * 验证创建请求
 */
function validateCreateRequest(data: any): CreateExampleRequest {
  if (!data.name || typeof data.name !== 'string') {
    throw new CustomError(ErrorCode.VALIDATION_FAILED, '姓名是必填项且必须是字符串');
  }

  if (!data.email || typeof data.email !== 'string') {
    throw new CustomError(ErrorCode.VALIDATION_FAILED, '邮箱是必填项且必须是字符串');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    throw new CustomError(ErrorCode.VALIDATION_FAILED, '邮箱格式不正确');
  }

  // 检查邮箱是否已存在
  if (mockData.some(item => item.email === data.email)) {
    throw new CustomError(ErrorCode.DUPLICATE_RESOURCE, '邮箱已存在');
  }

  return {
    name: data.name.trim(),
    email: data.email.toLowerCase().trim(),
  };
}

/**
 * 验证更新请求
 */
function validateUpdateRequest(data: any): UpdateExampleRequest {
  const result: UpdateExampleRequest = {};

  if (data.name !== undefined) {
    if (typeof data.name !== 'string') {
      throw new CustomError(ErrorCode.VALIDATION_FAILED, '姓名必须是字符串');
    }
    result.name = data.name.trim();
  }

  if (data.email !== undefined) {
    if (typeof data.email !== 'string') {
      throw new CustomError(ErrorCode.VALIDATION_FAILED, '邮箱必须是字符串');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new CustomError(ErrorCode.VALIDATION_FAILED, '邮箱格式不正确');
    }

    result.email = data.email.toLowerCase().trim();
  }

  return result;
}

/**
 * GET /api/example - 获取数据列表
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const { page, limit, offset } = parsePaginationParams(searchParams);

  // 模拟查询参数
  const search = searchParams.get('search');
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  logger.info('GET /api/example', {
    metadata: {
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    },
  });

  // 模拟数据过滤和排序
  let filteredData = [...mockData];

  if (search) {
    filteredData = filteredData.filter(item =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.email.toLowerCase().includes(search.toLowerCase()),
    );
  }

  // 模拟排序
  filteredData.sort((a, b) => {
    const aValue = a[sortBy as keyof ExampleData];
    const bValue = b[sortBy as keyof ExampleData];

    if (sortOrder === 'desc') {
      return bValue.localeCompare(aValue);
    } else {
      return aValue.localeCompare(bValue);
    }
  });

  // 分页
  const total = filteredData.length;
  const paginatedData = filteredData.slice(offset, offset + limit);

  return createSuccessResponse(paginatedData, {
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    performance: {
      duration: 50, // 模拟查询时间
    },
  });
});

/**
 * POST /api/example - 创建数据
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const validatedData = await validateRequestBody(request, validateCreateRequest);

  logger.info('POST /api/example', {
    metadata: {
      name: validatedData.name,
      email: validatedData.email,
    },
  });

  // 模拟创建数据
  const newData: ExampleData = {
    id: (mockData.length + 1).toString(),
    name: validatedData.name,
    email: validatedData.email,
    createdAt: new Date().toISOString(),
  };

  mockData.push(newData);

  return createSuccessResponse(newData, {
    performance: {
      duration: 100, // 模拟创建时间
    },
  }, 201);
});

/**
 * PUT /api/example/[id] - 更新数据
 */
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const id = pathSegments[pathSegments.length - 1];

  if (!id) {
    return createValidationErrorResponse('缺少ID参数');
  }

  const validatedData = await validateRequestBody(request, validateUpdateRequest);

  logger.info('PUT /api/example/:id', {
    metadata: {
      id,
      updateData: validatedData,
    },
  });

  // 查找数据
  const dataIndex = mockData.findIndex(item => item.id === id);
  if (dataIndex === -1) {
    return createNotFoundErrorResponse('数据');
  }

  // 检查邮箱冲突
  if (validatedData.email &&
      mockData.some(item => item.id !== id && item.email === validatedData.email)) {
    return createBusinessErrorResponse('邮箱已被其他用户使用');
  }

  // 更新数据
  const updatedData = {
    ...mockData[dataIndex],
    ...validatedData,
  };

  mockData[dataIndex] = updatedData;

  return createSuccessResponse(updatedData, {
    performance: {
      duration: 80, // 模拟更新时间
    },
  });
});

/**
 * DELETE /api/example/[id] - 删除数据
 */
export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const id = pathSegments[pathSegments.length - 1];

  if (!id) {
    return createValidationErrorResponse('缺少ID参数');
  }

  logger.info('DELETE /api/example/:id', {
    metadata: { id },
  });

  // 查找数据
  const dataIndex = mockData.findIndex(item => item.id === id);
  if (dataIndex === -1) {
    return createNotFoundErrorResponse('数据');
  }

  // 删除数据
  const deletedData = mockData.splice(dataIndex, 1)[0];

  return createSuccessResponse(deletedData, {
    performance: {
      duration: 30, // 模拟删除时间
    },
  });
});
