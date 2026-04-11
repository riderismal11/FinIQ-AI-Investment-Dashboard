import { GoogleGenAI, Type, type FunctionDeclaration } from '@google/genai';
import { serverConfig, type AiRuntimeConfig } from '../config.js';
import { wrapUserInput } from '../security.js';
import { MetricsStore } from '../observability.js';
import { buildChatSystemInstruction, buildInsightsPrompt, buildInsightsSystemInstruction } from './prompts.js';
import { portfolioToolDefinitions, type AiToolDefinition, type JsonSchema } from './tools.js';
import type { AiChatRequest, AiChatResponse, AiFunctionCall, AiInsightsRequest } from './types.js';

interface RemoteAiProvider {
  name: string;
  generateInsights(request: AiInsightsRequest): Promise<string>;
  chat(request: AiChatRequest): Promise<AiChatResponse>;
}

type OpenAiRole = 'system' | 'user' | 'assistant';

type OpenAiRequestMessage = {
  role: OpenAiRole;
  content: string;
};

type OpenAiToolCall = {
  function?: {
    name?: string;
    arguments?: string;
  };
};

type OpenAiResponseMessage = {
  content?: string | Array<{ text?: string; type?: string }>;
  tool_calls?: OpenAiToolCall[];
  reasoning?: string;
  reasoning_content?: string;
};

type OpenAiChatCompletionResponse = {
  choices?: Array<{
    message?: OpenAiResponseMessage;
  }>;
  error?: {
    message?: string;
  };
};

const GEMINI_MODEL_FALLBACKS = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash'];

let remoteProvider: RemoteAiProvider | null | undefined;
let warnedAboutFallback = false;

function warnAboutLocalFallback(reason: string): void {
  if (warnedAboutFallback) return;
  console.warn(reason);
  warnedAboutFallback = true;
}

