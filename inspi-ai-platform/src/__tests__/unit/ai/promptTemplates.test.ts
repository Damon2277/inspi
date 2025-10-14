/**
 * 提示词模板系统全面单元测试
 * 覆盖所有卡片类型、模板生成、验证和边界条件
 */

import {
  generatePrompt,
  validateCardContent,
  getCardTypes,
  generateAllCardsPrompt,
  validateAllCards,
  cardTemplates,
  PromptContext,
} from '@/core/ai/promptTemplates';

describe('提示词模板系统 - 全面单元测试', () => {

  describe('卡片模板基础功能', () => {
    it('应该包含所有必需的卡片类型', () => {
      // Act
      const types = Object.keys(cardTemplates);

      // Assert
      expect(types).toContain('concept');
      expect(types).toContain('example');
      expect(types).toContain('practice');
      expect(types).toContain('extension');
      expect(types).toHaveLength(4);
    });

    it('应该为每个卡片类型提供完整的模板信息', () => {
      // Act & Assert
      Object.values(cardTemplates).forEach(template => {
        expect(template).toHaveProperty('type');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('prompt');
        expect(template).toHaveProperty('expectedLength');
        expect(template).toHaveProperty('validation');

        expect(typeof template.name).toBe('string');
        expect(typeof template.description).toBe('string');
        expect(typeof template.prompt).toBe('string');
        expect(typeof template.expectedLength).toBe('number');
        expect(typeof template.validation).toBe('function');

        expect(template.name.length).toBeGreaterThan(0);
        expect(template.description.length).toBeGreaterThan(0);
        expect(template.prompt.length).toBeGreaterThan(0);
        expect(template.expectedLength).toBeGreaterThan(0);
      });
    });
  });

  describe('generatePrompt 函数测试', () => {
    const baseContext: PromptContext = {
      knowledgePoint: '二次方程',
      subject: '数学',
      gradeLevel: '九年级',
      difficulty: 'medium',
    };

    it('应该为概念卡片生成正确的提示词', () => {
      // Act
      const prompt = generatePrompt('concept', baseContext);

      // Assert
      expect(prompt).toContain('二次方程');
      expect(prompt).toContain('数学');
      expect(prompt).toContain('九年级');
      expect(prompt).toContain('中等');
      expect(prompt).toContain('概念定义');
      expect(prompt).toContain('关键特征');
      expect(prompt).toContain('重要性');
      expect(prompt).toContain('记忆要点');
    });

    it('应该为实例卡片生成正确的提示词', () => {
      // Act
      const prompt = generatePrompt('example', baseContext);

      // Assert
      expect(prompt).toContain('二次方程');
      expect(prompt).toContain('典型例子');
      expect(prompt).toContain('详细分析');
      expect(prompt).toContain('举一反三');
      expect(prompt).toContain('思考启发');
    });

    it('应该为练习卡片生成正确的提示词', () => {
      // Act
      const prompt = generatePrompt('practice', baseContext);

      // Assert
      expect(prompt).toContain('二次方程');
      expect(prompt).toContain('基础练习');
      expect(prompt).toContain('提升练习');
      expect(prompt).toContain('解题提示');
      expect(prompt).toContain('参考答案');
    });

    it('应该为拓展卡片生成正确的提示词', () => {
      // Act
      const prompt = generatePrompt('extension', baseContext);

      // Assert
      expect(prompt).toContain('二次方程');
      expect(prompt).toContain('知识拓展');
      expect(prompt).toContain('学科联系');
      expect(prompt).toContain('趣味知识');
      expect(prompt).toContain('进一步探索');
    });

    it('应该处理缺失的可选参数', () => {
      // Arrange
      const minimalContext: PromptContext = {
        knowledgePoint: '测试知识点',
      };

      // Act
      const prompt = generatePrompt('concept', minimalContext);

      // Assert
      expect(prompt).toContain('测试知识点');
      expect(prompt).toContain('通用'); // 默认学科
      expect(prompt).toContain('中学'); // 默认年级
      expect(prompt).toContain('中等'); // 默认难度
    });

    it('应该处理额外上下文信息', () => {
      // Arrange
      const contextWithAdditional: PromptContext = {
        knowledgePoint: '测试知识点',
        additionalContext: '这是额外的上下文信息',
      };

      // Act
      const prompt = generatePrompt('concept', contextWithAdditional);

      // Assert
      expect(prompt).toContain('这是额外的上下文信息');
    });

    it('应该在无效卡片类型时抛出错误', () => {
      // Act & Assert
      expect(() => {
        generatePrompt('invalid' as any, baseContext);
      }).toThrow('Unknown card type: invalid');
    });
  });

  describe('validateCardContent 函数测试', () => {
    it('应该验证有效的概念卡片内容', () => {
      // Arrange
      const validContent = `
## 📚 概念定义
二次方程是含有未知数的最高次数为2的方程

## 🔍 关键特征
1. 最高次数为2
2. 标准形式为ax²+bx+c=0
3. 有两个解

## 💡 重要性
二次方程是代数学的基础

## 🌟 记忆要点
记住标准形式和求根公式
      `;

      // Act
      const result = validateCardContent('concept', validContent);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝缺少必需结构的内容', () => {
      // Arrange
      const invalidContent = '这只是一段普通的文字，没有任何结构';

      // Act
      const result = validateCardContent('concept', invalidContent);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('内容不符合模板要求的结构');
    });

    it('应该拒绝空内容', () => {
      // Act
      const result1 = validateCardContent('concept', '');
      const result2 = validateCardContent('concept', '   \n\t  ');

      // Assert
      expect(result1.valid).toBe(false);
      expect(result1.errors).toContain('内容不能为空');
      expect(result2.valid).toBe(false);
      expect(result2.errors).toContain('内容不能为空');
    });

    it('应该拒绝过短的内容', () => {
      // Arrange
      const shortContent = '太短';

      // Act
      const result = validateCardContent('concept', shortContent);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('内容过短，至少需要50个字符');
    });

    it('应该拒绝过长的内容', () => {
      // Arrange
      const longContent = 'x'.repeat(1000); // 超过预期长度的2倍

      // Act
      const result = validateCardContent('concept', longContent);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('内容过长，建议不超过400个字符');
    });

    it('应该处理未知的卡片类型', () => {
      // Act
      const result = validateCardContent('unknown' as any, '测试内容');

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('未知的卡片类型: unknown');
    });
  });

  describe('getCardTypes 函数测试', () => {
    it('应该返回所有卡片类型的信息', () => {
      // Act
      const cardTypes = getCardTypes();

      // Assert
      expect(cardTypes).toHaveLength(4);

      const typeNames = cardTypes.map(ct => ct.type);
      expect(typeNames).toContain('concept');
      expect(typeNames).toContain('example');
      expect(typeNames).toContain('practice');
      expect(typeNames).toContain('extension');

      cardTypes.forEach(cardType => {
        expect(cardType).toHaveProperty('type');
        expect(cardType).toHaveProperty('name');
        expect(cardType).toHaveProperty('description');
        expect(cardType).toHaveProperty('expectedLength');

        expect(typeof cardType.type).toBe('string');
        expect(typeof cardType.name).toBe('string');
        expect(typeof cardType.description).toBe('string');
        expect(typeof cardType.expectedLength).toBe('number');
      });
    });
  });

  describe('generateAllCardsPrompt 函数测试', () => {
    it('应该为所有卡片类型生成提示词', () => {
      // Arrange
      const context: PromptContext = {
        knowledgePoint: '圆的面积',
        subject: '数学',
        gradeLevel: '六年级',
        difficulty: 'easy',
      };

      // Act
      const allPrompts = generateAllCardsPrompt(context);

      // Assert
      expect(Object.keys(allPrompts)).toHaveLength(4);
      expect(allPrompts).toHaveProperty('concept');
      expect(allPrompts).toHaveProperty('example');
      expect(allPrompts).toHaveProperty('practice');
      expect(allPrompts).toHaveProperty('extension');

      Object.values(allPrompts).forEach(prompt => {
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(0);
        expect(prompt).toContain('圆的面积');
        expect(prompt).toContain('数学');
        expect(prompt).toContain('六年级');
      });
    });
  });

  describe('validateAllCards 函数测试', () => {
    it('应该验证所有卡片内容', () => {
      // Arrange
      const cards = {
        concept: `## 📚 概念定义
圆的面积是圆形区域的大小，表示圆形内部所包含的平面区域的度量

## 🔍 关键特征
1. 公式为πr²，其中r是半径
2. π是圆周率，约等于3.14159
3. 面积单位是长度单位的平方
4. 半径越大，面积增长越快

## 💡 重要性
圆面积计算是几何学的基础，在工程、建筑、物理等领域都有重要应用

## 🌟 记忆要点
记住公式πr²，π约等于3.14，半径的平方很关键`,
        example: `## 🎯 典型例子
计算半径为3cm的圆的面积，这是一个常见的几何计算问题

## 📝 详细分析
使用公式S=πr²，代入r=3cm，得到S=π×3²=9π≈28.26cm²

## 🔄 举一反三
半径为5cm的圆面积为25π≈78.5cm²，半径为10cm的圆面积为100π≈314cm²

## 💭 思考启发
为什么是r的平方而不是r？这与圆的几何性质有什么关系？`,
        practice: `## 🎯 基础练习
1. 计算半径为2cm的圆面积
2. 计算半径为4cm的圆面积
3. 计算半径为6cm的圆面积

## 🚀 提升练习
1. 计算直径为10cm的圆面积
2. 已知圆面积为50cm²，求半径

## 💡 解题提示
注意直径和半径的关系：d=2r，面积公式中使用的是半径

## ✅ 参考答案
基础练习：1. 4π≈12.56cm² 2. 16π≈50.24cm² 3. 36π≈113.04cm²`,
        extension: `## 🌐 知识拓展
圆面积公式的推导可以通过积分或极限的方法，将圆分割成无数个小扇形

## 🔗 学科联系
与代数学中的二次函数、物理学中的转动惯量、工程学中的管道设计都有联系

## 🎨 趣味知识
古代阿基米德用"穷竭法"计算圆面积，中国古代数学家刘徽用"割圆术"

## 🚀 进一步探索
可以学习椭圆面积公式、球体表面积公式，以及更复杂的曲面积分`,
      };

      // Act
      const results = validateAllCards(cards);

      // Assert
      expect(Object.keys(results)).toHaveLength(4);
      Object.entries(results).forEach(([cardType, result]) => {
        if (!result.valid) {
          console.log(`${cardType} validation failed:`, result.errors);
        }
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('应该识别无效的卡片内容', () => {
      // Arrange
      const invalidCards = {
        concept: '太短',
        example: '',
        practice: '没有正确结构的内容',
        extension: 'x'.repeat(1000),
      };

      // Act
      const results = validateAllCards(invalidCards);

      // Assert
      expect(Object.keys(results)).toHaveLength(4);
      Object.values(results).forEach(result => {
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('难度级别处理测试', () => {
    const testContext: PromptContext = {
      knowledgePoint: '测试知识点',
      subject: '测试学科',
      gradeLevel: '测试年级',
    };

    it('应该正确处理简单难度', () => {
      // Arrange
      const easyContext = { ...testContext, difficulty: 'easy' as const };

      // Act
      const prompt = generatePrompt('concept', easyContext);

      // Assert
      expect(prompt).toContain('简单');
    });

    it('应该正确处理中等难度', () => {
      // Arrange
      const mediumContext = { ...testContext, difficulty: 'medium' as const };

      // Act
      const prompt = generatePrompt('concept', mediumContext);

      // Assert
      expect(prompt).toContain('中等');
    });

    it('应该正确处理困难难度', () => {
      // Arrange
      const hardContext = { ...testContext, difficulty: 'hard' as const };

      // Act
      const prompt = generatePrompt('concept', hardContext);

      // Assert
      expect(prompt).toContain('困难');
    });

    it('应该使用默认难度当未指定时', () => {
      // Act
      const prompt = generatePrompt('concept', testContext);

      // Assert
      expect(prompt).toContain('中等'); // 默认为medium
    });
  });

  describe('边界条件测试', () => {
    it('应该处理极长的知识点名称', () => {
      // Arrange
      const longContext: PromptContext = {
        knowledgePoint: '这是一个非常非常长的知识点名称'.repeat(10),
        subject: '数学',
        gradeLevel: '高中',
      };

      // Act
      const prompt = generatePrompt('concept', longContext);

      // Assert
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('应该处理特殊字符', () => {
      // Arrange
      const specialContext: PromptContext = {
        knowledgePoint: '特殊字符测试!@#$%^&*()_+{}|:"<>?[]\\;\',./',
        subject: '测试学科',
        gradeLevel: '测试年级',
      };

      // Act
      const prompt = generatePrompt('concept', specialContext);

      // Assert
      expect(prompt).toContain('特殊字符测试!@#$%^&*()_+{}|:"<>?[]\\;\',./');
    });

    it('应该处理Unicode字符', () => {
      // Arrange
      const unicodeContext: PromptContext = {
        knowledgePoint: '数学符号∑∫∂∇∞≈≠≤≥±√π',
        subject: '数学',
        gradeLevel: '大学',
      };

      // Act
      const prompt = generatePrompt('concept', unicodeContext);

      // Assert
      expect(prompt).toContain('数学符号∑∫∂∇∞≈≠≤≥±√π');
    });

    it('应该处理空白字符', () => {
      // Arrange
      const whitespaceContext: PromptContext = {
        knowledgePoint: '  知识点前后有空格  ',
        subject: '\t制表符学科\t',
        gradeLevel: '\n换行年级\n',
      };

      // Act
      const prompt = generatePrompt('concept', whitespaceContext);

      // Assert
      expect(prompt).toContain('知识点前后有空格');
      expect(prompt).toContain('制表符学科');
      expect(prompt).toContain('换行年级');
    });
  });

  describe('性能测试', () => {
    it('应该快速生成提示词', () => {
      // Arrange
      const context: PromptContext = {
        knowledgePoint: '性能测试知识点',
        subject: '计算机科学',
        gradeLevel: '大学',
        difficulty: 'medium',
      };

      const startTime = Date.now();

      // Act
      for (let i = 0; i < 1000; i++) {
        generatePrompt('concept', context);
      }

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成1000次生成
    });

    it('应该快速验证内容', () => {
      // Arrange
      const content = `
## 📚 概念定义
这是一个测试概念

## 🔍 关键特征
1. 特征一
2. 特征二

## 💡 重要性
很重要

## 🌟 记忆要点
记住这个
      `;

      const startTime = Date.now();

      // Act
      for (let i = 0; i < 1000; i++) {
        validateCardContent('concept', content);
      }

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成1000次验证
    });
  });

  describe('内存使用测试', () => {
    it('应该正确处理大量提示词生成', () => {
      // Arrange
      const contexts = Array(100).fill(null).map((_, index) => ({
        knowledgePoint: `知识点${index}`,
        subject: `学科${index}`,
        gradeLevel: `年级${index}`,
        difficulty: 'medium' as const,
      }));

      // Act
      const prompts = contexts.map(context =>
        generatePrompt('concept', context),
      );

      // Assert
      expect(prompts).toHaveLength(100);
      prompts.forEach((prompt, index) => {
        expect(prompt).toContain(`知识点${index}`);
      });
    });

    it('应该正确处理大量内容验证', () => {
      // Arrange
      const contents = Array(100).fill(null).map((_, index) => `## 📚 概念定义
概念${index}的详细定义，包含了该概念的核心含义和基本特征

## 🔍 关键特征
1. 这是概念${index}的第一个重要特征
2. 这是概念${index}的第二个重要特征
3. 这是概念${index}的第三个重要特征

## 💡 重要性
概念${index}在相关领域中具有重要的理论和实践意义

## 🌟 记忆要点
记住概念${index}的核心要点和关键特征`);

      // Act
      const results = contents.map(content =>
        validateCardContent('concept', content),
      );

      // Assert
      expect(results).toHaveLength(100);
      results.forEach((result, index) => {
        if (!result.valid) {
          console.log(`Content ${index} validation failed:`, result.errors);
        }
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('模板一致性测试', () => {
    it('应该确保所有模板包含必需的占位符', () => {
      // Act & Assert
      Object.values(cardTemplates).forEach(template => {
        expect(template.prompt).toContain('{knowledgePoint}');
        expect(template.prompt).toContain('{subject}');
        expect(template.prompt).toContain('{gradeLevel}');
        expect(template.prompt).toContain('{difficulty}');
      });
    });

    it('应该确保所有模板有合理的预期长度', () => {
      // Act & Assert
      Object.values(cardTemplates).forEach(template => {
        expect(template.expectedLength).toBeGreaterThan(50);
        expect(template.expectedLength).toBeLessThan(500);
      });
    });

    it('应该确保所有验证函数正常工作', () => {
      // Arrange
      const validContent = `
## 📚 概念定义
测试定义

## 🔍 关键特征
测试特征

## 💡 重要性
测试重要性

## 🌟 记忆要点
测试要点
      `;

      // Act & Assert
      Object.values(cardTemplates).forEach(template => {
        expect(() => template.validation(validContent)).not.toThrow();
        expect(typeof template.validation(validContent)).toBe('boolean');
      });
    });
  });

  describe('国际化支持测试', () => {
    it('应该支持中文内容', () => {
      // Arrange
      const chineseContext: PromptContext = {
        knowledgePoint: '中文知识点',
        subject: '中文学科',
        gradeLevel: '中文年级',
        difficulty: 'medium',
        language: '中文',
      };

      // Act
      const prompt = generatePrompt('concept', chineseContext);

      // Assert
      expect(prompt).toContain('中文知识点');
      expect(prompt).toContain('中文学科');
      expect(prompt).toContain('中文年级');
    });

    it('应该支持英文内容', () => {
      // Arrange
      const englishContext: PromptContext = {
        knowledgePoint: 'English Knowledge Point',
        subject: 'English Subject',
        gradeLevel: 'English Grade',
        difficulty: 'medium',
        language: 'English',
      };

      // Act
      const prompt = generatePrompt('concept', englishContext);

      // Assert
      expect(prompt).toContain('English Knowledge Point');
      expect(prompt).toContain('English Subject');
      expect(prompt).toContain('English Grade');
    });

    it('应该处理混合语言内容', () => {
      // Arrange
      const mixedContext: PromptContext = {
        knowledgePoint: 'Mixed 混合 Knowledge 知识点',
        subject: 'Math 数学',
        gradeLevel: 'Grade 9 九年级',
        difficulty: 'medium',
      };

      // Act
      const prompt = generatePrompt('concept', mixedContext);

      // Assert
      expect(prompt).toContain('Mixed 混合 Knowledge 知识点');
      expect(prompt).toContain('Math 数学');
      expect(prompt).toContain('Grade 9 九年级');
    });
  });

  describe('回归测试', () => {
    it('应该保持API向后兼容性', () => {
      // Arrange
      const legacyContext = {
        knowledgePoint: '向后兼容测试',
        // 不包含新的可选字段
      };

      // Act & Assert
      expect(() => {
        generatePrompt('concept', legacyContext);
      }).not.toThrow();

      expect(() => {
        validateCardContent('concept', '测试内容');
      }).not.toThrow();

      expect(() => {
        getCardTypes();
      }).not.toThrow();
    });

    it('应该处理旧版本的输入格式', () => {
      // Arrange
      const oldFormatContext = {
        knowledgePoint: '旧格式测试',
        subject: undefined,
        gradeLevel: null,
        difficulty: undefined,
      } as any;

      // Act
      const prompt = generatePrompt('concept', oldFormatContext);

      // Assert
      expect(prompt).toContain('旧格式测试');
      expect(prompt).toContain('通用'); // 默认学科
      expect(prompt).toContain('中学'); // 默认年级
      expect(prompt).toContain('中等'); // 默认难度
    });
  });
});

