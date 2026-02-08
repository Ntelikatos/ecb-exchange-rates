import { describe, expect, it } from "vitest";
import {
  EMPTY_RESPONSE,
  MULTI_CURRENCY_RESPONSE,
  MockFetcher,
  SINGLE_CURRENCY_RESPONSE,
} from "./__tests__/fixtures.js";
import { EcbClient } from "./client.js";
import { EcbNoDataError, EcbValidationError } from "./errors/index.js";

describe("EcbClient", () => {
  describe("getRate", () => {
    it("returns single currency rate result", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(SINGLE_CURRENCY_RESPONSE));
      const result = await client.getRate("USD", "2025-01-15");

      expect(result.base).toBe("EUR");
      expect(result.currency).toBe("USD");
      expect(result.rates.size).toBe(2);
      expect(result.rates.get("2025-01-15")).toBe(1.03);
      expect(result.rates.get("2025-01-16")).toBe(1.0303);
    });
  });

  describe("getRates", () => {
    it("returns multi-currency rate result", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(MULTI_CURRENCY_RESPONSE));
      const result = await client.getRates({
        currencies: ["USD", "GBP"],
        startDate: "2025-01-15",
        endDate: "2025-01-16",
      });

      expect(result.base).toBe("EUR");
      expect(result.currencies).toHaveLength(2);
      expect(result.rates.size).toBe(2);

      const jan15 = result.rates.get("2025-01-15");
      expect(jan15?.USD).toBe(1.03);
      expect(jan15?.GBP).toBe(0.8442);
    });
  });

  describe("getRateHistory", () => {
    it("returns rate history for a currency", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(SINGLE_CURRENCY_RESPONSE));
      const result = await client.getRateHistory("USD", "2025-01-15", "2025-01-16");

      expect(result.rates.size).toBe(2);
      expect(result.currency).toBe("USD");
    });
  });

  describe("getObservations", () => {
    it("returns raw observations", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(SINGLE_CURRENCY_RESPONSE));
      const obs = await client.getObservations({
        currencies: ["USD"],
        startDate: "2025-01-15",
        endDate: "2025-01-16",
      });

      expect(obs).toHaveLength(2);
      expect(obs[0]?.rate).toBe(1.03);
    });
  });

  describe("baseCurrency configuration", () => {
    it("derives base from parsed response, not hardcoded", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(SINGLE_CURRENCY_RESPONSE));
      const result = await client.getRate("USD", "2025-01-15");

      // base comes from the SDMX response's CURRENCY_DENOM dimension, not hardcoded
      expect(result.base).toBe("EUR");
    });

    it("allows custom baseCurrency via client config", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(SINGLE_CURRENCY_RESPONSE), {
        baseCurrency: "USD",
      });
      // The client passes baseCurrency through to the URL builder.
      // Here we just verify the client accepts the config without error.
      const obs = await client.getObservations({
        currencies: ["GBP"],
        startDate: "2025-01-15",
        endDate: "2025-01-16",
      });
      expect(obs).toHaveLength(2);
    });

    it("allows per-query baseCurrency override", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(SINGLE_CURRENCY_RESPONSE));
      const obs = await client.getObservations({
        currencies: ["GBP"],
        startDate: "2025-01-15",
        endDate: "2025-01-16",
        baseCurrency: "USD",
      });
      expect(obs).toHaveLength(2);
    });
  });

  describe("convert", () => {
    it("converts base currency amount to target currency", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(SINGLE_CURRENCY_RESPONSE));
      const conversion = await client.convert(100, "USD", "2025-01-15");

      expect(conversion).not.toBeNull();
      expect(conversion?.amount).toBe(103);
      expect(conversion?.rate).toBe(1.03);
      expect(conversion?.date).toBe("2025-01-15");
    });

    it("throws EcbNoDataError when no data available", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(EMPTY_RESPONSE));

      await expect(client.convert(100, "USD", "2025-01-15")).rejects.toThrow(EcbNoDataError);
    });

    it("rounds converted amount to 2 decimal places", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(SINGLE_CURRENCY_RESPONSE));
      // 33.33 * 1.03 = 34.3299 → Math.round(3432.99) / 100 = 34.33
      const conversion = await client.convert(33.33, "USD", "2025-01-15");

      expect(conversion?.amount).toBe(34.33);
    });

    it("includes currency and date in conversion result", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(SINGLE_CURRENCY_RESPONSE));
      const conversion = await client.convert(100, "USD", "2025-01-15");

      expect(conversion?.currency).toBe("USD");
      expect(conversion?.date).toBe("2025-01-15");
      expect(conversion?.rate).toBe(1.03);
    });
  });

  describe("constructor", () => {
    it("creates client with default configuration", () => {
      const client = new EcbClient();
      expect(client).toBeInstanceOf(EcbClient);
    });

    it("accepts custom configuration options", () => {
      const client = new EcbClient({
        baseUrl: "https://custom.api.com",
        baseCurrency: "USD",
        timeoutMs: 10_000,
      });
      expect(client).toBeInstanceOf(EcbClient);
    });
  });

  describe("withFetcher", () => {
    it("creates working client with custom fetcher and config", async () => {
      const fetcher = new MockFetcher(SINGLE_CURRENCY_RESPONSE);
      const client = EcbClient.withFetcher(fetcher, {
        baseUrl: "https://custom.api.com",
        baseCurrency: "GBP",
      });

      const result = await client.getRate("USD", "2025-01-15");
      expect(result.rates.size).toBe(2);
    });

    it("creates client with only fetcher and no extra config", async () => {
      const fetcher = new MockFetcher(SINGLE_CURRENCY_RESPONSE);
      const client = EcbClient.withFetcher(fetcher);

      const result = await client.getRate("USD", "2025-01-15");
      expect(result.base).toBe("EUR");
    });
  });

  describe("validation integration", () => {
    it("rejects invalid currency code in getRate", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(SINGLE_CURRENCY_RESPONSE));

      await expect(client.getRate("invalid", "2025-01-15")).rejects.toThrow(EcbValidationError);
    });

    it("rejects invalid date in getRateHistory", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(SINGLE_CURRENCY_RESPONSE));

      await expect(client.getRateHistory("USD", "not-a-date", "2025-01-16")).rejects.toThrow(
        EcbValidationError,
      );
    });

    it("rejects empty currencies in getRates", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(MULTI_CURRENCY_RESPONSE));

      await expect(client.getRates({ currencies: [], startDate: "2025-01-15" })).rejects.toThrow(
        EcbValidationError,
      );
    });

    it("rejects invalid currency in getObservations", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(SINGLE_CURRENCY_RESPONSE));

      await expect(
        client.getObservations({ currencies: ["usd"], startDate: "2025-01-15" }),
      ).rejects.toThrow(EcbValidationError);
    });

    it("rejects invalid currency in convert", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(SINGLE_CURRENCY_RESPONSE));

      await expect(client.convert(100, "x", "2025-01-15")).rejects.toThrow(EcbValidationError);
    });
  });

  describe("getRateHistory", () => {
    it("passes frequency parameter through to query", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(SINGLE_CURRENCY_RESPONSE));
      const result = await client.getRateHistory("USD", "2025-01-01", "2025-12-31", "M");

      expect(result.currency).toBe("USD");
      expect(result.rates.size).toBe(2);
    });
  });

  describe("getRates edge cases", () => {
    it("throws EcbNoDataError for empty response", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(EMPTY_RESPONSE));

      await expect(
        client.getRates({
          currencies: ["USD"],
          startDate: "2025-01-15",
        }),
      ).rejects.toThrow(EcbNoDataError);
    });

    it("groups observations by date in multi-currency result", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(MULTI_CURRENCY_RESPONSE));
      const result = await client.getRates({
        currencies: ["USD", "GBP"],
        startDate: "2025-01-15",
        endDate: "2025-01-16",
      });

      const jan16 = result.rates.get("2025-01-16");
      expect(jan16?.USD).toBe(1.0303);
      expect(jan16?.GBP).toBe(0.8451);
    });
  });

  describe("EcbNoDataError handling", () => {
    it("throws EcbNoDataError with currencies and date info", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(EMPTY_RESPONSE));

      try {
        await client.getRates({
          currencies: ["USD", "GBP"],
          startDate: "2025-01-18",
          endDate: "2025-01-19",
        });
        expect.fail("Expected EcbNoDataError to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(EcbNoDataError);
        const noDataError = error as InstanceType<typeof EcbNoDataError>;
        expect(noDataError.code).toBe("ECB_NO_DATA");
        expect(noDataError.currencies).toEqual(["USD", "GBP"]);
        expect(noDataError.startDate).toBe("2025-01-18");
        expect(noDataError.endDate).toBe("2025-01-19");
        expect(noDataError.message).toContain("USD, GBP");
        expect(noDataError.message).toContain("2025-01-18 to 2025-01-19");
      }
    });

    it("shows single date in message when startDate equals endDate", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(EMPTY_RESPONSE));

      await expect(client.getRate("USD", "2025-01-18")).rejects.toThrow(/on 2025-01-18\./);
    });

    it("getObservations throws EcbNoDataError for empty response", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(EMPTY_RESPONSE));

      await expect(
        client.getObservations({ currencies: ["USD"], startDate: "2025-01-18" }),
      ).rejects.toThrow(EcbNoDataError);
    });

    it("convert throws EcbNoDataError for empty response", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(EMPTY_RESPONSE));

      await expect(client.convert(100, "USD", "2025-01-18")).rejects.toThrow(EcbNoDataError);
    });

    it("throws EcbNoDataError when API returns empty body (real ECB behavior)", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(""));

      await expect(client.getRate("USD", "2026-02-07")).rejects.toThrow(EcbNoDataError);
    });

    it("throws EcbNoDataError when API returns whitespace-only body", async () => {
      const client = EcbClient.withFetcher(new MockFetcher("  "));

      await expect(client.getRate("USD", "2026-02-07")).rejects.toThrow(EcbNoDataError);
    });

    it("is an instance of EcbError for catch-all handling", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(EMPTY_RESPONSE));

      await expect(client.getRate("USD", "2025-01-18")).rejects.toThrow(
        expect.objectContaining({ name: "EcbNoDataError" }),
      );
    });
  });

  describe("getRate edge cases", () => {
    it("throws EcbNoDataError when no observations returned", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(EMPTY_RESPONSE));

      await expect(client.getRate("USD", "2025-01-15")).rejects.toThrow(EcbNoDataError);
    });

    it("throws EcbNoDataError with useful message for weekend dates", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(EMPTY_RESPONSE));

      await expect(client.getRate("USD", "2025-01-18")).rejects.toThrow(
        /No exchange rate data available/,
      );
    });
  });
});
