import { chatWithBotServer } from './server/aiHandlers';

async function test() {
  try {
    const response = await chatWithBotServer('I want 40% annual return', [], 'en');
    console.log(`PASS chat returned ${response.functionCalls?.length ?? 0} function call(s)`);
  } catch (error) {
    console.warn(`FAIL chat test: ${error instanceof Error ? error.message : String(error)}`);
  }
}

void test();
