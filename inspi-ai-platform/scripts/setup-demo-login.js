#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DEMO_EMAIL = process.env.DEMO_LOGIN_EMAIL || 'demo@example.com';
const DEMO_PASSWORD = process.env.DEMO_LOGIN_PASSWORD || 'demopass';

const envPath = path.resolve(__dirname, '..', '.env.local');

function ensureFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '', 'utf8');
  }
}

function upsertEnvValue(content, key, value) {
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;
  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }
  return content.length > 0 ? `${content}\n${line}` : line;
}

function main() {
  ensureFileExists(envPath);
  let envContent = fs.readFileSync(envPath, 'utf8');

  envContent = upsertEnvValue(envContent, 'DEMO_LOGIN_EMAIL', DEMO_EMAIL);
  envContent = upsertEnvValue(envContent, 'DEMO_LOGIN_PASSWORD', DEMO_PASSWORD);
  envContent = upsertEnvValue(envContent, 'DEMO_LOGIN_ENABLED', 'true');

  fs.writeFileSync(envPath, envContent, 'utf8');

  console.log('✅ Demo login credentials configured.');
  console.log(`   DEMO_LOGIN_EMAIL=${DEMO_EMAIL}`);
  console.log(`   DEMO_LOGIN_PASSWORD=${DEMO_PASSWORD}`);
  console.log('   You may restart the dev server to apply changes.');
}

main();
