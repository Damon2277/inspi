# 内容安全验证系统

这是一个完整的内容安全验证系统，提供敏感词过滤、XSS防护和内容验证功能。

## 功能特性

- ✅ **敏感词检测与过滤** - 支持基础敏感词和变体识别
- ✅ **XSS攻击防护** - 检测和清理恶意脚本、危险标签
- ✅ **内容格式验证** - 长度限制、特殊字符检查等
- ✅ **实时验证** - 支持输入时的实时验证和防抖
- ✅ **多种验证模式** - 严格、标准、宽松三种预设
- ✅ **React Hook集成** - 提供易用的React Hook
- ✅ **API中间件** - 服务端内容验证中间件
- ✅ **可配置** - 支持不同内容类型和用户角色的配置

## 快速开始

### 1. 基础使用

```typescript
import { validateContent, cleanUserContent } from '@/lib/security';

// 验证内容
const result = validateContent('用户输入的内容');
console.log(result.isValid); // true/false
console.log(result.cleanContent); // 清理后的内容
console.log(result.issues); // 问题列表

// 快速清理内容
const cleaned = cleanUserContent('包含敏感词的内容');
```

### 2. React组件中使用

```tsx
import SafeTextarea from '@/components/common/SafeTextarea';

function MyComponent() {
  const [content, setContent] = useState('');
  
  return (
    <SafeTextarea
      value={content}
      onChange={(value, isValid) => {
        setContent(value);
        console.log('内容有效:', isValid);
      }}
      showCharCount={true}
      showValidationStatus={true}
      showCleanButton={true}
    />
  );
}
```

### 3. 使用React Hook

```tsx
import { useContentValidation } from '@/hooks/useContentValidation';

function MyForm() {
  const {
    content,
    cleanContent,
    hasErrors,
    hasWarnings,
    errors,
    warnings,
    canSubmit,
    updateContent,
    validate,
    reset
  } = useContentValidation({
    maxLength: 500,
    realTimeValidation: true,
    enableSensitiveWordFilter: true
  });

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => updateContent(e.target.value)}
      />
      {hasErrors && <div className="error">{errors[0]}</div>}
      <button disabled={!canSubmit}>提交</button>
    </div>
  );
}
```

### 4. API路由中使用

```typescript
import { withSecurity, SECURITY_MIDDLEWARE_PRESETS } from '@/lib/security';

// 使用预设中间件
export const POST = withSecurity(
  async (request: NextRequest) => {
    // 处理已验证的请求
    const body = await request.json();
    // body中的内容已经过安全验证和清理
    return NextResponse.json({ success: true });
  },
  {
    validatorOptions: SECURITY_MIDDLEWARE_PRESETS.USER_CONTENT,
    fieldsToValidate: ['content', 'title', 'description']
  }
);
```

## 配置选项

### 验证器预设

```typescript
import { VALIDATOR_PRESETS } from '@/lib/security';

// 严格模式 - 用于公开内容
VALIDATOR_PRESETS.STRICT

// 标准模式 - 用于一般用户内容  
VALIDATOR_PRESETS.STANDARD

// 宽松模式 - 用于管理员或特殊场景
VALIDATOR_PRESETS.RELAXED
```

### 内容类型配置

```typescript
import { getContentTypeConfig } from '@/lib/security';

// 获取特定内容类型的配置
const commentConfig = getContentTypeConfig('comment');
const articleConfig = getContentTypeConfig('article');
const usernameConfig = getContentTypeConfig('username');
```

### 角色配置

```typescript
import { getRoleBasedConfig } from '@/lib/security';

// 根据用户角色获取配置
const userConfig = getRoleBasedConfig('user');
const adminConfig = getRoleBasedConfig('admin');
```

## 自定义配置

### 创建自定义验证器

```typescript
import { ContentValidator } from '@/lib/security';

const customValidator = new ContentValidator({
  maxLength: 1000,
  enableXssFilter: true,
  enableSensitiveWordFilter: true,
  enableHtmlFilter: false,
  customValidators: [
    (content: string) => {
      // 自定义验证逻辑
      if (content.includes('特定词汇')) {
        return [{
          type: 'format_error',
          message: '不允许包含特定词汇',
          severity: 'error'
        }];
      }
      return [];
    }
  ]
});
```

