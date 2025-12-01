import { deepSeekService } from '@/core/ai/deepseekService';
import { geminiService } from '@/core/ai/geminiService';
import { env } from '@/shared/config/environment';
import { logger } from '@/shared/utils/logger';

type Provider = 'deepseek' | 'gemini';

const hasDeepseek = Boolean(env.AI.DEEPSEEK_API_KEY);
const hasGemini = Boolean(env.AI.GEMINI_API_KEY);
const preferred = (env.AI.PROVIDER || '').toLowerCase() as Provider | '';

const pickProvider = (): Provider => {
  const preferenceOrder: Provider[] = preferred === 'deepseek'
    ? ['deepseek', 'gemini']
    : preferred === 'gemini'
      ? ['gemini', 'deepseek']
      : ['gemini', 'deepseek'];

  for (const candidate of preferenceOrder) {
    if (candidate === 'deepseek' && hasDeepseek) {
      return 'deepseek';
    }
    if (candidate === 'gemini' && hasGemini) {
      return 'gemini';
    }
  }

  if (!hasDeepseek && !hasGemini) {
    logger.warn('AI provider keys are missing: please configure GEMINI_API_KEY or DEEPSEEK_API_KEY. Falling back to Gemini.');
    return 'gemini';
  }

  const fallback = hasDeepseek ? 'deepseek' : 'gemini';
  logger.warn(`Preferred AI provider "${preferred || 'gemini'}"缺少可用 key，已自动切换到 ${fallback}.`);
  return fallback;
};

export const aiProvider: Provider = pickProvider();
export const aiService = aiProvider === 'deepseek' ? deepSeekService : geminiService;
