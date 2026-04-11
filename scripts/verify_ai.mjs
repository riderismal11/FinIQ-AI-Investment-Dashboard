// Final verification: kimi-k2.5 at correct endpoint, with and without tool calls
import 'dotenv/config';

const API_KEY = process.env.AI_API_KEY;
const BASE = process.env.AI_BASE_URL || 'https://opencode.ai/zen/v1';
const MODEL = process.env.AI_MODEL || 'kimi-k2.5';

if (!API_KEY) { console.error('AI_API_KEY not set'); process.exit(1); }

const endpoint = BASE.replace(/\/+$/, '') + '/chat/completions';
console.log(`Endpoint: ${endpoint}`);
console.log(`Model: ${MODEL}`);
console.log(`Key: ${API_KEY.slice(0, 10)}...`);
console.log('');

// Test 1: Finance chatbot message
console.log('=== Test 1: Finance question (text response) ===');
const t0 = Date.now();
const res1 = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
  body: JSON.stringify({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are FinIQ, a professional investment assistant. Answer in 2-3 sentences. No markdown.',
      },
      {
        role: 'user',
        content: 'Explain the Sharpe ratio in simple terms for someone with a $10,000 portfolio.',
      },
    ],
    temperature: 0.2,
    max_tokens: 200,
  }),
});
const text1 = await res1.text();
console.log(`Status: ${res1.status} | ${Date.now() - t0}ms`);
if (res1.ok) {
  const json = JSON.parse(text1);
  console.log('Response:', json?.choices?.[0]?.message?.content ?? '(empty)');
} else {
  console.log('Error:', text1.slice(0, 300));
}

// Test 2: Tool call
console.log('\n=== Test 2: Portfolio action (tool call) ===');
const t1 = Date.now();
const res2 = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
  body: JSON.stringify({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a portfolio assistant. Use tools to manage the portfolio. Never explain your reasoning.',
      },
      { role: 'user', content: 'Add Apple stock at 10% allocation' },
    ],
    tools: [{
      type: 'function',
      function: {
        name: 'addAsset',
        description: 'Add or update an asset in the portfolio.',
        parameters: {
          type: 'object',
          properties: {
            symbol: { type: 'string', description: 'Yahoo Finance ticker' },
            allocation: { type: 'number', description: 'Percentage allocation 1-100' },
          },
          required: ['symbol', 'allocation'],
        },
      },
    }],
    tool_choice: 'auto',
    temperature: 0.1,
    max_tokens: 200,
  }),
});
const text2 = await res2.text();
console.log(`Status: ${res2.status} | ${Date.now() - t1}ms`);
if (res2.ok) {
  const json = JSON.parse(text2);
  const msg = json?.choices?.[0]?.message;
  console.log('Text:', msg?.content ?? '(none)');
  console.log('Tool calls:', JSON.stringify(msg?.tool_calls ?? [], null, 2));
} else {
  console.log('Error:', text2.slice(0, 300));
}
