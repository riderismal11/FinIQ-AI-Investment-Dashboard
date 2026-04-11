// ES Module version compatible with "type": "module" in package.json
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '..', '.env.local');

function writeEnvFromMap(map) {
  const lines = [];
  map.forEach((value, key) => {
    lines.push(`${key}=${value}`);
  });
  const content = lines.join('\n') + '\n';
  fs.writeFileSync(envPath, content, { encoding: 'utf8' });
  console.log(`Wrote OpenCode config to ${envPath}`);
}

function readExistingEnv(p) {
  const map = new Map();
  if (!fs.existsSync(p)) return map;
  const content = fs.readFileSync(p, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) map.set(m[1].trim(), m[2] ?? '');
  });
  return map;
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => {
    rl.close();
    resolve((ans || '').trim());
  }));
}

async function main() {
  console.log('\nOpenCode Setup: configure OpenCode API key securely.');
  console.log('This will write .env.local with only OpenCode related keys.');
  const existing = readExistingEnv(envPath);
  const ocKey = await prompt('OpenCode API Key (starts with sk-): ');
  const ocBase = await prompt('OpenCode Base URL (default https://api.opencode.ai/v1): ');
  const ocModel = await prompt('OpenCode Model (default opencode-default-model): ');
  const map = new Map(existing);
  map.set('AI_PROVIDER', 'opencode');
  map.set('AI_OPENCODE_API_KEY', ocKey || existing.get('AI_OPENCODE_API_KEY') || '');
  map.set('AI_OPENCODE_BASE_URL', (ocBase && ocBase.length > 0) ? ocBase : (existing.get('AI_OPENCODE_BASE_URL') ?? 'https://api.opencode.ai/v1'));
  map.set('AI_OPENCODE_MODEL', (ocModel && ocModel.length > 0) ? ocModel : (existing.get('AI_OPENCODE_MODEL') ?? 'opencode-default-model'));
  writeEnvFromMap(map);
}

main().catch((err) => {
  console.error('Error configuring OpenCode:', err);
  process.exit(1);
});
