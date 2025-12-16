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
  description: '用单幅概念插画帮助学生“一眼看懂”核心概念',
  expectedLength: 620,
  prompt: `你是一名教育插画设计师，要把给定知识点转化为一张“概念可视化 hero 插画”。
- 插画需呈现知识点的核心比喻、能量流向或关键元素，整体具备电影级艺术感。
- 只输出合法 JSON（不要包含 Markdown、注释或额外文字）。

输入信息：
- 知识点：{knowledgePoint}
- 学科：{subject}
- 年级：{gradeLevel}
- 难度：{difficulty}

JSON 输出结构（字段名必须一致）：
{
  "summary": "1-2 句，用学生语言概括插画要带来的直观理解",
  "visual": {
    "type": "hero-illustration",
    "theme": "ocean | sunrise | forest | galaxy | neutral 之一",
    "layout": "centered",
    "imagePrompt": "45 字以内，描述要交给图像模型的视觉提示（包含主体、氛围、光影、风格、构图等）",
    "center": {
      "title": "图像上的主标题，例如“光合作用：植物的能量工厂”",
      "subtitle": "一句课堂引子或类比句，12-18 字"
    },
    "composition": {
      "metaphor": "采用的视觉隐喻或场景设定",
      "visualFocus": "画面最需要聚焦的元素及其动作",
      "backgroundMood": "整体氛围、色调或光线描述",
      "colorPalette": ["#638FFE", "#14213D", "#FCA311"]
    },
    "annotations": [
      {
        "title": "标签说明 1",
        "description": "15-25 字描述该标签的教学意义",
        "icon": "单个 Emoji，最多 1 个字符",
        "placement": "left | right | top | bottom | center"
      },
      {
        "title": "标签说明 2",
        "description": "15-25 字描述",
        "icon": "单个 Emoji",
        "placement": "left | right | top | bottom | center"
      }
    ],
    "footerNote": "一句提醒教学场景的使用建议，可为空"
  }
}

创作原则：
- 所有字段使用中文（十六进制色值除外）。
- colorPalette 至少 2 个、至多 4 个颜色值，使用 #RRGGBB。
- annotations 2-3 个即可，内容围绕知识点要点或观察提示。
- imagePrompt 需具备清晰的主体、场景、光影、风格信息，便于调用图像模型生成真实插画。
- 输出必须是无多余空格的 JSON 字符串，不要包裹在 Markdown 代码块。`,
  validation: (content: string) => {
    try {
      const parsed = JSON.parse(content);
      if (!parsed || typeof parsed !== 'object') return false;
      if (!parsed.visual || typeof parsed.visual !== 'object') return false;
      if (parsed.visual.type !== 'hero-illustration') {
        return false;
      }

      if (typeof parsed.summary !== 'string' || parsed.summary.trim().length === 0) {
        return false;
      }

      if (!parsed.visual.center || typeof parsed.visual.center !== 'object') {
        return false;
      }

      if (typeof parsed.visual.center.title !== 'string' || parsed.visual.center.title.trim().length === 0) {
        return false;
      }

      if (typeof parsed.visual.imagePrompt !== 'string' || parsed.visual.imagePrompt.trim().length === 0) {
        return false;
      }

      if (parsed.visual.annotations && !Array.isArray(parsed.visual.annotations)) {
        return false;
      }

      return true;
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
  prompt: `作为一名经验丰富的教学设计者，请为以下知识点创建一个实例演示卡片：

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
  prompt: `作为一名经验丰富的教学设计者，请为以下知识点创建一个练习巩固卡片：

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
  prompt: `作为一名经验丰富的教学设计者，请为以下知识点创建一个拓展延伸卡片：

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
