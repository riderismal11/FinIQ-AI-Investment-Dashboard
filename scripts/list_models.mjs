// List all models and test with claude-sonnet-4-5 (best balance)
import 'dotenv/config';

const API_KEY = process.env.AI_API_KEY;
if (!API_KEY) { console.error('AI_API_KEY not set'); process.exit(1); }

const BASE = 'https://opencode.ai/zen/v1';

// Full model list
const modRes = await fetch(BASE + '/models', { headers: { Authorization: `Bearer ${API_KEY}` } });
const modJson = await modRes.json();
console.log('=== ALL AVAILABLE MODELS ===');
for (const m of modJson.data ?? []) {
  console.log(' -', m.id);
}

// Test with claude-sonnet-4-5 (solid, fast model)
const testModel = 'claude-sonnet-4-5';
console.log(`\n=== Testing model: ${testModel} ===`);

const res = await fetch(BASE + '/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
  body: JSON.stringify({
    model: testModel,
    messages: [
      { role: 'system', content: 'You are FinIQ, an investment assistant. Respond in 1 sentence.' },
      { role: 'user', content: 'What is a Sharpe ratio?' },
    ],
    temperature: 0.2,
    max_tokens: 80,
  }),
});

const text = await res.text();
console.log('Status:', res.status);
try {
  const json = JSON.parse(text);
  console.log('Content:', json?.choices?.[0]?.message?.content ?? '(empty)');
  console.log('Usage:', JSON.stringify(json?.usage));
} catch { console.log('Body:', text.slice(0, 300)); }
