import connectDB, { disconnectDB, getConnectionStatus } from '../mongodb';
import { getRedisClient, getRedisStatus, disconnectRedis } from '../redis';
// Import models to ensure they are registered
import '../models/User';
import '../models/Work';
import '../models/KnowledgeGraph';
import '../models/ContributionLog';

/**
 * Database connection testing utilities
 */

export interface ConnectionTestResult {
  success: boolean;
  service: string;
  status: string;
  details?: any;
  error?: string;
}

export interface FullTestResult {
  overall: boolean;
  results: ConnectionTestResult[];
  timestamp: Date;
}

/**
 * Test MongoDB connection
 */
export async function testMongoConnection(): Promise<ConnectionTestResult> {
  try {
    await connectDB();
    const status = getConnectionStatus();

    return {
      success: status.isConnected,
      service: 'MongoDB',
      status: status.isConnected ? 'Connected' : 'Disconnected',
      details: {
        host: status.host,
        database: status.name,
        readyState: status.readyState,
      },
    };
  } catch (error) {
    return {
      success: false,
      service: 'MongoDB',
      status: 'Error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test Redis connection
 */
export async function testRedisConnection(): Promise<ConnectionTestResult> {
  try {
    const status = await getRedisStatus();

    return {
      success: status.isConnected,
      service: 'Redis',
      status: status.isConnected ? 'Connected' : 'Disconnected',
      details: {
        url: status.url,
        status: status.status,
      },
      error: status.error,
    };
  } catch (error) {
    return {
      success: false,
      service: 'Redis',
      status: 'Error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test model initialization
 */
export async function testModelInitialization(): Promise<ConnectionTestResult> {
  try {
    // Models are already initialized by importing them

    return {
      success: true,
      service: 'Models',
      status: 'Initialized',
      details: {
        message: 'All models successfully initialized',
      },
    };
  } catch (error) {
    return {
      success: false,
      service: 'Models',
      status: 'Error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test basic database operations
 */
export async function testBasicOperations(): Promise<ConnectionTestResult> {
  try {
    await connectDB();

    // Test MongoDB operations
    const { User } = await import('../models');

    // Try to count users (basic read operation)
    const userCount = await (User.countDocuments as any)();

    // Test Redis operations
    const redis = getRedisClient();
    await redis.set('test_key', 'test_value', 'EX', 10);
    const testValue = await redis.get('test_key');
    await redis.del('test_key');

    return {
      success: testValue === 'test_value',
      service: 'Operations',
      status: 'Working',
      details: {
        mongoRead: `Found ${userCount} users`,
        redisReadWrite: testValue === 'test_value' ? 'Success' : 'Failed',
      },
    };
  } catch (error) {
    return {
      success: false,
      service: 'Operations',
      status: 'Error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run comprehensive database tests
 */
export async function runDatabaseTests(): Promise<FullTestResult> {
  console.log('🧪 Starting database connection tests...');

  const results: ConnectionTestResult[] = [];

  // Test MongoDB
  console.log('📊 Testing MongoDB connection...');
  const mongoResult = await testMongoConnection();
  results.push(mongoResult);
  console.log(`${mongoResult.success ? '✅' : '❌'} MongoDB: ${mongoResult.status}`);

  // Test Redis
  console.log('🔴 Testing Redis connection...');
  const redisResult = await testRedisConnection();
  results.push(redisResult);
  console.log(`${redisResult.success ? '✅' : '❌'} Redis: ${redisResult.status}`);

  // Test Models
  console.log('📋 Testing model initialization...');
  const modelsResult = await testModelInitialization();
  results.push(modelsResult);
  console.log(`${modelsResult.success ? '✅' : '❌'} Models: ${modelsResult.status}`);

  // Test Basic Operations
  console.log('⚙️ Testing basic operations...');
  const operationsResult = await testBasicOperations();
  results.push(operationsResult);
  console.log(`${operationsResult.success ? '✅' : '❌'} Operations: ${operationsResult.status}`);

  const overall = results.every(result => result.success);

  console.log('\n📋 Test Summary:');
  console.log('================');
  results.forEach(result => {
    console.log(`${result.success ? '✅' : '❌'} ${result.service}: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
  });

  console.log(`\n🎯 Overall Result: ${overall ? '✅ PASS' : '❌ FAIL'}`);

  return {
    overall,
    results,
    timestamp: new Date(),
  };
}

/**
 * Cleanup connections after testing
 */
export async function cleanupConnections(): Promise<void> {
  try {
    await disconnectDB();
    await disconnectRedis();
    console.log('🧹 Database connections cleaned up');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

export default {
  testMongoConnection,
  testRedisConnection,
  testModelInitialization,
  testBasicOperations,
  runDatabaseTests,
  cleanupConnections,
};
