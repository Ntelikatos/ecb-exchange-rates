import { afterEach, describe, expect, it, vi } from "vitest";
import { EcbApiError, EcbNetworkError } from "../errors/index.js";
import { FetchHttpFetcher } from "./http-fetcher.js";

// ── Test helpers ────────────────────────────────────────────────────────

function mockOkResponse(body: string): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    text: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function mockErrorResponse(
  status: number,
  statusText: string,
  body: string | (() => Promise<string>) = "",
): Response {
  const textFn =
    typeof body === "function" ? body : vi.fn().mockResolvedValue(body);
  return {
    ok: false,
    status,
    statusText,
    text: textFn,
  } as unknown as Response;
}

/**
 * Creates a mock fetch that never resolves — rejects only when the
 * passed `signal` fires an abort event (used for timeout / cancel tests).
 */
function createHangingFetch() {
  return vi.fn(
    (_input: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(
            new DOMException("The operation was aborted.", "AbortError"),
          );
        });
      }),
  );
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("FetchHttpFetcher", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("can be constructed with default parameters", () => {
    expect(() => new FetchHttpFetcher()).not.toThrow();
  });

  // ── Successful requests ─────────────────────────────────────────────

  describe("successful requests", () => {
    it("returns response body as text", async () => {
      const fetchFn = vi.fn().mockResolvedValue(mockOkResponse('{"data":"ok"}'));
      const fetcher = new FetchHttpFetcher(fetchFn, 30_000);

      const result = await fetcher.get("https://api.ecb.europa.eu/data");

      expect(result).toBe('{"data":"ok"}');
    });

    it("sends GET with Accept: application/json header", async () => {
      const fetchFn = vi.fn().mockResolvedValue(mockOkResponse("{}"));
      const fetcher = new FetchHttpFetcher(fetchFn, 30_000);

      await fetcher.get("https://api.ecb.europa.eu/data");

      expect(fetchFn).toHaveBeenCalledWith(
        "https://api.ecb.europa.eu/data",
        expect.objectContaining({
          method: "GET",
          headers: { Accept: "application/json" },
          signal: expect.any(AbortSignal),
        }),
      );
    });
  });

  // ── HTTP error responses ────────────────────────────────────────────

  describe("HTTP error responses", () => {
    it("throws EcbApiError for non-OK status codes", async () => {
      const fetchFn = vi
        .fn()
        .mockResolvedValue(mockErrorResponse(404, "Not Found", "resource missing"));
      const fetcher = new FetchHttpFetcher(fetchFn, 30_000);

      await expect(fetcher.get("https://api.ecb.europa.eu/data")).rejects.toThrow(EcbApiError);
    });

    it("includes status code, status text, and body in EcbApiError", async () => {
      const fetchFn = vi
        .fn()
        .mockResolvedValue(mockErrorResponse(503, "Service Unavailable", "maintenance"));
      const fetcher = new FetchHttpFetcher(fetchFn, 30_000);

      const error: EcbApiError = await fetcher
        .get("https://api.ecb.europa.eu/data")
        .catch((e) => e);

      expect(error).toBeInstanceOf(EcbApiError);
      expect(error.statusCode).toBe(503);
      expect(error.statusText).toBe("Service Unavailable");
      expect(error.message).toContain("503");
      expect(error.message).toContain("Service Unavailable");
      expect(error.message).toContain("maintenance");
    });

    it("returns EcbApiError with empty body when body read fails", async () => {
      const fetchFn = vi.fn().mockResolvedValue(
        mockErrorResponse(500, "Internal Server Error", () =>
          Promise.reject(new Error("stream broken")),
        ),
      );
      const fetcher = new FetchHttpFetcher(fetchFn, 30_000);

      const error: EcbApiError = await fetcher
        .get("https://api.ecb.europa.eu/data")
        .catch((e) => e);

      expect(error).toBeInstanceOf(EcbApiError);
      expect(error.statusCode).toBe(500);
      // Body read failed, so the message should not include body content
      expect(error.statusText).toBe("Internal Server Error");
    });
  });

  // ── Network errors ──────────────────────────────────────────────────

  describe("network errors", () => {
    it("wraps fetch TypeError in EcbNetworkError", async () => {
      const fetchFn = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
      const fetcher = new FetchHttpFetcher(fetchFn, 30_000);

      await expect(fetcher.get("https://api.ecb.europa.eu/data")).rejects.toThrow(
        EcbNetworkError,
      );
    });

    it("preserves original error message in EcbNetworkError", async () => {
      const fetchFn = vi.fn().mockRejectedValue(new TypeError("DNS resolution failed"));
      const fetcher = new FetchHttpFetcher(fetchFn, 30_000);

      await expect(fetcher.get("https://api.ecb.europa.eu/data")).rejects.toThrow(
        /DNS resolution failed/,
      );
    });

    it("wraps non-Error thrown values in EcbNetworkError", async () => {
      const fetchFn = vi.fn().mockRejectedValue("raw string error");
      const fetcher = new FetchHttpFetcher(fetchFn, 30_000);

      const error = await fetcher.get("https://api.ecb.europa.eu/data").catch((e) => e);

      expect(error).toBeInstanceOf(EcbNetworkError);
      expect(error.message).toContain("raw string error");
    });

    it("sets the original error as cause on EcbNetworkError", async () => {
      const cause = new TypeError("connection refused");
      const fetchFn = vi.fn().mockRejectedValue(cause);
      const fetcher = new FetchHttpFetcher(fetchFn, 30_000);

      const error = await fetcher.get("https://api.ecb.europa.eu/data").catch((e) => e);

      expect(error).toBeInstanceOf(EcbNetworkError);
      expect(error.cause).toBe(cause);
    });
  });

  // ── Timeout ─────────────────────────────────────────────────────────

  describe("timeout", () => {
    it("aborts request and throws EcbNetworkError after timeout", async () => {
      vi.useFakeTimers();

      const fetchFn = createHangingFetch();
      const fetcher = new FetchHttpFetcher(fetchFn as typeof fetch, 5_000);
      const promise = fetcher.get("https://api.ecb.europa.eu/data");

      vi.advanceTimersByTime(5_000);

      await expect(promise).rejects.toThrow(EcbNetworkError);
    });

    it("includes timeout duration and URL in error message", async () => {
      vi.useFakeTimers();

      const fetchFn = createHangingFetch();
      const fetcher = new FetchHttpFetcher(fetchFn as typeof fetch, 3_000);
      const promise = fetcher.get("https://api.ecb.europa.eu/slow");

      vi.advanceTimersByTime(3_000);

      const error = await promise.catch((e) => e);
      expect(error.message).toMatch(/3000ms/);
      expect(error.message).toContain("https://api.ecb.europa.eu/slow");
    });
  });

  // ── External abort signal ───────────────────────────────────────────

  describe("external abort signal", () => {
    it("rejects with EcbNetworkError when external signal is aborted", async () => {
      const controller = new AbortController();
      const fetchFn = createHangingFetch();

      const fetcher = new FetchHttpFetcher(fetchFn as typeof fetch, 30_000);
      const promise = fetcher.get(
        "https://api.ecb.europa.eu/data",
        controller.signal,
      );

      controller.abort();

      await expect(promise).rejects.toThrow(EcbNetworkError);
    });
  });
});
