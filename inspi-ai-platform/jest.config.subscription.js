const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/__tests__/services/**/*.test.{js,jsx,ts,tsx}'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  transformIgnorePatterns: ['node_modules/(?!(d3|d3-.*)/)'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.simple.js'],
  maxWorkers: '50%',
  verbose: true,
};

module.exports = createJestConfig(customJestConfig);