function parseToolArguments(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function extractOpenAiContent(content: OpenAiResponseMessage['content']): string {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';

  return content
    .map((part) => part.text?.trim() || '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

function toOpenAiHistoryMessage(message: AiChatRequest['history'][number]): OpenAiRequestMessage {
  return {
    role: message.role === 'model' ? 'assistant' : 'user',
    content: message.parts[0].text,
  };
}

function toOpenAiTool(tool: AiToolDefinition): Record<string, unknown> {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}

function toGeminiType(type: JsonSchema['type']): Type {
  switch (type) {
    case 'object':
      return Type.OBJECT;
    case 'array':
      return Type.ARRAY;
    case 'string':
      return Type.STRING;
    case 'number':
      return Type.NUMBER;
    case 'boolean':
      return Type.BOOLEAN;
    default:
      return Type.STRING;
  }
}

function toGeminiSchema(schema: JsonSchema): Record<string, unknown> {
  const result: Record<string, unknown> = {
    type: toGeminiType(schema.type),
  };

  if (schema.description) result.description = schema.description;
  if (schema.enum?.length) result.enum = schema.enum;
  if (schema.required?.length) result.required = schema.required;
  if (schema.items) result.items = toGeminiSchema(schema.items);
  if (schema.properties) {
    result.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [key, toGeminiSchema(value)]),
    );
  }

  return result;
}

function toGeminiTool(tool: AiToolDefinition): FunctionDeclaration {
  return {
    name: tool.name,
    description: tool.description,
    parameters: toGeminiSchema(tool.parameters) as FunctionDeclaration['parameters'],
  };
}

class GeminiRemoteAiProvider implements RemoteAiProvider {
  readonly name = 'gemini';
  private readonly client: GoogleGenAI;
  private readonly models: string[];

  constructor(private readonly config: AiRuntimeConfig) {
    this.client = new GoogleGenAI({ apiKey: config.apiKey ?? '' });
    this.models = Array.from(new Set([config.model, ...GEMINI_MODEL_FALLBACKS].filter(Boolean)));
  }

  async generateInsights(request: AiInsightsRequest): Promise<string> {
    const systemInstruction = buildInsightsSystemInstruction(request.language);
    const prompt = buildInsightsPrompt(request.portfolio, request.metrics, request.language);

    let lastError: unknown = null;

    for (const model of this.models) {
      try {
        const response = await this.client.models.generateContent({
          model,
          contents: [{ parts: [{ text: prompt }] }],
          config: {
            systemInstruction,
            maxOutputTokens: 500,
            temperature: 0.3,
          },
        });

        const text = response.text?.trim();
        if (text) return text;
        throw new Error(`Gemini model ${model} returned an empty insights response`);
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : 'unknown error';
        console.warn(`Gemini insights failed with ${model}: ${message.slice(0, 200)}`);
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Gemini insights failed');
  }

  async chat(request: AiChatRequest): Promise<AiChatResponse> {
    const systemInstruction = buildChatSystemInstruction(request.language, request.portfolio, request.metrics);
    const contents = [
      ...request.history.slice(-10),
      {
        role: 'user' as const,
        parts: [{ text: wrapUserInput(request.message) }] as [{ text: string }],
      },
    ];

    let lastError: unknown = null;

    for (const model of this.models) {
      try {
        const response = await this.client.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            maxOutputTokens: 500,
            temperature: 0.2,
            tools: [{ functionDeclarations: portfolioToolDefinitions.map(toGeminiTool) }],
          },
        });

        const functionCalls = Array.isArray(response.functionCalls)
          ? response.functionCalls.map((call: { name?: string; args?: Record<string, unknown> }) => ({
              name: call.name ?? '',
              args: call.args ?? {},
            }))
          : [];

        const text = response.text?.trim();
        if (text || functionCalls.length > 0) {
          return {
            ...(text ? { text } : {}),
            ...(functionCalls.length > 0 ? { functionCalls } : {}),
          };
        }

        throw new Error(`Gemini model ${model} returned no chat content`);
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : 'unknown error';
        console.warn(`Gemini chat failed with ${model}: ${message.slice(0, 200)}`);
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Gemini chat failed');
  }
}

class OpenAiCompatibleRemoteAiProvider implements RemoteAiProvider {
  readonly name = 'openai-compatible';
  private readonly endpoint: string;
  private _fallbackProvider: RemoteAiProvider | null = null;

  constructor(private readonly config: AiRuntimeConfig) {
    this.endpoint = `${(config.baseUrl ?? 'https://api.openai.com/v1').replace(/\/+$/, '')}/chat/completions`;
    // Initialize optional OpenCode fallback if configured (OpenCode is preferred when available)
    const ocKey = (process.env.AI_OPENCODE_API_KEY ?? '').trim();
    if (ocKey) {
      const ocModel = (process.env.AI_OPENCODE_MODEL ?? config.model) as string;
      const ocBase = (process.env.AI_OPENCODE_BASE_URL ?? config.baseUrl ?? 'https://api.opencode.ai/v1').replace(/\/+$/, '');
      // @ts-ignore - OpenCodeRemoteAiProvider is declared later in this file
      this._fallbackProvider = new OpenCodeRemoteAiProvider({
        provider: 'opencode',
        apiKey: ocKey,
        model: ocModel,
        baseUrl: ocBase,
        isConfigured: true,
      } as any);
    }
  }

  private _isQuotaError(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    return /usage\s*limit|weekly|quota|limit/i.test(msg);
  }

  private async createChatCompletion(body: Record<string, unknown>): Promise<OpenAiChatCompletionResponse> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const raw = await response.text();
    let parsed: OpenAiChatCompletionResponse = {};

    if (raw) {
      try {
        parsed = JSON.parse(raw) as OpenAiChatCompletionResponse;
      } catch {
        parsed = {};
      }
    }

    if (!response.ok) {
      const errorMessage = parsed.error?.message || raw || `HTTP ${response.status}`;
      throw new Error(`OpenAI-compatible request failed: ${errorMessage.slice(0, 300)}`);
    }

    return parsed;
  }

  async generateInsights(request: AiInsightsRequest): Promise<string> {
    try {
      const response = await this.createChatCompletion({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: buildInsightsSystemInstruction(request.language),
          },
          {
            role: 'user',
            content: buildInsightsPrompt(request.portfolio, request.metrics, request.language),
          },
        ],
        temperature: 0.3,
        max_tokens: 400,
      });

      const message = response.choices?.[0]?.message;
      let text = extractOpenAiContent(message?.content);
      // Some models (DeepSeek R1, o1, etc.) put content in reasoning/reasoning_content fields
      if (!text && message && typeof (message as Record<string, unknown>).reasoning === 'string') {
        text = ((message as Record<string, unknown>).reasoning as string).trim();
      }
      if (!text && message && typeof (message as Record<string, unknown>).reasoning_content === 'string') {
        text = ((message as Record<string, unknown>).reasoning_content as string).trim();
      }
      if (!text) throw new Error('OpenAI-compatible provider returned an empty insights response');
      return text;
    } catch (err) {
      if (this._fallbackProvider && this._isQuotaError(err)) {
        console.info('[Fallback] OpenAI quota detected. Routing to OpenCode provider as fallback.');
        try {
          const fb = await this._fallbackProvider.generateInsights(request);
          if (fb) return fb;
        } catch {
          // ignore and rethrow original error
        }
      }
      throw err;
    }
  }

  async chat(request: AiChatRequest): Promise<AiChatResponse> {
    const messages: OpenAiRequestMessage[] = [
      {
        role: 'system',
        content: buildChatSystemInstruction(request.language, request.portfolio, request.metrics),
      },
      ...request.history.slice(-10).map(toOpenAiHistoryMessage),
      {
        role: 'user',
        content: wrapUserInput(request.message),
      },
    ];

    try {
      const response = await this.createChatCompletion({
        model: this.config.model,
        messages,
        tools: portfolioToolDefinitions.map(toOpenAiTool),
        tool_choice: 'auto',
        temperature: 0.2,
        max_tokens: 800,
      });

      const message = response.choices?.[0]?.message;
      let text = extractOpenAiContent(message?.content);
      if (!text && message && typeof (message as Record<string, unknown>).reasoning === 'string') {
        text = ((message as Record<string, unknown>).reasoning as string).trim();
      }

      const functionCalls: AiFunctionCall[] = (message?.tool_calls ?? [])
        .map((toolCall) => ({
          name: toolCall.function?.name ?? '',
          args: parseToolArguments(toolCall.function?.arguments),
        }))
        .filter((toolCall) => Boolean(toolCall.name));

      if (!text && functionCalls.length === 0) {
        throw new Error('OpenAI-compatible provider returned no chat content');
      }

      return {
        ...(text ? { text } : {}),
        ...(functionCalls.length > 0 ? { functionCalls } : {}),
      };
    } catch (error) {
      if (this._fallbackProvider && this._isQuotaError(error)) {
        console.info('[Fallback] OpenAI quota detected during chat. Routing to OpenCode provider as fallback.');
        try {
          const fb = await this._fallbackProvider.chat(request);
          if (fb) return fb;
        } catch {
          // ignore and rethrow original error
        }
      }
      throw error;
    }
  }
}

