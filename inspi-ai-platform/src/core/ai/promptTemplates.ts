/**
 * AI提示词模板系统
 * 为四种教学卡片类型提供专业的提示词模板
 */

export interface PromptContext {
  knowledgePoint: string;
  subject?: string;
  gradeLevel?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  language?: string;
  additionalContext?: string;
}

export interface CardTemplate {
  type: 'concept' | 'example' | 'practice' | 'extension';
  name: string;
  description: string;
  prompt: string;
  expectedLength: number;
  validation: (content: string) => boolean;
}

/**
 * 概念解释卡片模板
 */
const conceptCardTemplate: CardTemplate = {
  type: 'concept',
  name: '概念可视化卡片',
  description: '用单幅信息图或隐喻插画帮助学生“一眼看懂”核心概念',
  expectedLength: 780,
  prompt: `你是一名教育视觉设计师，要将给定知识点转化为一张“概念可视化插画卡片”。请把注意力放在单幅视觉表达（非流程步骤），让学生通过图像隐喻与色彩感知迅速理解概念。务必只输出合法 JSON（不要包含 Markdown、注释或额外文字）。

输入信息：
- 知识点：{knowledgePoint}
- 学科：{subject}
- 年级：{gradeLevel}
- 难度：{difficulty}

JSON 输出结构（字段名必须一致）：
{
  "summary": "1-2 句，用形象比喻概括整幅图带来的直观感受",
  "visual": {
    "type": "hero-illustration",
    "theme": "ocean | sunrise | forest | galaxy | neutral 之一",
    "imagePrompt": "30-45 字中文描述，包含场景/主体/材质/气氛，可直接用于图像生成",
    "center": {
      "title": "{knowledgePoint}",
      "subtitle": "一句隐喻或提示，例如“光合作用：绿叶工厂的能量收集站”"
    },
    "composition": {
      "metaphor": "说明整幅图的类比隐喻，如“温室工厂”",
      "visualFocus": "描述画面的主体与动态",
      "backgroundMood": "交代背景环境氛围，如“晨光透过树林的柔和蓝绿调”",
      "colorPalette": ["主色", "辅色", "点缀色"]
    },
    "annotations": [
      {
        "title": "视觉锚点1",
        "description": "说明这个图形元素代表的概念或特征，文字不超过30字",
        "icon": "单个 Emoji",
        "placement": "left | right | top | bottom 之一"
      },
      {
        "title": "视觉锚点2",
        "description": "描述另一个关键元素或互动关系",
        "icon": "单个 Emoji",
        "placement": "left | right | top | bottom 之一"
      },
      {
        "title": "视觉锚点3",
        "description": "可选，可强调学习迁移或课堂提问",
        "icon": "单个 Emoji",
        "placement": "left | right | top | bottom 之一"
      }
    ]
  }
}

创作原则：
- 插画要聚焦单幅隐喻或场景，避免“输入/过程/输出”流程结构。
- summary、subtitle、annotations 描述需包含具体画面感受或触觉词汇（如“光束”“能量流”）。
- annotations 至少提供 2 个，至多 3 个；icon 必须是单个 Emoji。
- composition.colorPalette 仅填写颜色名称（中文或常见英文），不写额外说明。
- 所有内容使用中文，保持 10-14 岁学生可读性。
- 输出必须是无多余空格的 JSON 字符串，不要包裹在 Markdown 代码块。`,
  validation: (content: string) => {
    try {
      const parsed = JSON.parse(content);
      if (!parsed || typeof parsed !== 'object') return false;
      if (!parsed.visual || typeof parsed.visual !== 'object') return false;

      if (parsed.visual.type !== 'hero-illustration') {
        return false;
      }

      if (!parsed.visual.center || typeof parsed.visual.center.title !== 'string') {
        return false;
      }

      if (!parsed.visual.composition || typeof parsed.visual.composition !== 'object') {
        return false;
      }

      const annotations = parsed.visual.annotations;
      if (!Array.isArray(annotations) || annotations.length < 2) {
        return false;
      }

      const hasValidAnnotation = annotations.every((item: any) => (
        item
        && typeof item.title === 'string'
        && item.title.trim().length > 0
        && typeof item.description === 'string'
        && item.description.trim().length > 0
      ));

      if (!hasValidAnnotation) {
        return false;
      }

      return typeof parsed.visual.imagePrompt === 'string'
        && parsed.visual.imagePrompt.trim().length > 0;
    } catch (error) {
      return false;
    }
  },
};

/**
 * 实例演示卡片模板
 */
const exampleCardTemplate: CardTemplate = {
  type: 'example',
  name: '实例演示卡片',
  description: '通过具体例子帮助学生理解抽象概念',
  expectedLength: 250,
  prompt: `作为一名经验丰富的教师，请为以下知识点创建一个实例演示卡片：

知识点：{knowledgePoint}
学科：{subject}
年级：{gradeLevel}
难度：{difficulty}

请按以下结构生成内容：

## 🎯 典型例子
提供一个贴近学生生活的具体例子

## 📝 详细分析
逐步分析这个例子如何体现知识点

## 🔄 举一反三
再提供1-2个类似的例子，加深理解

## 💭 思考启发
提出1-2个引导学生思考的问题

要求：
- 例子要贴近{gradeLevel}学生的生活经验
- 分析过程要清晰易懂
- 体现知识点的实际应用
- 长度控制在200-300字`,
  validation: (content: string) => {
    return content.includes('典型例子') &&
           content.includes('详细分析') &&
           content.length > 150;
  },
};

