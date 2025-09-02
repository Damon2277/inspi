#!/usr/bin/env node

/**
 * 数据库索引创建脚本
 */

const { MongoClient } = require('mongodb');
const path = require('path');

// 导入索引定义（需要编译后的JS文件）
const { ALL_INDEXES, IndexManager } = require('../dist/src/lib/database/indexes');

/**
 * 数据库连接配置
 */
const DB_CONFIG = {
  url: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  dbName: process.env.MONGODB_DB_NAME || 'inspi-ai-platform',
  options: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  }
};

/**
 * 日志工具
 */
const log = {
  info: (message, data = {}) => {
    console.log(`[INFO] ${message}`, Object.keys(data).length > 0 ? JSON.stringify(data, null, 2) : '');
  },
  warn: (message, data = {}) => {
    console.warn(`[WARN] ${message}`, Object.keys(data).length > 0 ? JSON.stringify(data, null, 2) : '');
  },
  error: (message, error = null) => {
    console.error(`[ERROR] ${message}`);
    if (error) {
      console.error(error.stack || error.message || error);
    }
  },
  success: (message, data = {}) => {
    console.log(`[SUCCESS] ${message}`, Object.keys(data).length > 0 ? JSON.stringify(data, null, 2) : '');
  }
};

/**
 * 创建所有索引
 */
async function createAllIndexes() {
  let client;
  
  try {
    log.info('Connecting to MongoDB...', { url: DB_CONFIG.url, dbName: DB_CONFIG.dbName });
    
    // 连接数据库
    client = new MongoClient(DB_CONFIG.url, DB_CONFIG.options);
    await client.connect();
    
    const db = client.db(DB_CONFIG.dbName);
    log.success('Connected to MongoDB successfully');
    
    // 创建索引管理器
    const indexManager = new IndexManager(db);
    
    log.info(`Starting to create ${ALL_INDEXES.length} indexes...`);
    
    const results = {
      created: 0,
      skipped: 0,
      failed: 0,
      details: []
    };
    
    // 按集合分组处理索引
    const indexesByCollection = {};
    ALL_INDEXES.forEach(indexDef => {
      if (!indexesByCollection[indexDef.collection]) {
        indexesByCollection[indexDef.collection] = [];
      }
      indexesByCollection[indexDef.collection].push(indexDef);
    });
    
    // 为每个集合创建索引
    for (const [collectionName, indexes] of Object.entries(indexesByCollection)) {
      log.info(`Creating indexes for collection: ${collectionName}`, { count: indexes.length });
      
      for (const indexDef of indexes) {
        try {
          const collection = db.collection(indexDef.collection);
          
          // 检查索引是否已存在
          const existingIndexes = await collection.indexes();
          const indexExists = existingIndexes.some(idx => idx.name === indexDef.name);
          
          if (indexExists) {
            log.warn(`Index already exists: ${indexDef.name}`, { collection: indexDef.collection });
            results.skipped++;
            results.details.push({
              name: indexDef.name,
              collection: indexDef.collection,
              status: 'skipped',
              reason: 'already exists'
            });
            continue;
          }
          
          // 创建索引
          const startTime = Date.now();
          await collection.createIndex(indexDef.fields, {
            name: indexDef.name,
            ...indexDef.options
          });
          const duration = Date.now() - startTime;
          
          log.success(`Index created: ${indexDef.name}`, {
            collection: indexDef.collection,
            type: indexDef.type,
            duration: `${duration}ms`
          });
          
          results.created++;
          results.details.push({
            name: indexDef.name,
            collection: indexDef.collection,
            status: 'created',
            duration,
            type: indexDef.type
          });
          
        } catch (error) {
          log.error(`Failed to create index: ${indexDef.name}`, error);
          results.failed++;
          results.details.push({
            name: indexDef.name,
            collection: indexDef.collection,
            status: 'failed',
            error: error.message
          });
        }
      }
    }
    
    // 输出结果摘要
    log.success('Index creation completed', {
      created: results.created,
      skipped: results.skipped,
      failed: results.failed,
      total: ALL_INDEXES.length
    });
    
    // 如果有失败的索引，显示详细信息
    if (results.failed > 0) {
      const failedIndexes = results.details.filter(d => d.status === 'failed');
      log.error('Failed indexes:', failedIndexes);
    }
    
    return results;
    
  } catch (error) {
    log.error('Failed to create indexes', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
      log.info('Database connection closed');
    }
  }
}

/**
 * 验证索引
 */
async function validateIndexes() {
  let client;
  
  try {
    log.info('Validating indexes...');
    
    client = new MongoClient(DB_CONFIG.url, DB_CONFIG.options);
    await client.connect();
    
    const db = client.db(DB_CONFIG.dbName);
    const indexManager = new IndexManager(db);
    
    const validation = await indexManager.validateIndexes();
    
    if (validation.valid) {
      log.success('All indexes are valid');
    } else {
      log.warn('Index validation issues found', {
        missing: validation.missing.length,
        extra: validation.extra.length
      });
      
      if (validation.missing.length > 0) {
        log.warn('Missing indexes:', validation.missing.map(idx => ({
          name: idx.name,
          collection: idx.collection
        })));
      }
      
      if (validation.extra.length > 0) {
        log.warn('Extra indexes:', validation.extra);
      }
    }
    
    return validation;
    
  } catch (error) {
    log.error('Failed to validate indexes', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

/**
 * 分析索引使用情况
 */
async function analyzeIndexUsage() {
  let client;
  
  try {
    log.info('Analyzing index usage...');
    
    client = new MongoClient(DB_CONFIG.url, DB_CONFIG.options);
    await client.connect();
    
    const db = client.db(DB_CONFIG.dbName);
    const indexManager = new IndexManager(db);
    
    const analysis = await indexManager.analyzeIndexUsage();
    
    log.info('Index usage analysis completed', {
      totalIndexes: analysis.totalIndexes,
      unusedIndexes: analysis.unusedIndexes.length,
      inefficientIndexes: analysis.inefficientIndexes.length
    });
    
    if (analysis.unusedIndexes.length > 0) {
      log.warn('Unused indexes found:', analysis.unusedIndexes.map(idx => ({
        name: idx.name,
        collection: idx.collection,
        size: idx.size
      })));
    }
    
    if (analysis.inefficientIndexes.length > 0) {
      log.warn('Inefficient indexes found:', analysis.inefficientIndexes.map(idx => ({
        name: idx.name,
        collection: idx.collection,
        efficiency: `${idx.efficiency}%`,
        usageCount: idx.usageCount
      })));
    }
    
    log.info('Recommendations:', analysis.recommendations);
    
    return analysis;
    
  } catch (error) {
    log.error('Failed to analyze index usage', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

/**
 * 主函数
 */
async function main() {
  const command = process.argv[2] || 'create';
  
  try {
    switch (command) {
      case 'create':
        await createAllIndexes();
        break;
      case 'validate':
        await validateIndexes();
        break;
      case 'analyze':
        await analyzeIndexUsage();
        break;
      case 'all':
        await createAllIndexes();
        await validateIndexes();
        await analyzeIndexUsage();
        break;
      default:
        log.error(`Unknown command: ${command}`);
        log.info('Available commands: create, validate, analyze, all');
        process.exit(1);
    }
    
    log.success('Script completed successfully');
    process.exit(0);
    
  } catch (error) {
    log.error('Script failed', error);
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
  process.exit(1);
});

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  createAllIndexes,
  validateIndexes,
  analyzeIndexUsage
};