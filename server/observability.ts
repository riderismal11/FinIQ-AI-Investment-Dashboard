// Lightweight observability for IA calls
export class MetricsStore {
  private static _instance: MetricsStore | null = null;
  private totalInvocations = 0;
  private totalLatencyMs = 0;
  private successes = 0;
  private failures = 0;
  private byProvider: Record<string, number> = {};
  private byModel: Record<string, number> = {};

  private constructor() {}

  public static getInstance(): MetricsStore {
    if (!MetricsStore._instance) MetricsStore._instance = new MetricsStore();
    return MetricsStore._instance;
  }

  public register(provider: string, model: string, latencyMs: number, success: boolean) {
    this.totalInvocations++;
    this.totalLatencyMs += latencyMs;
    if (success) this.successes++; else this.failures++;
    this.byProvider[provider] = (this.byProvider[provider] ?? 0) + 1;
    this.byModel[model] = (this.byModel[model] ?? 0) + 1;
  }

  public snapshot() {
    const avg = this.totalInvocations ? this.totalLatencyMs / this.totalInvocations : 0;
    return {
      totalInvocations: this.totalInvocations,
      averageLatencyMs: avg,
      successes: this.successes,
      failures: this.failures,
      byProvider: this.byProvider,
      byModel: this.byModel,
    };
  }

  public reset() {
    this.totalInvocations = 0;
    this.totalLatencyMs = 0;
    this.successes = 0;
    this.failures = 0;
    this.byProvider = {};
    this.byModel = {};
  }
}