/**
 * 练习巩固卡片模板
 */
const practiceCardTemplate: CardTemplate = {
  type: 'practice',
  name: '练习巩固卡片',
  description: '提供适当难度的练习题帮助学生巩固知识',
  expectedLength: 200,
  prompt: `作为一名经验丰富的教师，请为以下知识点创建一个练习巩固卡片：

知识点：{knowledgePoint}
学科：{subject}
年级：{gradeLevel}
难度：{difficulty}

请按以下结构生成内容：

## 🎯 基础练习
设计2-3道基础题目，巩固核心概念

## 🚀 提升练习
设计1-2道稍有挑战的题目

## 💡 解题提示
为每道题提供简要的解题思路或提示

## ✅ 参考答案
提供简洁的参考答案

要求：
- 题目难度适合{gradeLevel}学生
- 覆盖知识点的核心内容
- 题目类型多样化
- 长度控制在180-250字`,
  validation: (content: string) => {
    return content.includes('基础练习') &&
           content.includes('参考答案') &&
           content.length > 120;
  },
};

/**
 * 拓展延伸卡片模板
 */
const extensionCardTemplate: CardTemplate = {
  type: 'extension',
  name: '拓展延伸卡片',
  description: '拓展相关知识，激发学生的学习兴趣',
  expectedLength: 220,
  prompt: `作为一名经验丰富的教师，请为以下知识点创建一个拓展延伸卡片：

知识点：{knowledgePoint}
学科：{subject}
年级：{gradeLevel}
难度：{difficulty}

请按以下结构生成内容：

## 🌐 知识拓展
介绍与此知识点相关的更深层内容或应用

## 🔗 学科联系
说明这个知识点与其他学科的联系

## 🎨 趣味知识
分享一个有趣的相关事实或故事

## 🚀 进一步探索
建议学生可以进一步探索的方向或资源

要求：
- 内容要有启发性和趣味性
- 适当超出课本范围但不过于深奥
- 激发学生的好奇心和探索欲
- 长度控制在200-280字`,
  validation: (content: string) => {
    return content.includes('知识拓展') &&
           content.includes('趣味知识') &&
           content.length > 150;
  },
};

/**
 * 所有卡片模板
 */
export const cardTemplates: Record<string, CardTemplate> = {
  concept: conceptCardTemplate,
  example: exampleCardTemplate,
  practice: practiceCardTemplate,
  extension: extensionCardTemplate,
};

/**
 * 生成提示词
 */
export function generatePrompt(
  cardType: keyof typeof cardTemplates,
  context: PromptContext,
): string {
  const template = cardTemplates[cardType];
  if (!template) {
    throw new Error(`Unknown card type: ${cardType}`);
  }

  let prompt = template.prompt;

  // 替换模板变量
  const replacements = {
    knowledgePoint: context.knowledgePoint,
    subject: context.subject || '通用',
    gradeLevel: context.gradeLevel || '中学',
    difficulty: getDifficultyText(context.difficulty || 'medium'),
    language: context.language || '中文',
  };

  Object.entries(replacements).forEach(([key, value]) => {
    prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), value);
  });

  // 添加额外上下文
  if (context.additionalContext) {
    prompt += `\n\n额外说明：${context.additionalContext}`;
  }

  return prompt;
}

/**
 * 获取难度描述
 */
function getDifficultyText(difficulty: 'easy' | 'medium' | 'hard'): string {
  const difficultyMap = {
    easy: '简单',
    medium: '中等',
    hard: '困难',
  };
  return difficultyMap[difficulty];
}

/**
 * 验证生成的内容
 */
export function validateCardContent(
  cardType: keyof typeof cardTemplates,
  content: string,
): { valid: boolean; errors: string[] } {
  const template = cardTemplates[cardType];
  const errors: string[] = [];

  if (!template) {
    errors.push(`未知的卡片类型: ${cardType}`);
    return { valid: false, errors };
  }

  // 基础验证
  if (!content || content.trim().length === 0) {
    errors.push('内容不能为空');
  }

  if (content.length < 50) {
    errors.push('内容过短，至少需要50个字符');
  }

  if (content.length > template.expectedLength * 2) {
    errors.push(`内容过长，建议不超过${template.expectedLength * 2}个字符`);
  }

  // 模板特定验证
  if (!template.validation(content)) {
    errors.push('内容不符合模板要求的结构');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 获取所有卡片类型信息
 */
export function getCardTypes() {
  return Object.entries(cardTemplates).map(([type, template]) => ({
    type,
    name: template.name,
    description: template.description,
    expectedLength: template.expectedLength,
  }));
}

/**
 * 生成完整的四卡片提示词
 */
export function generateAllCardsPrompt(context: PromptContext): Record<string, string> {
  const prompts: Record<string, string> = {};

  Object.keys(cardTemplates).forEach(cardType => {
    prompts[cardType] = generatePrompt(cardType as keyof typeof cardTemplates, context);
  });

  return prompts;
}

/**
 * 批量验证四张卡片内容
 */
export function validateAllCards(
  cards: Record<string, string>,
): Record<string, { valid: boolean; errors: string[] }> {
  const results: Record<string, { valid: boolean; errors: string[] }> = {};

  Object.entries(cards).forEach(([cardType, content]) => {
    results[cardType] = validateCardContent(cardType as keyof typeof cardTemplates, content);
  });

  return results;
}
