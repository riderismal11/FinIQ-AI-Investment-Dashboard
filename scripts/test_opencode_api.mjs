// Test script: Verifies the OpenCode API endpoint and URL construction
import 'dotenv/config';

const API_KEY = process.env.AI_API_KEY;
const BASE_URL = process.env.AI_BASE_URL || 'https://api.opencode.ai/v1';
const MODEL = process.env.AI_MODEL || 'kimi-k2.5:cloud';

// --- Verify URL mangling bug ---
const mangledBase = BASE_URL.replace(/\/+/g, '/').replace(/\/$/, '');
const correctBase  = BASE_URL.replace(/([^:])\/+/g, '$1/').replace(/\/$/, '');

console.log('=== URL Mangling Verification ===');
console.log('Original BASE_URL :', BASE_URL);
console.log('Mangled (BUG)     :', mangledBase + '/chat/completions');
console.log('Correct (FIXED)   :', correctBase  + '/chat/completions');
console.log('');

if (!API_KEY) {
  console.error('ERROR: AI_API_KEY not set in .env');
  process.exit(1);
}

const endpoint = correctBase + '/chat/completions';
console.log('=== Testing API at:', endpoint, '===');
console.log('Model:', MODEL);
console.log('');

const body = {
  model: MODEL,
  messages: [
    { role: 'system', content: 'You are a helpful assistant. Respond in 1 sentence.' },
    { role: 'user',   content: 'Say hello and confirm you are working.' },
  ],
  temperature: 0.2,
  max_tokens:  100,
};

try {
  const t0 = Date.now();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const latency = Date.now() - t0;
  const raw = await response.text();

  console.log('Status   :', response.status, response.statusText);
  console.log('Latency  :', latency, 'ms');
  console.log('Response :', raw.slice(0, 500));

  if (!response.ok) {
    console.error('\nERROR: API returned non-200 status');
    process.exit(1);
  }

  let json;
  try { json = JSON.parse(raw); } catch { console.error('ERROR: Not valid JSON'); process.exit(1); }

  const content = json?.choices?.[0]?.message?.content;
  console.log('\n=== Extracted Content ===');
  console.log(content ?? '(empty)');

  if (!content) {
    console.error('\nBUG CONFIRMED: API returned 200 but content is empty');
    console.log('Full choices:', JSON.stringify(json?.choices, null, 2));
  } else {
    console.log('\nSUCCESS: API is working correctly');
  }
} catch (err) {
  console.error('\nFATAL ERROR:', err.message);
  if (err.message.includes('parse URL') || err.message.includes('Invalid URL')) {
    console.error('URL was invalid — URL mangling bug confirmed!');
    console.error('Mangled endpoint was:', mangledBase + '/chat/completions');
  }
}
