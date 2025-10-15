/**
 * Jest Setup for Testing Tools
 *
 * This file automatically configures all custom testing tools
 * when Jest starts up, ensuring they are available in all tests.
 */

import { DefaultRecoveryStrategies, TestErrorType } from '../errors/TestError';
import { setupCustomMatchers, globalTestErrorHandler } from '../utils/TestingUtils';

// Setup custom matchers
setupCustomMatchers();

// Configure global error handling
globalTestErrorHandler.registerStrategy(
  TestErrorType.TIMEOUT,
  DefaultRecoveryStrategies.createTimeoutRecovery(3),
);

globalTestErrorHandler.registerStrategy(
  TestErrorType.NETWORK_FAILED,
  DefaultRecoveryStrategies.createNetworkRecovery(5),
);

globalTestErrorHandler.registerStrategy(
  TestErrorType.DATABASE_FAILED,
  DefaultRecoveryStrategies.createDatabaseRecovery(3),
);

globalTestErrorHandler.registerStrategy(
  TestErrorType.MOCK_FAILED,
  DefaultRecoveryStrategies.createMockRecovery(),
);

// Global test utilities available in all tests
declare global {
  let testUtils: {
    errorHandler: typeof globalTestErrorHandler;
  };
}

// Make utilities globally available
(global as any).testUtils = {
  errorHandler: globalTestErrorHandler,
};

// Console log for confirmation
console.log('✅ Testing tools and utilities loaded successfully');
