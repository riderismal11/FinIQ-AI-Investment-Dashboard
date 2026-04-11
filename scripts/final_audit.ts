import {
  calculateExpectedGain,
  recalculatePortfolio,
  upsertAssetAllocation,
  calculateMetrics,
} from '../src/services/financeService.js';
import type { Asset, Portfolio } from '../src/types.js';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function runAudit() {
  console.log('🧪 Starting Mathematical Audit');

  // Test #1: Expected Gain Limits
  // $100M at 25% (max allowed) for 50 years (to see if it overflows JS limits)
  const extremeGain = calculateExpectedGain(100000000, 0.25, 50);
  console.log('Extreme Gain (100M @ 25% for 50y):', extremeGain.toLocaleString());
  assert(Number.isFinite(extremeGain), 'Extreme gain should be finite');

  // Test #2: Allocation Sanitization to precisely 1.0 (100%)
  const messyAssets: Asset[] = [
    { symbol: 'AAPL', name: 'Apple', allocation: 0.333333, type: 'Stock' },
    { symbol: 'TSLA', name: 'Tesla', allocation: 0.333333, type: 'Stock' },
    { symbol: 'MSFT', name: 'Microsoft', allocation: 0.333333, type: 'Stock' },
  ];
  const reallocated = recalculatePortfolio(messyAssets, 100000000);
  const totalAlloc = reallocated.reduce((sum, a) => sum + a.allocation, 0);
  console.log('Sanitized Total Allocation (should be 1.0):', totalAlloc);
  // Using 0.0001 precision because floats are imperfect, but the engine should force exactly 1.0
  assert(Math.abs(totalAlloc - 1.0) < 0.0001, 'Allocations must sum exactly to 100%');

  // Test #3: Money distribution exactness
  const totalMoneyDistributed = reallocated.reduce((sum, a) => sum + (a.amount || 0), 0);
  console.log('Sanitized Money Total:', totalMoneyDistributed);
  assert(totalMoneyDistributed === 100000000, 'Distributed money should perfectly sum to total capital');

  // Test #4: Extrapolated VaR and Risk metrics bounds
  const badPortfolio: Portfolio = {
    assets: [{ symbol: 'BTC-USD', name: 'Bitcoin', allocation: 1.0, type: 'Crypto' }],
    totalAmount: 100000000,
    timeHorizon: 5,
    riskProfile: 'aggressive',
    isCustom: true
  };
  const badMetrics = calculateMetrics(badPortfolio);
  console.log('Volatility capped bounds check:', badMetrics.volatility);
  console.log('Max Drawdown bounds check:', badMetrics.maxDrawdown);
  // Math bounds must hold
  assert(badMetrics.maxDrawdown <= 0.95, 'Max Drawdown should absolutely cap at 95% loss');
  assert(badMetrics.annualCAGR <= 0.25, 'CAGR should cap at highest institutional boundary fallback (25%)');

  console.log('✅ Mathematical Engine PASSED all bounds check constraints.');
}

try {
  runAudit();
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
