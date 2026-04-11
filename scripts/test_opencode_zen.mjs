// Test the correct OpenCode Zen endpoint
import 'dotenv/config';

const API_KEY = process.env.AI_API_KEY;
if (!API_KEY) { console.error('AI_API_KEY not set'); process.exit(1); }

const CORRECT_BASE = 'https://opencode.ai/zen/v1';
const url = CORRECT_BASE + '/chat/completions';

console.log(`Testing: POST ${url}`);
console.log(`API Key: ${API_KEY.slice(0,8)}...`);
console.log('');

// Test 1: plain chat
console.log('--- Test 1: Plain chat message ---');
try {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: 'kimi-k2.5:cloud',
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Respond in exactly 1 short sentence.' },
        { role: 'user', content: 'Hello, are you working?' },
      ],
      temperature: 0.2,
      max_tokens: 50,
    }),
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text.slice(0, 500));
  try {
    const json = JSON.parse(text);
    console.log('Content:', json?.choices?.[0]?.message?.content ?? '(empty)');
  } catch { console.log('Not JSON'); }
} catch (e) { console.log('Error:', e.message); }

// Test 2: with tools
console.log('\n--- Test 2: Chat with function tools ---');
try {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: 'kimi-k2.5:cloud',
      messages: [
        { role: 'system', content: 'You are a portfolio assistant. When the user asks to add an asset, call the addAsset tool.' },
        { role: 'user', content: 'Add AAPL at 10%' },
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'addAsset',
          description: 'Add an asset to the portfolio',
          parameters: {
            type: 'object',
            properties: {
              symbol: { type: 'string', description: 'Ticker symbol' },
              allocation: { type: 'number', description: 'Allocation percentage 1-100' },
            },
            required: ['symbol', 'allocation'],
          },
        },
      }],
      tool_choice: 'auto',
      temperature: 0.2,
      max_tokens: 200,
    }),
  });
  const text = await res.text();
  console.log('Status:', res.status);
  try {
    const json = JSON.parse(text);
    const msg = json?.choices?.[0]?.message;
    console.log('Content:', msg?.content ?? '(empty)');
    console.log('Tool calls:', JSON.stringify(msg?.tool_calls ?? [], null, 2));
  } catch { console.log('Response:', text.slice(0, 400)); }
} catch (e) { console.log('Error:', e.message); }

// Also test available models
console.log('\n--- Test 3: List models ---');
try {
  const res = await fetch(CORRECT_BASE + '/models', {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Models:', text.slice(0, 600));
} catch (e) { console.log('Error:', e.message); }