export class OpenCodeRemoteAiProvider implements RemoteAiProvider {
  readonly name = 'opencode';
  private readonly endpoint: string;
  constructor(private readonly config: AiRuntimeConfig) {
    // IMPORTANT: Only strip trailing slashes. Do NOT use /\/+/g which would
    // collapse 'https://' → 'https:/' and break every request.
    const raw = config.baseUrl ?? process.env.AI_OPENCODE_BASE_URL ?? 'https://opencode.ai/zen/v1';
    const base = raw.replace(/\/+$/, '');
    this.endpoint = `${base}/chat/completions`;
  }
  private async post(body: any): Promise<any> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg = (json?.error?.message) ?? `HTTP ${response.status}`;
      throw new Error(`OpenCode-compatible request failed: ${String(msg).slice(0, 300)}`);
    }
    return json;
  }
  private extractContent(content: any): string {
    if (typeof content === 'string') return content.trim();
    if (Array.isArray(content)) {
      return content.map((p: any) => p?.text?.trim() ?? '').join('\n').trim();
    }
    return '';
  }
  async generateInsights(request: AiInsightsRequest): Promise<string> {
    const system = buildInsightsSystemInstruction(request.language);
    const prompt = buildInsightsPrompt(request.portfolio, request.metrics, request.language);
    const body = {
      model: this.config.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 400,
    };
    const t0 = Date.now();
    try {
      const resp: any = await this.post(body);
      const latency = Date.now() - t0;
      const text = this.extractContent(resp?.choices?.[0]?.message?.content);
      MetricsStore.getInstance().register(this.name, this.config.model, latency, Boolean(text));
      if (!text) {
        throw new Error('OpenCode-compatible provider returned an empty insights response');
      }
      return text;
    } catch (err) {
      const latency = Date.now() - t0;
      MetricsStore.getInstance().register(this.name, this.config.model, latency, false);
      throw err;
    }
  }
  async chat(request: AiChatRequest): Promise<AiChatResponse> {
    const system = buildChatSystemInstruction(request.language, request.portfolio, request.metrics);
    const history = request.history.slice(-10).map((m) => ({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: m.parts?.[0]?.text ?? '',
    }));
    const messages = [
      { role: 'system', content: system },
      ...history,
      { role: 'user', content: wrapUserInput(request.message) },
    ];
    const body = {
      model: this.config.model,
      messages,
      tools: portfolioToolDefinitions.map(toOpenAiTool),
      tool_choice: 'auto',
      temperature: 0.2,
      max_tokens: 800,
    };
    const t0 = Date.now();
    try {
      const resp: any = await this.post(body);
      const latency = Date.now() - t0;
      const message = resp?.choices?.[0]?.message;
      const text = this.extractContent(message?.content);
      const functionCalls: AiFunctionCall[] = (Array.isArray(message?.tool_calls) ? (message?.tool_calls ?? []).map((call: any) => ({
        name: call?.function?.name ?? '',
        args: parseToolArguments(call?.function?.arguments),
      })) : []);
      MetricsStore.getInstance().register(this.name, this.config.model, latency, Boolean(text || functionCalls.length));
      if (!text && functionCalls.length === 0) {
        throw new Error('OpenCode-compatible provider returned no chat content');
      }
      return {
        ...(text ? { text } : {}),
        ...(functionCalls.length ? { functionCalls } : {}),
      };
    } catch (error) {
      const latency = Date.now() - t0;
      MetricsStore.getInstance().register(this.name, this.config.model, latency, false);
      throw error;
    }
  }
}
function createRemoteAiProvider(config: AiRuntimeConfig): RemoteAiProvider | null {
  if (config.provider === 'local') {
    warnAboutLocalFallback('AI provider set to local fallback mode. Remote AI calls are disabled.');
    return null;
  }

  if (!config.apiKey) {
    warnAboutLocalFallback(
      `AI provider "${config.provider}" is missing an API key. FinIQ will use the local fallback until AI_API_KEY or GEMINI_API_KEY is configured.`,
    );
    return null;
  }

  if (config.provider === 'gemini') {
    return new GeminiRemoteAiProvider(config);
  }
  if (config.provider === 'opencode') {
    return new OpenCodeRemoteAiProvider(config);
  }
  return new OpenAiCompatibleRemoteAiProvider(config);
}

export function getRemoteAiProvider(): RemoteAiProvider | null {
  if (remoteProvider !== undefined) {
    return remoteProvider;
  }

  remoteProvider = createRemoteAiProvider(serverConfig.ai);
  return remoteProvider;
}
