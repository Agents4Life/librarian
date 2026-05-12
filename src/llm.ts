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

export const defaultLlmConfig: LlmConfig = {
  baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434/v1',
  fallbackBaseUrls: process.env.OLLAMA_FALLBACK_BASE_URLS?.split(',').map((value) => value.trim()).filter(Boolean) ?? [
    'http://localhost:11434/v1',
  ],
  model: process.env.OLLAMA_MODEL ?? 'qwen3.5:4b',
  fallbackModel: process.env.OLLAMA_FALLBACK_MODEL ?? 'llama3.1:8b',
  timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS ?? 600000),
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
  healthcheck: async () => {
    const baseUrls = [config.baseUrl, ...(config.fallbackBaseUrls ?? [])];
    let lastStatus = 0;

    for (const baseUrl of baseUrls) {
      const response = await withTimeout((signal) => fetch(`${baseUrl}/models`, { signal }), config.timeoutMs).catch(() => null);

      if (response?.ok) {
        return {
          ok: true,
          status: response.status,
        };
      }

      lastStatus = response?.status ?? lastStatus;
    }

    return {
      ok: false,
      status: lastStatus,
    };
  },

  chat: async (messages: LlmMessage[]): Promise<LlmResponse> => {
    const baseUrls = [config.baseUrl, ...(config.fallbackBaseUrls ?? [])];
    const candidates = [config.model, config.fallbackModel].filter((model): model is string => Boolean(model));
    let lastError: unknown;

    for (const baseUrl of baseUrls) {
      for (const model of candidates) {
        try {
          return await withTimeout(
            (signal) => requestChatCompletion(config, messages, baseUrl, model, signal),
            config.timeoutMs,
          );
        } catch (error) {
          lastError = error;
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error('LLM request failed');
  },
});
