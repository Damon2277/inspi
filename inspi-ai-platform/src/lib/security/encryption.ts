/**
 * 数据加密和解密工具
 * 提供用户敏感数据的安全存储功能
 */

import crypto from 'crypto';

// 加密配置
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// 获取加密密钥
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }

  // 如果密钥长度不足，使用PBKDF2派生
  if (key.length < KEY_LENGTH) {
    const salt = process.env.ENCRYPTION_SALT || 'inspi-ai-default-salt';
    return crypto.pbkdf2Sync(key, salt, 100000, KEY_LENGTH, 'sha256');
  }

  return Buffer.from(key.slice(0, KEY_LENGTH));
}

/**
 * 加密敏感数据
 */
export function encryptSensitiveData(data: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // 组合IV、tag和加密数据
    const result = iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
    return result;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt sensitive data');
  }
}

/**
 * 解密敏感数据
 */
export function decryptSensitiveData(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt sensitive data');
  }
}

/**
 * 生成安全的随机密码
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }

  return password;
}

/**
 * 哈希密码（用于存储）
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    const [salt, hash] = hashedPassword.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
    return hash === verifyHash;
  } catch (error) {
    console.error('Password verification failed:', error);
    return false;
  }
}

/**
 * 生成安全的令牌
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * 创建数据签名
 */
export function createDataSignature(data: string): string {
  const key = getEncryptionKey();
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(data);
  return hmac.digest('hex');
}

/**
 * 验证数据签名
 */
export function verifyDataSignature(data: string, signature: string): boolean {
  try {
    const expectedSignature = createDataSignature(data);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * 加密用户个人信息
 */
export function encryptPersonalInfo(info: {
  email?: string;
  phone?: string;
  realName?: string;
  idCard?: string;
}): Record<string, string> {
  const encrypted: Record<string, string> = {};

  Object.entries(info).forEach(([key, value]) => {
    if (value && typeof value === 'string') {
      encrypted[key] = encryptSensitiveData(value);
    }
  });

  return encrypted;
}

/**
 * 解密用户个人信息
 */
export function decryptPersonalInfo(encryptedInfo: Record<string, string>): Record<string, string> {
  const decrypted: Record<string, string> = {};

  Object.entries(encryptedInfo).forEach(([key, value]) => {
    if (value && typeof value === 'string') {
      try {
        decrypted[key] = decryptSensitiveData(value);
      } catch (error) {
        console.error(`Failed to decrypt ${key}:`, error);
        decrypted[key] = '[ENCRYPTED]';
      }
    }
  });

  return decrypted;
}

/**
 * 数据脱敏
 */
export function maskSensitiveData(data: string, type: 'email' | 'phone' | 'idCard' | 'name'): string {
  if (!data) return '';

  switch (type) {
    case 'email':
      const [username, domain] = data.split('@');
      if (!username || !domain) return data;
      const maskedUsername = username.length > 2
        ? username[0] + '*'.repeat(username.length - 2) + username[username.length - 1]
        : username;
      return `${maskedUsername}@${domain}`;

    case 'phone':
      if (data.length < 7) return data;
      return data.slice(0, 3) + '****' + data.slice(-3);

    case 'idCard':
      if (data.length < 8) return data;
      return data.slice(0, 4) + '*'.repeat(data.length - 8) + data.slice(-4);

    case 'name':
      if (data.length <= 1) return data;
      if (data.length === 2) return data[0] + '*';
      return data[0] + '*'.repeat(data.length - 2) + data[data.length - 1];

    default:
      return data;
  }
}

/**
 * 安全删除敏感数据
 */
export function secureDelete(data: string): void {
  // 在内存中覆盖数据
  if (typeof data === 'string') {
    // JavaScript中字符串是不可变的，但我们可以尝试清理引用
    data = '';
  }

  // 触发垃圾回收（如果可能）
  if (global.gc) {
    global.gc();
  }
}

/**
 * 生成数据完整性校验码
 */
export function generateChecksum(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * 验证数据完整性
 */
export function verifyChecksum(data: string, checksum: string): boolean {
  const calculatedChecksum = generateChecksum(data);
  return calculatedChecksum === checksum;
}
