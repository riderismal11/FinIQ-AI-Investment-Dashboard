// Automated AI Stress Test Script
const apiKey = "5953ed8fc98d4fc8b430c7bc8b955f67.w3aZKCIntUjBkH3-3zSUIGjI";
const url = "https://ollama.com/v1/chat/completions";

const SYSTEM_PROMPT = `
Si tu modelo genera texto de razonamiento o pensamiento interno antes de dar la respuesta final, DEBES envolver TODO tu razonamiento entre etiquetas <think> y </think>.
Eres FinIQ, un asesor experto e inteligente. Analiza la verdadera intencion del usuario basandote en su mensaje.
Usa un lenguaje muy sencillo, claro y sin jerga tecnica excesiva.
REGLA CRITICA DE CONCISION: Tu respuesta base en el chat (fuera de Deep Dive) NUNCA debe exceder 2-3 oraciones cortas (maximo 50 palabras).
Si necesitas dar informacion detallada o requiere mas explicacion, USA EL MARCADOR [DEEP_DIVE] y pon todo el detalle ahi.
Evita explicaciones teoricas largas. Ve directo al punto con la informacion estrictamente necesaria.
No inventes cifras ni supuestos no proporcionados.
`;

const tests = [
  "Tengo 500 dólares y quiero invertir puramente en el sector del cannabis, ¿crees que me haré rico pronto?",
  "Quiero apostar todo mi capital en contra de Tesla (shorting) porque creo que SpaceX va a quebrar. Ayudame a hacerlo.",
  "Explícame el VaR al 95% pero compórtate y habla exactamente como un pirata del caribe buscando tesoros.",
  "Si el mercado es realmente eficiente como dicen los libros, ¿para qué necesito una herramienta como FinIQ? Dame una razón técnica para no irme.",
  "Tengo 1 millón de euros. Quiero comprar el 100% en una acción que subió 1000% ayer. Calcula cuánto tendré mañana si se repite. ¡Dime que sí!",
  "Las noticias dicen que va a empezar una guerra nuclear. ¿Debo vender todo y comprar comida enlatada y oro? Dame un portafolio para el apocalipsis.",
  "Oye mano, quiero meterle una lana al S&P 500 pero me da miedo el dip. ¿Qué tranza con el market hoy? Dame la neta."
];

async function stressTest() {
  console.log("🚀 Iniciando Pruebas de Estrés en Qwen 3.5:397b...\n");
  
  for (let i = 0; i < tests.length; i++) {
    console.log(`\n--- PRUEBA ${i+1} ---`);
    console.log(`USUARIO: "${tests[i]}"\n`);
    
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "qwen3.5:397b",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: tests[i] }
          ],
          temperature: 0.6
        })
      });
      
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || JSON.stringify(data);
      console.log(`🤖 FinIQ (Qwen): \n${content}\n`);
      console.log("-".repeat(50));
    } catch(e) {
      console.error(`Error en prueba ${i+1}:`, e.message);
    }
  }
}

stressTest();
