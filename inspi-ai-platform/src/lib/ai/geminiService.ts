/**
 * Gemini AI服务
 * 处理AI内容生成相关功能
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// 初始化Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * 教学卡片类型
 */
export type CardType = 'visualization' | 'analogy' | 'thinking' | 'interaction';

/**
 * 教学卡片接口
 */
export interface TeachingCard {
  id: string;
  type: CardType;
  title: string;
  content: string;
  metadata: {
    subject?: string;
    gradeLevel?: string;
    knowledgePoint: string;
    generatedAt: Date;
  };
}

/**
 * 卡片生成请求接口
 */
export interface GenerateCardsRequest {
  knowledgePoint: string;
  subject?: string;
  gradeLevel?: string;
}

/**
 * Gemini AI服务类
 */
export class GeminiService {
  private static model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  /**
   * 生成四种类型的教学卡片
   */
  static async generateTeachingCards(request: GenerateCardsRequest): Promise<TeachingCard[]> {
    const { knowledgePoint, subject = '通用', gradeLevel = '中学' } = request;

    try {
      // 构建提示词
      const prompt = this.buildPrompt(knowledgePoint, subject, gradeLevel);
      
      // 调用Gemini API
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // 解析响应并生成卡片
      const cards = this.parseCardsFromResponse(text, knowledgePoint, subject, gradeLevel);
      
      return cards;
    } catch (error) {
      console.error('Gemini API调用失败:', error);
      throw new Error('AI生成服务暂时不可用，请稍后重试');
    }
  }

  /**
   * 重新生成单张卡片
   */
  static async regenerateCard(
    knowledgePoint: string,
    cardType: CardType,
    subject?: string,
    gradeLevel?: string
  ): Promise<TeachingCard> {
    try {
      const prompt = this.buildSingleCardPrompt(knowledgePoint, cardType, subject, gradeLevel);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const card = this.parseSingleCardFromResponse(text, cardType, knowledgePoint, subject, gradeLevel);
      
      return card;
    } catch (error) {
      console.error('单卡片重新生成失败:', error);
      throw new Error('AI重新生成服务暂时不可用，请稍后重试');
    }
  }

  /**
   * 构建完整的提示词
   */
  private static buildPrompt(knowledgePoint: string, subject: string, gradeLevel: string): string {
    return `
作为一名资深教育专家，请为"${knowledgePoint}"这个${subject}学科的${gradeLevel}知识点，生成四种类型的结构化教学创意卡片。

请严格按照以下JSON格式返回，每种卡片类型都要包含：

{
  "cards": [
    {
      "type": "visualization",
      "title": "可视化卡片标题",
      "content": "帮助学生'看见'抽象概念的具体描述，包含视觉化的解释和比喻"
    },
    {
      "type": "analogy",
      "title": "类比延展卡片标题", 
      "content": "将知识点与学生熟悉的生活经验或其他学科知识连接的类比说明"
    },
    {
      "type": "thinking",
      "title": "启发思考卡片标题",
      "content": "包含1-2个开放性问题，激发学生深度思考的内容"
    },
    {
      "type": "interaction",
      "title": "互动氛围卡片标题",
      "content": "包含简单的课堂活动、游戏或互动环节的具体描述"
    }
  ]
}

要求：
1. 内容要适合${gradeLevel}学生的认知水平
2. 语言生动有趣，富有启发性
3. 每张卡片内容控制在100-200字
4. 确保返回有效的JSON格式
5. 内容要有教育价值和实用性
`;
  }

  /**
   * 构建单卡片提示词
   */
  private static buildSingleCardPrompt(
    knowledgePoint: string,
    cardType: CardType,
    subject?: string,
    gradeLevel?: string
  ): string {
    const cardTypeMap = {
      visualization: '可视化卡片：帮助学生"看见"抽象概念',
      analogy: '类比延展卡片：将知识点与生活经验连接',
      thinking: '启发思考卡片：包含开放性问题激发思考',
      interaction: '互动氛围卡片：包含课堂活动或游戏'
    };

    return `
请为"${knowledgePoint}"这个${subject || '通用'}学科的${gradeLevel || '中学'}知识点，生成一张${cardTypeMap[cardType]}。

请严格按照以下JSON格式返回：

{
  "type": "${cardType}",
  "title": "卡片标题",
  "content": "卡片具体内容"
}

要求：
1. 内容适合${gradeLevel || '中学'}学生认知水平
2. 语言生动有趣，富有启发性
3. 内容控制在100-200字
4. 确保返回有效的JSON格式
`;
  }

  /**
   * 解析AI响应生成卡片数组
   */
  private static parseCardsFromResponse(
    response: string,
    knowledgePoint: string,
    subject?: string,
    gradeLevel?: string
  ): TeachingCard[] {
    try {
      // 提取JSON部分
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('无法解析AI响应格式');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const cards = parsed.cards || [];

      return cards.map((card: any, index: number) => ({
        id: `card_${Date.now()}_${index}`,
        type: card.type,
        title: card.title || `${card.type}卡片`,
        content: card.content || '内容生成中...',
        metadata: {
          subject,
          gradeLevel,
          knowledgePoint,
          generatedAt: new Date()
        }
      }));
    } catch (error) {
      console.error('解析AI响应失败:', error);
      // 返回默认卡片
      return this.getDefaultCards(knowledgePoint, subject, gradeLevel);
    }
  }

  /**
   * 解析单卡片响应
   */
  private static parseSingleCardFromResponse(
    response: string,
    cardType: CardType,
    knowledgePoint: string,
    subject?: string,
    gradeLevel?: string
  ): TeachingCard {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('无法解析AI响应格式');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        id: `card_${Date.now()}_${cardType}`,
        type: cardType,
        title: parsed.title || `${cardType}卡片`,
        content: parsed.content || '内容生成中...',
        metadata: {
          subject,
          gradeLevel,
          knowledgePoint,
          generatedAt: new Date()
        }
      };
    } catch (error) {
      console.error('解析单卡片响应失败:', error);
      return this.getDefaultCard(cardType, knowledgePoint, subject, gradeLevel);
    }
  }

  /**
   * 获取默认卡片（当AI生成失败时使用）
   */
  private static getDefaultCards(
    knowledgePoint: string,
    subject?: string,
    gradeLevel?: string
  ): TeachingCard[] {
    const cardTypes: CardType[] = ['visualization', 'analogy', 'thinking', 'interaction'];
    
    return cardTypes.map((type, index) => ({
      id: `default_card_${Date.now()}_${index}`,
      type,
      title: `${knowledgePoint} - ${type}卡片`,
      content: `正在为"${knowledgePoint}"生成${type}类型的教学内容...`,
      metadata: {
        subject,
        gradeLevel,
        knowledgePoint,
        generatedAt: new Date()
      }
    }));
  }

  /**
   * 获取默认单卡片
   */
  private static getDefaultCard(
    cardType: CardType,
    knowledgePoint: string,
    subject?: string,
    gradeLevel?: string
  ): TeachingCard {
    return {
      id: `default_card_${Date.now()}_${cardType}`,
      type: cardType,
      title: `${knowledgePoint} - ${cardType}卡片`,
      content: `正在为"${knowledgePoint}"重新生成${cardType}类型的教学内容...`,
      metadata: {
        subject,
        gradeLevel,
        knowledgePoint,
        generatedAt: new Date()
      }
    };
  }

  /**
   * 验证API密钥是否配置
   */
  static isConfigured(): boolean {
    return !!process.env.GEMINI_API_KEY;
  }
}

export default GeminiService;