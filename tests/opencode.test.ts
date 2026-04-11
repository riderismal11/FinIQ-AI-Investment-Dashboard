import { strict as assert } from 'assert'

async function testOpenCodeGenerateInsights() {
  // Mock fetch globally
  const mock = {
    urlContains: '/chat/completions',
  };
  ;(globalThis as any).fetch = async (url: string, opts: any) => {
    // Basic guard to simulate API behavior
    if (typeof url === 'string' && url.includes('/chat/completions')) {
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'OpenCode mocked response' } }] }),
      } as any;
    }
    return { ok: true, json: async () => ({}) } as any;
  };

  // Import the OpenCode provider dynamically to avoid circular dependencies in test env
  const mod = await import('../server/ai/provider');
  const { OpenCodeRemoteAiProvider } = mod as any;
  const cfg: any = {
    provider: 'opencode',
    apiKey: 'sk-test',
    model: 'opencode-model',
    baseUrl: 'https://api.opencode.ai/v1',
    isConfigured: true,
  };
  const provider = new OpenCodeRemoteAiProvider(cfg);
  const input: any = {
    portfolio: { assets: [{ name: 'Asset', symbol: 'AS', allocation: 1 }], totalAmount: 1000, timeHorizon: 1, riskProfile: 'moderate' },
    metrics: { expectedReturn: 50, annualCAGR: 0.15, volatility: 0.2, sharpeRatio: 1.2, maxDrawdown: 0.15, var95: 0.05 } as any,
    language: 'en',
  };
  const out = await provider.generateInsights(input);
  assert.strictEqual(out, 'OpenCode mocked response');
  console.log('OpenCode generateInsights: PASSED');
}

async function testOpenCodeChat() {
  (globalThis as any).fetch = async (_url: string, _opts: any) => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: 'OpenCode chat response' } }] }),
  }) as any;

  const mod = await import('../server/ai/provider');
  const { OpenCodeRemoteAiProvider } = mod as any;
  const cfg: any = { provider: 'opencode', apiKey: 'sk-test', model: 'opencode-model', baseUrl: 'https://api.opencode.ai/v1', isConfigured: true };
  const provider = new OpenCodeRemoteAiProvider(cfg);
  const req: any = { message: 'Hello', history: [], language: 'en' };
  const res = await provider.chat(req);
  // We expect a text in response from mock
  if (!res?.text) throw new Error('No text in OpenCode chat response');
  console.log('OpenCode chat: PASSED');
}

async function runAll() {
  await testOpenCodeGenerateInsights();
  await testOpenCodeChat();
}

runAll().catch((e) => { console.error('OpenCode tests failed:', e); process.exit(1); });
