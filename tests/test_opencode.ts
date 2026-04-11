import { config } from 'dotenv';
config();
process.env.AI_PROVIDER = 'openai-compatible';
// If needed, override AI_MODEL
process.env.AI_MODEL = "deepseek-reasoner";
import { chatWithBotServer } from './server/aiHandlers';

async function test() {
  const response = await chatWithBotServer('quiero invertir', [], 'es');
  console.log("FINAL RESPONSE:", JSON.stringify(response));
}

void test();
