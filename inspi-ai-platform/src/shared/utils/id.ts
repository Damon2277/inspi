/**
 * ID生成工具函数
 * 提供各种ID生成功能
 */

import { customAlphabet } from 'nanoid';

// 定义不同类型的ID生成器
const nodeIdGenerator = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 12);
const edgeIdGenerator = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 12);
const graphIdGenerator = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 16);

/**
 * 生成通用ID
 */
export function generateId(length: number = 12): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const generator = customAlphabet(alphabet, length);
  return generator();
}

/**
 * 生成节点ID
 */
export function generateNodeId(): string {
  return `node_${nodeIdGenerator()}`;
}

/**
 * 生成边ID
 */
export function generateEdgeId(): string {
  return `edge_${edgeIdGenerator()}`;
}

/**
 * 生成图谱ID
 */
export function generateGraphId(): string {
  return `graph_${graphIdGenerator()}`;
}

/**
 * 生成挂载ID
 */
export function generateMountId(): string {
  return `mount_${generateId(12)}`;
}

/**
 * 生成模板ID
 */
export function generateTemplateId(): string {
  return `template_${generateId(12)}`;
}

/**
 * 生成短ID（用于显示）
 */
export function generateShortId(length: number = 6): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const generator = customAlphabet(alphabet, length);
  return generator();
}

/**
 * 验证ID格式
 */
export function validateId(id: string, type?: 'node' | 'edge' | 'graph' | 'mount' | 'template'): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // 基本格式验证
  const basicPattern = /^[a-zA-Z0-9_-]+$/;
  if (!basicPattern.test(id)) {
    return false;
  }

  // 类型特定验证
  if (type) {
    switch (type) {
      case 'node':
        return id.startsWith('node_') && id.length > 5;
      case 'edge':
        return id.startsWith('edge_') && id.length > 5;
      case 'graph':
        return id.startsWith('graph_') && id.length > 6;
      case 'mount':
        return id.startsWith('mount_') && id.length > 6;
      case 'template':
        return id.startsWith('template_') && id.length > 9;
      default:
        return true;
    }
  }

  return true;
}

/**
 * 从现有ID列表生成唯一ID
 */
export function generateUniqueId(existingIds: string[], prefix: string = '', length: number = 12): string {
  const existingSet = new Set(existingIds);
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const id = prefix ? `${prefix}_${generateId(length)}` : generateId(length);
    if (!existingSet.has(id)) {
      return id;
    }
    attempts++;
  }

  // 如果100次尝试都失败了，使用时间戳确保唯一性
  const timestamp = Date.now().toString(36);
  return prefix ? `${prefix}_${timestamp}_${generateId(6)}` : `${timestamp}_${generateId(6)}`;
}

/**
 * 批量生成唯一ID
 */
export function generateUniqueIds(count: number, existingIds: string[] = [], prefix: string = ''): string[] {
  const existingSet = new Set(existingIds);
  const newIds: string[] = [];

  for (let i = 0; i < count; i++) {
    let id: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      id = prefix ? `${prefix}_${generateId()}` : generateId();
      attempts++;
    } while ((existingSet.has(id) || newIds.includes(id)) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      // 使用时间戳和索引确保唯一性
      const timestamp = Date.now().toString(36);
      id = prefix ? `${prefix}_${timestamp}_${i}` : `${timestamp}_${i}`;
    }

    newIds.push(id);
    existingSet.add(id);
  }

  return newIds;
}

/**
 * 解析ID获取类型和实际ID
 */
export function parseId(id: string): { type: string | null; actualId: string } {
  if (!id || typeof id !== 'string') {
    return { type: null, actualId: id };
  }

  const parts = id.split('_');
  if (parts.length < 2) {
    return { type: null, actualId: id };
  }

  const type = parts[0];
  const actualId = parts.slice(1).join('_');

  return { type, actualId };
}

/**
 * 生成基于时间的ID
 */
export function generateTimeBasedId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = generateId(6);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * 生成可读的ID（包含有意义的前缀）
 */
export function generateReadableId(category: string, description?: string): string {
  const cleanCategory = category.toLowerCase().replace(/[^a-z0-9]/g, '');
  let id = cleanCategory;

  if (description) {
    const cleanDescription = description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .slice(0, 3)
      .join('');

    if (cleanDescription) {
      id += `_${cleanDescription}`;
    }
  }

  id += `_${generateId(6)}`;
  return id;
}

const idUtils = {
  generateId,
  generateNodeId,
  generateEdgeId,
  generateGraphId,
  generateMountId,
  generateTemplateId,
  generateShortId,
  validateId,
  generateUniqueId,
  generateUniqueIds,
  parseId,
  generateTimeBasedId,
  generateReadableId,
};

export default idUtils;
