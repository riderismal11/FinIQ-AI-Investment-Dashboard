import 'dotenv/config';
import fs from 'fs';
import dotenv from 'dotenv';
const localEnv = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in localEnv) {
  process.env[k] = localEnv[k];
}

// Now dynamic import so config evaluates AFTER process.env is set
async function doTest() {
  const { chatWithBotServer } = await import('./server/aiHandlers.js');
  const { getServerConfig } = await import('./server/config.js');

  console.log('--- Probando pregunta al Chatbot ---');
  console.log('Pregunta: "quiero invertir en naturaleza"');
  try {
    const config = getServerConfig();
    console.log(`Current Provider config:`, config.ai.provider);
    
    // Test the prompt
    console.log('Enviando mensaje al servidor...');
    const response = await chatWithBotServer('quiero invertir en naturaleza', [], 'es');
    console.log('\n--- Respuesta del Chatbot ---');
    console.log(`Texto: \n${response.text || '(Sin texto)'}`);
    
    if (response.functionCalls && response.functionCalls.length > 0) {
      console.log(`\nLlamadas a funciones detectadas:`);
      console.log(JSON.stringify(response.functionCalls, null, 2));
    }
  } catch (error: any) {
    console.log(`Error en la consulta:`, error.message);
  }
}

doTest();
