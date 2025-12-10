import { deepSeekService } from '@/core/ai/deepseekService';
import { geminiService } from '@/core/ai/geminiService';
import { env } from '@/shared/config/environment';
import { logger } from '@/shared/utils/logger';

type Provider = 'deepseek' | 'gemini';

const hasDeepseek = Boolean(env.AI.DEEPSEEK_API_KEY);
const hasGemini = Boolean(env.AI.GEMINI_API_KEY);
const preferred = (env.AI.PROVIDER || '').toLowerCase() as Provider | '';

const buildPreferenceOrder = (): Provider[] => {
  if (preferred === 'deepseek') {
    return ['deepseek', 'gemini'];
  }
  if (preferred === 'gemini') {
    return ['gemini', 'deepseek'];
  }
  return ['gemini', 'deepseek'];
};

const determineProviders = (): Provider[] => {
  const preferenceOrder = buildPreferenceOrder();
  const available = preferenceOrder.filter((candidate) => (
    candidate === 'deepseek' ? hasDeepseek : hasGemini
  ));

  if (available.length > 0) {
    if (available.length < preferenceOrder.length) {
      const fallback = available[0];
      logger.warn(`Preferred AI provider "${preferred || preferenceOrder[0]}"缺少可用 key，已自动切换到 ${fallback}.`);
    }
    return available;
  }

  logger.warn('AI provider keys are missing: please配置 GEMINI_API_KEY 或 DEEPSEEK_API_KEY，将使用 Gemini 进入 mock/降级模式。');
  return ['gemini'];
};

const providerServices: Record<Provider, typeof deepSeekService | typeof geminiService> = {
  deepseek: deepSeekService,
  gemini: geminiService,
};

const providerOrder = determineProviders();

export const aiProviderOrder: Provider[] = providerOrder;
export const aiProvider: Provider = providerOrder[0];
export const aiService = providerServices[aiProvider];

export const getAIService = (provider: Provider) => providerServices[provider];
