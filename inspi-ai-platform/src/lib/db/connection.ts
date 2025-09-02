/**
 * 数据库连接工具 - 简化版本
 * 为了解决导入问题，创建一个简化的连接接口
 */

import connectDB from '../mongodb';

// 重新导出连接函数
export { default as connectDB } from '../mongodb';

// 导出其他可能需要的函数
export async function ensureConnection() {
  try {
    await connectDB();
    return true;
  } catch (error) {
    console.error('数据库连接失败:', error);
    return false;
  }
}

export default connectDB;