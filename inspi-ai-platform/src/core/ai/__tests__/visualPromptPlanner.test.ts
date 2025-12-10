import { describe, expect, it } from '@jest/globals';

import { planVisualizationPrompt } from '@/core/ai/visualPromptPlanner';

// NOTE: This test is intentionally lightweight and only checks that the planner
// returns null when DeepSeek service isn't configured. Integration tests that
// require actual API access are handled in higher-level suites.

describe('visualPromptPlanner', () => {
  it('returns null when DeepSeek is not configured', async () => {
    const result = await planVisualizationPrompt({
      knowledgePoint: '光合作用',
    });
    expect(result).toBeNull();
  });
});

