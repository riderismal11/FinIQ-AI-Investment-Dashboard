import { smartFallback } from './server/aiHandlers';

async function test() {
  const response = await smartFallback('I want 40% annual return', 'en', undefined, undefined, true);
  console.log(`PASS fallback returned ${response?.functionCalls.length ?? 0} function call(s)`);
}

void test();
