// Test: Check what models are available on the OpenCode API
import 'dotenv/config';

const API_KEY = process.env.AI_API_KEY;

if (!API_KEY) { console.error('AI_API_KEY not set'); process.exit(1); }

const BASE = 'https://api.opencode.ai/v1';

// Try various endpoints to understand the API structure
const endpoints = [
  [BASE + '/models', 'GET', null],
  [BASE + '/chat/completions', 'POST', {
    model: 'kimi-k2.5:cloud',
    messages: [{ role: 'user', content: 'hi' }],
    max_tokens: 10,
  }],
  // Try without the /v1
  ['https://api.opencode.ai/chat/completions', 'POST', {
    model: 'kimi-k2.5:cloud',
    messages: [{ role: 'user', content: 'hi' }],
    max_tokens: 10,
  }],
];

for (const [url, method, body] of endpoints) {
  console.log(`\n--- ${method} ${url} ---`);
  try {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
    };
    if (body) opts.body = JSON.stringify(body);
    
    const res = await fetch(url, opts);
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Content-Type: ${res.headers.get('content-type')}`);
    console.log(`Body (first 400): ${text.slice(0, 400)}`);
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }
}
