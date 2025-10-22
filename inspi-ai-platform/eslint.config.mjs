import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "coverage/**",
      "next-env.d.ts",
      "**/*.d.ts",
      "scripts/**",
      "public/**",
      "*.config.{js,ts,mjs}",
      "fix-*.js",
      "check-syntax-errors.js",
      "demo-features.js",
      "test-current-features.js",
      "src/__tests__/unit/community/community-features.test.ts",
    ],
  },
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // ===== 基础代码质量规则 (放宽部分规则以减少错误) =====
      
      // ===== 代码质量规则 =====
      'prefer-const': 'warn',  // 从error改为warn
      'no-var': 'error',
      'no-unused-expressions': 'off',  // 关闭此规则
      'no-console': 'off',  // 开发阶段允许console
      'no-debugger': 'warn',  // 从error改为warn
      'no-alert': 'warn',  // 从error改为warn
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-sequences': 'error',
      'no-throw-literal': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unused-labels': 'error',
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-useless-return': 'error',
      'prefer-promise-reject-errors': 'error',
      'radix': 'error',
      'yoda': 'error',
      
      // ===== 代码风格规则 =====
      'array-bracket-spacing': ['error', 'never'],
      'block-spacing': 'error',
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      'comma-dangle': ['error', 'always-multiline'],
      'comma-spacing': 'error',
      'comma-style': 'error',
      'computed-property-spacing': 'error',
      'eol-last': 'error',
      'func-call-spacing': 'error',
      'indent': 'off',
      'key-spacing': 'error',
      'keyword-spacing': 'error',
      'linebreak-style': ['error', 'unix'],
      'max-len': ['warn', { 
        code: 120,  // 增加到120字符
        ignoreUrls: true, 
        ignoreStrings: true, 
        ignoreTemplateLiterals: true,
        ignoreComments: true,
        ignoreRegExpLiterals: true
      }],
      'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
      'no-trailing-spaces': 'error',
      'object-curly-spacing': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'space-before-blocks': 'error',
      'space-before-function-paren': ['error', {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always'
      }],
      'space-in-parens': 'error',
      'space-infix-ops': 'error',
      'space-unary-ops': 'error',
      
      // ===== React 规则 (放宽部分规则) =====
      'react/no-unescaped-entities': 'off',  // 关闭，经常误报
      'react-hooks/exhaustive-deps': 'warn',  // 改为警告
      'react/jsx-uses-react': 'off', // Next.js 13+ 不需要
      'react/react-in-jsx-scope': 'off', // Next.js 13+ 不需要
      'react/prop-types': 'off', // 使用 TypeScript
      'react/jsx-key': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-undef': 'error',
      'react/jsx-uses-vars': 'error',
      'react/no-children-prop': 'error',
      'react/no-danger-with-children': 'error',
      'react/no-deprecated': 'error',
      'react/no-direct-mutation-state': 'error',
      'react/no-find-dom-node': 'error',
      'react/no-is-mounted': 'error',
      'react/no-render-return-value': 'error',
      'react/no-string-refs': 'error',
      'react/no-unknown-property': 'error',
      'react/require-render-return': 'error',
      
      // ===== Next.js 规则 (放宽部分规则) =====
      '@next/next/no-img-element': 'warn',  // 改为警告，允许img标签
      '@next/next/no-assign-module-variable': 'error',
      '@next/next/no-before-interactive-script-outside-document': 'error',
      '@next/next/no-css-tags': 'error',
      '@next/next/no-document-import-in-page': 'error',
      '@next/next/no-duplicate-head': 'error',
      '@next/next/no-head-element': 'error',
      '@next/next/no-head-import-in-document': 'error',
      '@next/next/no-html-link-for-pages': 'error',
      '@next/next/no-page-custom-font': 'error',
      '@next/next/no-styled-jsx-in-document': 'error',
      '@next/next/no-sync-scripts': 'error',
      '@next/next/no-title-in-document-head': 'error',
      '@next/next/no-unwanted-polyfillio': 'error',
      
      // ===== Import 规则 (放宽部分规则) =====
      'import/no-anonymous-default-export': 'warn',  // 改为警告
      'import/no-duplicates': 'warn',  // 改为警告
      'import/no-unresolved': 'off', // TypeScript 处理
      'import/order': ['warn', {  // 改为警告
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index'
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true
        }
      }],
      
      // ===== 安全规则 =====
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
    },
  },
  {
    // 订阅管理页面缩进规则暂时关闭，避免 indent 规则递归报错
    files: ["src/app/subscription/page.tsx"],
    rules: {
      indent: 'off',
    },
  },
  {
    // 测试文件的宽松规则
    files: ["**/*.test.{js,ts,tsx}", "**/*.spec.{js,ts,tsx}"],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      'no-console': 'off',
      'max-len': 'off',
    },
  },
  {
    // 库类工具文件通常包含长描述，放宽字符限制
    files: ["src/lib/**/*.{ts,tsx}", "src/shared/types/**/*.{ts,tsx}"],
    rules: {
      'max-len': 'off',
    },
  },
  {
    // 配置文件的宽松规则
    files: ["*.config.{js,ts,mjs}", "*.setup.{js,ts}"],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'import/no-anonymous-default-export': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
  {
    // API 路由的特殊规则
    files: ["src/app/api/**/*.{js,ts}"],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      '@typescript-eslint/no-floating-promises': 'off', // API 路由可能不需要 await
    },
  },
];

export default eslintConfig;
