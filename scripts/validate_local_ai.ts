// Direct Ollama CLOUD Test
async function testAI() {
  const apiKey = "5953ed8fc98d4fc8b430c7bc8b955f67.w3aZKCIntUjBkH3-3zSUIGjI";
  try {
    const res = await fetch("https://ollama.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen3.5:397b",
        messages: [
          { role: "system", content: "Eres FinIQ, un asesor experto en inversiones." },
          { role: "user", content: "Me gustaria invertir en la naturaleza y tecnologias renovables" }
        ],
        temperature: 0.7
      })
    });
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log(`Response:`);
    console.log(data.choices?.[0]?.message?.content || data);
  } catch(e) {
    console.error(e.message);
  }
}
testAI();
