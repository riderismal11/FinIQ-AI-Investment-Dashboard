// Let's test the API key the user provided against known endpoints
import 'dotenv/config';

const NEW_API_KEY = "5953ed8fc98d4fc8b430c7bc8b955f67.w3aZKCIntUjBkH3-3zSUIGjI";

async function testEndpoint(name, url, model) {
  console.log(`\n--- Testing ${name} ---`);
  console.log(`URL: ${url}`);
  try {
    const res = await fetch(url + '/models', {
      headers: { 'Authorization': `Bearer ${NEW_API_KEY}` }
    });
    console.log(`Models Status: ${res.status}`);
    
    const chatRes = await fetch(url + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${NEW_API_KEY}` },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'Say hello' }],
        max_tokens: 10
      })
    });
    console.log(`Chat Status: ${chatRes.status}`);
    const text = await chatRes.text();
    console.log(`Chat Response: ${text.slice(0, 200)}`);
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }
}

async function run() {
  await testEndpoint('OpenCode Zen', 'https://opencode.ai/zen/v1', 'kimi-k2.5');
  await testEndpoint('Zhipu AI (GLM)', 'https://open.bigmodel.cn/api/paas/v4', 'glm-4');
}

run();