### 自定义敏感词检测器

```typescript
import { SensitiveWordDetector } from '@/lib/security';

const detector = new SensitiveWordDetector({
  words: ['自定义敏感词1', '自定义敏感词2'],
  replacement: '***',
  fuzzyMatch: true
});

// 动态添加敏感词
detector.addWords(['新敏感词']);

// 更新整个词库
detector.updateWordList(['完全新的词库']);
```

## API参考

### ValidationResult

```typescript
interface ValidationResult {
  isValid: boolean;        // 是否通过验证
  cleanContent: string;    // 清理后的内容
  issues: ValidationIssue[]; // 问题列表
  riskLevel: 'low' | 'medium' | 'high'; // 风险等级
}
```

### ValidationIssue

```typescript
interface ValidationIssue {
  type: 'sensitive_word' | 'xss' | 'length_limit' | 'format_error';
  message: string;         // 问题描述
  position?: { start: number; end: number }; // 问题位置
  severity: 'warning' | 'error'; // 严重程度
}
```

### ContentFilterOptions

```typescript
interface ContentFilterOptions {
  maxLength?: number;                    // 最大长度限制
  enableXssFilter?: boolean;             // 是否启用XSS过滤
  enableSensitiveWordFilter?: boolean;   // 是否启用敏感词过滤
  enableHtmlFilter?: boolean;            // 是否启用HTML标签过滤
  customValidators?: ((content: string) => ValidationIssue[])[]; // 自定义验证器
}
```

## 最佳实践

### 1. 分层验证

```typescript
// 前端实时验证 - 用户体验
const frontendResult = validateContent(content, VALIDATOR_PRESETS.STANDARD);

// 后端严格验证 - 安全保障
const backendResult = validateContent(content, VALIDATOR_PRESETS.STRICT);
```

### 2. 根据场景选择配置

```typescript
// 用户评论 - 严格过滤
const commentValidator = new ContentValidator(getContentTypeConfig('comment'));

// 文章内容 - 保留格式
const articleValidator = new ContentValidator(getContentTypeConfig('article'));

// 管理员内容 - 宽松限制
const adminValidator = new ContentValidator(getRoleBasedConfig('admin'));
```

### 3. 错误处理

```typescript
try {
  const result = validateContent(userInput);
  if (!result.isValid) {
    // 显示具体错误信息
    const errors = result.issues
      .filter(issue => issue.severity === 'error')
      .map(issue => issue.message);
    showErrors(errors);
  }
} catch (error) {
  // 处理验证过程中的异常
  console.error('Content validation failed:', error);
  showGenericError('内容验证失败，请重试');
}
```

### 4. 性能优化

```typescript
// 使用防抖避免频繁验证
const debouncedValidation = useMemo(
  () => debounce((content: string) => {
    validateContent(content);
  }, 300),
  []
);

// 缓存验证结果
const validationCache = new Map();
function cachedValidate(content: string) {
  if (validationCache.has(content)) {
    return validationCache.get(content);
  }
  const result = validateContent(content);
  validationCache.set(content, result);
  return result;
}
```

## 安全注意事项

1. **敏感词库安全**: 生产环境中应从安全的远程服务加载敏感词库
2. **双重验证**: 前端验证主要用于用户体验，后端验证是安全保障
3. **日志记录**: 记录安全事件但不记录敏感内容
4. **定期更新**: 定期更新敏感词库和安全规则
5. **权限控制**: 不同用户角色应使用不同的验证规则

## 测试

运行测试：

```bash
npm test src/__tests__/lib/security/
npm test src/__tests__/hooks/useContentValidation.test.tsx
```

## 演示

查看完整的演示组件：

```tsx
import ContentSecurityDemo from '@/components/examples/ContentSecurityDemo';

// 在页面中使用
<ContentSecurityDemo />
```

## 更新日志

- v1.0.0 - 初始版本，包含基础敏感词过滤和XSS防护
- v1.1.0 - 添加React Hook和组件支持
- v1.2.0 - 添加API中间件和配置系统