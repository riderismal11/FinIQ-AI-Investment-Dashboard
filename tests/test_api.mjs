import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY is required to run test_api.mjs');
}

const ai = new GoogleGenAI({ apiKey });

async function testModel(model) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: 'Say hello' }] }],
      });
      console.log(`PASS ${model} on attempt ${attempt}`);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('429') || message.toLowerCase().includes('quota')) {
        console.warn(`Rate limited for ${model} on attempt ${attempt}; retrying in 10s.`);
        await new Promise((resolve) => setTimeout(resolve, 10000));
      } else {
        console.warn(`FAIL ${model}: ${message.slice(0, 120)}`);
        return;
      }
    }
  }

  console.warn(`FAIL ${model}: still rate limited after 3 attempts`);
}

await testModel('gemini-2.0-flash-lite');
await testModel('gemini-2.0-flash');
