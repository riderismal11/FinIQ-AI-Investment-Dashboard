const url = "http://localhost:3001/api/ai/chat";

async function test() {
  const req = {
    message: "me gustaria invertir en la naturalesa",
    history: [],
    portfolio: { 
      assets: [{ symbol: 'AAPL', allocation: 1 }], 
      timeHorizon: 5, riskProfile: "aggressive", totalAmount: 10000 
    },
    metrics: { volatility: 0.15, maxDrawdown: 0.20, cagr: 0.12, sharpeRatio: 1.1 },
    language: "es"
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req)
    });
    console.log("Status:", res.status);
    const json = await res.json();
    console.log("Response:", JSON.stringify(json, null, 2));
  } catch(e) {
    console.error(e);
  }
}
test();
