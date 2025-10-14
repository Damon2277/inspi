// Environment setup for tests
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';

// Mock environment variables for testing
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long';
process.env.SIGNATURE_SECRET = 'test-signature-secret-64-characters-long-for-testing-purposes';
process.env.TOKEN_SECRET = 'test-token-secret-32-chars-long';

// WeChat Pay test configuration
process.env.WECHAT_APP_ID = 'wx_test_app_id';
process.env.WECHAT_MCH_ID = '1234567890';
process.env.WECHAT_API_KEY = 'test_api_key_32_characters_long';
process.env.WECHAT_NOTIFY_URL = 'http://localhost:3000/api/payment/wechat/notify';

// SMTP test configuration
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASS = 'test-password';

// Database test configuration (if needed)
process.env.DATABASE_URL = 'sqlite://test.db';

// Disable external API calls in tests
process.env.DISABLE_EXTERNAL_APIS = 'true';
