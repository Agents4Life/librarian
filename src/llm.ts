export interface LlmConfig {
  baseUrl: string;
  fallbackBaseUrls?: string[];
  model: string;
  fallbackModel?: string;
  timeoutMs: number;
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmResponse {
  content: string;
  model: string;
  raw: unknown;
}

import { loadYamlConfig } from './config-loader.js';

const yamlConfig = loadYamlConfig();

const safeTimeout = (raw: unknown, fallback: number): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const defaultLlmConfig: LlmConfig = {
  baseUrl: process.env.OLLAMA_BASE_URL ?? yamlConfig?.llm?.primary?.base_url ?? 'http://127.0.0.1:11434/v1',
  fallbackBaseUrls: process.env.OLLAMA_FALLBACK_BASE_URLS?.split(',').map((value) => value.trim()).filter(Boolean) ?? [
    yamlConfig?.llm?.fallback?.base_url ?? 'http://localhost:11434/v1',
  ],
  model: process.env.OLLAMA_MODEL ?? yamlConfig?.llm?.primary?.model ?? 'qwen3.5:4b',
  fallbackModel: process.env.OLLAMA_FALLBACK_MODEL ?? yamlConfig?.llm?.fallback?.model ?? 'llama3.1:8b',
  timeoutMs: safeTimeout(process.env.OLLAMA_TIMEOUT_MS, safeTimeout(yamlConfig?.llm?.timeout_ms, 600000)),
};

const withTimeout = async <T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
};

const parseChatContent = (raw: unknown) => (
  typeof raw === 'object' && raw !== null &&
  'choices' in raw &&
  Array.isArray((raw as { choices?: Array<{ message?: { content?: string } }> }).choices)
    ? ((raw as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content ?? '')
    : ''
);

const requestChatCompletion = async (
  config: LlmConfig,
  messages: LlmMessage[],
  baseUrl: string,
  model: string,
  signal: AbortSignal,
): Promise<LlmResponse> => {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.ZAI_API_KEY ? { 'Authorization': `Bearer ${process.env.ZAI_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`LLM request failed for ${model}: ${response.status}`);
  }

  const raw = await response.json();

  return {
    content: parseChatContent(raw),
    model,
    raw,
  };
};

export const createLlmClient = (config: LlmConfig = defaultLlmConfig) => ({
  healthcheck: async (): Promise<{ status: 'ready' | 'no-model' | 'down'; model?: string }> => {
    const baseUrls = [config.baseUrl, ...(config.fallbackBaseUrls ?? [])];
    const candidates = [config.model, config.fallbackModel].filter((m): m is string => Boolean(m));

    for (const baseUrl of baseUrls) {
      const response = await withTimeout(
        (signal) => fetch(`${baseUrl}/models`, { signal }),
        config.timeoutMs,
      ).catch(() => null);

      if (!response?.ok) continue;

      // Parse model list and check if our model is available
      try {
        const body = await response.json() as { data?: Array<{ id: string }> };
        const availableModels = body.data?.map((m) => m.id) ?? [];

        for (const candidate of candidates) {
          // Ollama returns model names like "qwen3.5:4b" — match exactly or by prefix
          const found = availableModels.some(
            (m) => m === candidate || m.startsWith(candidate.split(':')[0]),
          );
          if (found) {
            return { status: 'ready', model: candidate };
          }
        }

        return { status: 'no-model', model: candidates[0] };
      } catch {
        // Can't parse response — server is up but something's off
        return { status: 'no-model', model: candidates[0] };
      }
    }

    return { status: 'down' };
  },

  chat: async (messages: LlmMessage[], signal?: AbortSignal): Promise<LlmResponse> => {
    const baseUrls = [config.baseUrl, ...(config.fallbackBaseUrls ?? [])];
    const candidates = [config.model, config.fallbackModel].filter((model): model is string => Boolean(model));
    let lastError: unknown;

    for (const baseUrl of baseUrls) {
      for (const model of candidates) {
        try {
          return await withTimeout(
            (innerSignal) => {
              const combined = new AbortController();
              const onInnerAbort = () => combined.abort();
              const onOuterAbort = () => combined.abort();
              innerSignal.addEventListener('abort', onInnerAbort);
              signal?.addEventListener('abort', onOuterAbort);
              if (innerSignal.aborted || signal?.aborted) combined.abort();
              return requestChatCompletion(config, messages, baseUrl, model, combined.signal)
                .finally(() => {
                  innerSignal.removeEventListener('abort', onInnerAbort);
                  signal?.removeEventListener('abort', onOuterAbort);
                });
            },
            config.timeoutMs,
          );
        } catch (error) {
          if (signal?.aborted) throw error;
          lastError = error;
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error('LLM request failed');
  },
});
