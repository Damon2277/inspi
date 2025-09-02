import fs from 'fs'
import path from 'path'

describe('Project Infrastructure', () => {
  const projectRoot = process.cwd()

  it('should have correct project structure', () => {
    // Check essential directories
    expect(fs.existsSync(path.join(projectRoot, 'src'))).toBe(true)
    expect(fs.existsSync(path.join(projectRoot, 'src/app'))).toBe(true)
    expect(fs.existsSync(path.join(projectRoot, 'src/components'))).toBe(true)
    expect(fs.existsSync(path.join(projectRoot, 'src/lib'))).toBe(true)
    expect(fs.existsSync(path.join(projectRoot, 'src/utils'))).toBe(true)
    expect(fs.existsSync(path.join(projectRoot, 'public'))).toBe(true)
  })

  it('should have essential configuration files', () => {
    expect(fs.existsSync(path.join(projectRoot, 'package.json'))).toBe(true)
    expect(fs.existsSync(path.join(projectRoot, 'tsconfig.json'))).toBe(true)
    expect(fs.existsSync(path.join(projectRoot, 'next.config.ts'))).toBe(true)
    expect(fs.existsSync(path.join(projectRoot, 'postcss.config.mjs'))).toBe(true)
    expect(fs.existsSync(path.join(projectRoot, 'jest.config.js'))).toBe(true)
  })

  it('should have environment configuration', () => {
    expect(fs.existsSync(path.join(projectRoot, '.env.local'))).toBe(true)
  })

  it('should have TypeScript configuration', () => {
    const tsConfig = JSON.parse(fs.readFileSync(path.join(projectRoot, 'tsconfig.json'), 'utf8'))
    expect(tsConfig.compilerOptions.paths).toBeDefined()
    expect(tsConfig.compilerOptions.paths['@/*']).toEqual(['./src/*'])
  })
})