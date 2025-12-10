import type { RawCardType } from '@/shared/types/teaching';

import { generateTeachingCard } from '@/app/api/magic/card-engine';

type MockService = {
  generateContent: jest.Mock;
};

const buildConceptResponse = () => JSON.stringify({
  summary: '测试摘要',
  visual: {
    type: 'hero-illustration',
    theme: 'ocean',
    layout: 'centered',
    imagePrompt: '教学插画',
    center: {
      title: '中心标题',
      subtitle: '副标题',
    },
    composition: {
      metaphor: '视觉隐喻',
      visualFocus: '焦点',
      backgroundMood: '氛围',
      colorPalette: ['#ffffff', '#000000'],
    },
  },
});

const mockPrimaryService: MockService = {
  generateContent: jest.fn(),
};

const mockFallbackService: MockService = {
  generateContent: jest.fn(),
};

jest.mock('@/core/ai/aiProvider', () => ({
  aiProviderOrder: ['deepseek', 'gemini'],
  getAIService: (provider: 'deepseek' | 'gemini') => (provider === 'deepseek'
    ? mockPrimaryService
    : mockFallbackService
  ),
}));

jest.mock('@/core/ai/imageService', () => ({
  imageService: {
    isEnabled: jest.fn().mockReturnValue(false),
  },
}));

jest.mock('@/core/ai/visualPromptPlanner', () => ({
  planVisualizationPrompt: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('generateTeachingCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseOptions = {
    cardType: 'concept' as RawCardType,
    knowledgePoint: '牛顿第三定律',
    subject: '物理',
    gradeLevel: '初中',
    isMockMode: false,
    promptContext: {
      knowledgePoint: '牛顿第三定律',
      subject: '物理',
      gradeLevel: '初中',
      language: '中文',
      difficulty: 'medium',
    },
    sessionId: 'session_test',
  };

  it('falls back to下一个AI provider when the primary one fails', async () => {
    mockPrimaryService.generateContent.mockRejectedValueOnce(new Error('primary failure'));
    mockFallbackService.generateContent.mockResolvedValueOnce({
      content: buildConceptResponse(),
      cached: false,
    });

    const card = await generateTeachingCard(baseOptions);

    expect(mockPrimaryService.generateContent).toHaveBeenCalledTimes(1);
    expect(mockFallbackService.generateContent).toHaveBeenCalledTimes(1);
    expect(card.title).toBe('概念可视化');
    expect(card.cached).toBe(false);
  });

  it('always provides a placeholder visualization image when generation service is disabled', async () => {
    mockPrimaryService.generateContent.mockResolvedValueOnce({
      content: buildConceptResponse(),
      cached: false,
    });

    const card = await generateTeachingCard(baseOptions);

    expect(card.type).toBe('visualization');
    expect(card.visual?.imageUrl).toBeTruthy();
    expect(card.visual?.imageUrl?.startsWith('data:image/svg+xml')).toBe(true);
    expect(card.visual?.imageMetadata?.provider).toBe('placeholder');
  });
});
