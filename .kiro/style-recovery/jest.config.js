module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    '*.js',
    '!cli.js',
    '!test-*.js',
    '!jest.config.js'
  ],
  coverageDirectory: 'coverage',
  verbose: true
};