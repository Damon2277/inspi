import { readFileSync } from 'fs';
import { join } from 'path';

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Read version from package.json
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    // Get build information
    const buildTime = process.env.BUILD_TIME || new Date().toISOString();
    const gitCommit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT || 'unknown';
    const gitBranch = process.env.VERCEL_GIT_COMMIT_REF || process.env.GIT_BRANCH || 'unknown';

    return NextResponse.json({
      version: packageJson.version,
      name: packageJson.name,
      buildTime,
      gitCommit: gitCommit.substring(0, 7),
      gitBranch,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error reading version information:', error);
    return NextResponse.json(
      { error: 'Unable to read version information' },
      { status: 500 },
    );
  }
}
