import { deepSeekService } from '@/core/ai/deepseekService';
import { geminiService } from '@/core/ai/geminiService';
import { env } from '@/shared/config/environment';

const provider = env.AI.PROVIDER?.toLowerCase() ?? 'gemini';

export const aiService = provider === 'deepseek' ? deepSeekService : geminiService;

export const aiProvider = provider;

