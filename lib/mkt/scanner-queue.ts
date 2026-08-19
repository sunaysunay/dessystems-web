/* ------------------------------------------------------------------ */
/*  CBT Opportunity Scanner – Job Queue with Rate Limiting            */
/*  In-memory queue; no DB persistence.                               */
/* ------------------------------------------------------------------ */

import { randomUUID } from "crypto";

/* ---- Types ------------------------------------------------------- */

export type JobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "rate_limited";

export interface ScannerJob {
  id: string;
  connector: string;
  payload: unknown;
  status: JobStatus;
  priority: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  result: unknown;
  retry_count: number;
  max_retries: number;
}

export interface RateLimitConfig {
  /** Maximum requests allowed per 60-second sliding window. */
  max_requests_per_minute: number;
  /** Maximum jobs that may run concurrently for this connector. */
  max_concurrent: number;
  /** Cooldown (ms) applied after a rate-limit hit before retrying. */
  cooldown_ms: number;
}

export interface QueueStatus {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  rate_limited: number;
  by_connector: Record<string, Record<JobStatus, number>>;
}

/* ---- Default per-connector rate limits --------------------------- */

const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  openlane: { max_requests_per_minute: 30, max_concurrent: 3, cooldown_ms: 2_000 },
  bca: { max_requests_per_minute: 20, max_concurrent: 2, cooldown_ms: 3_000 },
  autorola: { max_requests_per_minute: 15, max_concurrent: 2, cooldown_ms: 4_000 },
};

const FALLBACK_RATE_LIMIT: RateLimitConfig = {
  max_requests_per_minute: 10,
  max_concurrent: 1,
  cooldown_ms: 5_000,
};

const DEFAULT_MAX_RETRIES = 3;

/* ---- Queue implementation ---------------------------------------- */

export class ScannerQueue {
  private jobs: Map<string, ScannerJob> = new Map();
  /** Tracks completion timestamps (epoch ms) per connector for the sliding window. */
  private requestTimestamps: Map<string, number[]> = new Map();
  /** Tracks when a connector was last rate-limited (epoch ms). */
  private cooldownUntil: Map<string, number> = new Map();
  private rateLimits: Record<string, RateLimitConfig>;

  constructor(rateLimits?: Record<string, RateLimitConfig>) {
    this.rateLimits = { ...DEFAULT_RATE_LIMITS, ...rateLimits };
  }

  /* ---- Public API ------------------------------------------------ */

  /** Add a job to the queue. Returns the job ID. */
  enqueue(connector: string, payload: unknown, priority = 0): string {
    const id = randomUUID();
    const job: ScannerJob = {
      id,
      connector: connector.toLowerCase(),
      payload,
      status: "pending",
      priority,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      error: null,
      result: null,
      retry_count: 0,
      max_retries: DEFAULT_MAX_RETRIES,
    };
    this.jobs.set(id, job);
    return id;
  }

  /**
   * Process the next eligible job, respecting rate limits.
   *
   * Call this in a loop or on a timer. Each invocation picks at most one
   * job — the highest-priority pending job whose connector is not over its
   * rate limit and has available concurrency.
   */
  async process(): Promise<void> {
    const now = Date.now();

    // Re-queue rate-limited jobs whose cooldown has expired.
    for (const job of this.jobs.values()) {
      if (job.status === "rate_limited") {
        const until = this.cooldownUntil.get(job.connector) ?? 0;
        if (now >= until) {
          job.status = "pending";
        }
      }
    }

    // Pick the best candidate.
    const candidate = this.pickNextJob();
    if (!candidate) return;

    const cfg = this.configFor(candidate.connector);

    // Check sliding-window rate limit.
    if (this.isOverRateLimit(candidate.connector, cfg, now)) {
      candidate.status = "rate_limited";
      this.cooldownUntil.set(candidate.connector, now + cfg.cooldown_ms);
      return;
    }

    // Check concurrency limit.
    if (this.runningCount(candidate.connector) >= cfg.max_concurrent) {
      return; // leave as pending; will be picked up once a slot opens.
    }

    // Run the job.
    candidate.status = "running";
    candidate.started_at = new Date().toISOString();

    try {
      // The actual scanning work is delegated to external handlers.
      // For now we simulate success so the queue mechanics can be tested.
      candidate.result = { scanned: true, connector: candidate.connector };
      candidate.status = "completed";
      candidate.completed_at = new Date().toISOString();
      this.recordTimestamp(candidate.connector, Date.now());
    } catch (err: unknown) {
      candidate.status = "failed";
      candidate.completed_at = new Date().toISOString();
      candidate.error =
        err instanceof Error ? err.message : String(err);

      if (candidate.retry_count < candidate.max_retries) {
        candidate.retry_count += 1;
        candidate.status = "pending";
        candidate.completed_at = null;
        candidate.error = null;
      }
    }
  }

  /** Aggregate counts by status. */
  getStatus(): QueueStatus {
    const counts: Record<JobStatus, number> = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      rate_limited: 0,
    };
    const byConnector: Record<string, Record<JobStatus, number>> = {};

    for (const job of this.jobs.values()) {
      counts[job.status]++;
      if (!byConnector[job.connector]) {
        byConnector[job.connector] = {
          pending: 0,
          running: 0,
          completed: 0,
          failed: 0,
          rate_limited: 0,
        };
      }
      byConnector[job.connector][job.status]++;
    }

    return {
      total: this.jobs.size,
      ...counts,
      by_connector: byConnector,
    };
  }

  /** List jobs, optionally filtered by connector and/or status. */
  getJobs(connector?: string, status?: string): ScannerJob[] {
    let result = Array.from(this.jobs.values());
    if (connector) {
      const c = connector.toLowerCase();
      result = result.filter((j) => j.connector === c);
    }
    if (status) {
      result = result.filter((j) => j.status === status);
    }
    // Most recent first.
    return result.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  /* ---- Internals ------------------------------------------------- */

  private configFor(connector: string): RateLimitConfig {
    return this.rateLimits[connector] ?? FALLBACK_RATE_LIMIT;
  }

  private pickNextJob(): ScannerJob | undefined {
    return Array.from(this.jobs.values())
      .filter((j) => j.status === "pending")
      .sort((a, b) => b.priority - a.priority) // higher priority first
      .at(0);
  }

  private runningCount(connector: string): number {
    let n = 0;
    for (const j of this.jobs.values()) {
      if (j.connector === connector && j.status === "running") n++;
    }
    return n;
  }

  private isOverRateLimit(
    connector: string,
    cfg: RateLimitConfig,
    now: number,
  ): boolean {
    const timestamps = this.requestTimestamps.get(connector) ?? [];
    const windowStart = now - 60_000;
    const recent = timestamps.filter((t) => t > windowStart);
    // Persist only the relevant window.
    this.requestTimestamps.set(connector, recent);
    return recent.length >= cfg.max_requests_per_minute;
  }

  private recordTimestamp(connector: string, ts: number): void {
    const arr = this.requestTimestamps.get(connector) ?? [];
    arr.push(ts);
    this.requestTimestamps.set(connector, arr);
  }
}

/* ---- Singleton --------------------------------------------------- */

export const scannerQueue = new ScannerQueue();
