// Try alternate base URLs for the OpenCode/Kimi API
import 'dotenv/config';

const API_KEY = process.env.AI_API_KEY;
if (!API_KEY) { console.error('AI_API_KEY not set'); process.exit(1); }

const MODEL = process.env.AI_MODEL || 'kimi-k2.5:cloud';

// Candidate base URLs for Kimi / Moonshot API
const candidates = [
  'https://api.moonshot.cn/v1',    // Moonshot AI (maker of Kimi)
  'https://api.moonshot.ai/v1',    // Alternate
  'https://api.kimi.ai/v1',       // Kimi direct
];

for (const base of candidates) {
  const url = base + '/chat/completions';
  console.log(`\n--- POST ${url} ---`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 10,
      }),
    });
    const text = await res.text();
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log(`Body: ${text.slice(0, 300)}`);
  } catch (e) {
    console.log(`Network Error: ${e.message}`);
  }
}
