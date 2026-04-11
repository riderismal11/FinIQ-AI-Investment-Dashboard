const body = {
  message: "quiero invertir",
  history: [],
  language: "en",
  portfolio: { 
    totalAmount: 5000, 
    timeHorizon: 5, 
    riskProfile: "moderate", 
    assets: [
      { symbol: "VOO", name: "S&P 500", allocation: 0.5 },
      { symbol: "BND", name: "Bonds", allocation: 0.5 }
    ] 
  },
  metrics: { expectedReturn: 1000, annualCAGR: 0.1, volatility: 0.1, maxDrawdown: 0.1, sharpeRatio: 1, var95: 0.05 }
};

fetch("https://finiq-ai-investment-dashboard.onrender.com/api/ai/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
})
.then(r => r.text())
.then(console.log)
.catch(console.error);
