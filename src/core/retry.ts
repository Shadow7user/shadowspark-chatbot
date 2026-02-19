import { logger } from "./logger.js";

/**
 * Shared retry utility for all external API / service calls (OpenAI, Twilio, etc.).
 *
 * Usage:
 *   import { withRetry } from "./retry.js";
 *
 *   const result = await withRetry(
 *     () => someExternalApiCall(),
 *     { requestId: jobId, operationName: "OpenAI generateText" }
 *   );
 *
 * Extending:
 *   Pass a custom `isRetryable` function to control which errors trigger retries.
 *   For example, to also retry HTTP 408 (Request Timeout):
 *
 *   withRetry(fn, {
 *     isRetryable: (err) => isTransientError(err) || getHttpStatus(err) === 408,
 *   });
 */

/** Maximum number of retry attempts (not counting the initial try). */
export const MAX_RETRIES = 5;

/** Base delay in milliseconds; doubled on each successive attempt (exponential backoff). */
const BASE_DELAY_MS = 500;

export interface RetryOptions {
  /** Maximum retry attempts after the first failure. Default: 5. */
  maxRetries?: number;
  /** Starting backoff delay in ms (doubles each retry). Default: 500 ms. */
  baseDelayMs?: number;
  /** Identifier surfaced in every retry/failure log entry (e.g. conversationId, jobId). */
  requestId?: string;
  /** Human-readable label for the operation shown in log messages. */
  operationName?: string;
  /**
   * Predicate that decides whether a given error should trigger a retry.
   * Defaults to `isTransientError` which retries on network errors and
   * HTTP 429/500/502/503/504.
   *
   * To extend: supply your own predicate that can call `isTransientError`
   * and add additional conditions.
   */
  isRetryable?: (error: unknown) => boolean;
}

/**
 * Executes `fn` and retries up to `maxRetries` times on transient errors,
 * applying exponential backoff between attempts.
 *
 * - Each failed attempt is logged at WARN level with attempt count and next delay.
 * - If all retries are exhausted, the last error is logged at ERROR level and re-thrown.
 * - Non-retryable errors (auth, bad request) are re-thrown immediately without retrying.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = MAX_RETRIES,
    baseDelayMs = BASE_DELAY_MS,
    requestId,
    operationName = "API call",
    isRetryable = isTransientError,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isLast = attempt === maxRetries;
      const retryable = isRetryable(error);

      if (isLast || !retryable) {
        // All retries exhausted or non-retryable error — surface final failure.
        logger.error(
          {
            error,
            requestId,
            attempt: attempt + 1,
            totalAttempts: maxRetries + 1,
            retryable,
          },
          `[retry] ${operationName} failed permanently after ${attempt + 1} attempt(s) — user-friendly fallback should be returned to the caller`
        );
        throw error;
      }

      // Transient failure — log and wait before next attempt.
      const delayMs = baseDelayMs * Math.pow(2, attempt);
      logger.warn(
        {
          error,
          requestId,
          attempt: attempt + 1,
          totalAttempts: maxRetries + 1,
          retryInMs: delayMs,
          httpStatus: getHttpStatus(error),
        },
        `[retry] ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}) — retrying in ${delayMs} ms`
      );

      await sleep(delayMs);
    }
  }

  // TypeScript: this line is unreachable but satisfies exhaustiveness.
  throw lastError;
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns the HTTP status code from an error object, or null if not present.
 * Handles common SDK shapes: `error.status`, `error.statusCode`,
 * `error.response.status`, `error.response.statusCode`.
 *
 * Exported so callers can compose their own `isRetryable` predicates.
 */
export function getHttpStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;

  const e = error as Record<string, unknown>;

  if (typeof e["status"] === "number") return e["status"] as number;
  if (typeof e["statusCode"] === "number") return e["statusCode"] as number;

  const resp = e["response"];
  if (resp && typeof resp === "object") {
    const r = resp as Record<string, unknown>;
    if (typeof r["status"] === "number") return r["status"] as number;
    if (typeof r["statusCode"] === "number") return r["statusCode"] as number;
  }

  return null;
}

/**
 * Default retryability predicate.
 *
 * Returns true for:
 *   - Network/connection errors (ECONNRESET, ECONNREFUSED, ETIMEDOUT, timeouts, socket hang up)
 *   - HTTP 429 (Too Many Requests / rate limit)
 *   - HTTP 500, 502, 503, 504 (server-side transient errors)
 *
 * Returns false for:
 *   - HTTP 400 (bad request)
 *   - HTTP 401 / 403 (authentication / authorization — retrying won't help)
 *   - HTTP 404 (not found)
 *   - Any other non-transient error
 *
 * To extend: pass a custom `isRetryable` option to `withRetry`.
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("econnreset") ||
      msg.includes("econnrefused") ||
      msg.includes("etimedout") ||
      msg.includes("timeout") ||
      msg.includes("network") ||
      msg.includes("socket hang up")
    ) {
      return true;
    }
  }

  const status = getHttpStatus(error);
  if (status !== null) {
    return [429, 500, 502, 503, 504].includes(status);
  }

  return false;
}
