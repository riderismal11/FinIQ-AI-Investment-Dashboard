import { MetricsStore } from '../server/observability.js';

// Lightweight runtime check to ensure the metrics store works without a test framework
(async () => {
  const store = MetricsStore.getInstance();
  store.reset();
  store.register('opencode', 'opencode-model', 50, true);
  store.register('opencode', 'opencode-model', 30, false);
  const snap = store.snapshot();
  if (typeof snap.totalInvocations !== 'number' || snap.totalInvocations < 2) {
    throw new Error('observability test failed: totalInvocations mismatch');
  }
  if (!snap.averageLatencyMs || typeof snap.averageLatencyMs !== 'number') {
    throw new Error('observability test failed: averageLatencyMs missing');
  }
  console.log('observability simple test PASSED');
})();
