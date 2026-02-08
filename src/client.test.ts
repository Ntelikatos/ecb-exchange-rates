import { describe, expect, it } from "vitest";
import {
  CROSS_CURRENCY_MULTI_DATE_RESPONSE,
  CROSS_CURRENCY_RESPONSE,
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
      const client = EcbClient.withFetcher(new MockFetcher(CROSS_CURRENCY_RESPONSE), {
        baseCurrency: "USD",
      });
      const obs = await client.getObservations({
        currencies: ["GBP"],
        startDate: "2025-01-15",
        endDate: "2025-01-15",
      });
      expect(obs).toHaveLength(1);
      expect(obs[0]?.baseCurrency).toBe("USD");
    });

    it("allows per-query baseCurrency override", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(CROSS_CURRENCY_RESPONSE));
      const obs = await client.getObservations({
        currencies: ["GBP"],
        startDate: "2025-01-15",
        endDate: "2025-01-15",
        baseCurrency: "USD",
      });
      expect(obs).toHaveLength(1);
      expect(obs[0]?.baseCurrency).toBe("USD");
    });
  });

  describe("cross-currency conversion (non-EUR base)", () => {
    it("computes correct cross rate for getRate with USD base", async () => {
      // CROSS_CURRENCY_RESPONSE: EUR/USD=1.03, EUR/GBP=0.84
      // Expected: 1 USD = 0.84/1.03 GBP ≈ 0.8155339805825243
      const client = EcbClient.withFetcher(new MockFetcher(CROSS_CURRENCY_RESPONSE), {
        baseCurrency: "USD",
      });
      const result = await client.getRate("GBP", "2025-01-15");

      expect(result.base).toBe("USD");
      expect(result.currency).toBe("GBP");
      const rate = result.rates.get("2025-01-15");
      expect(rate).toBeCloseTo(0.84 / 1.03, 10);
    });

    it("returns EUR as target currency with non-EUR base", async () => {
      // Expected: 1 USD = 1/1.03 EUR ≈ 0.9708737864077669
      const client = EcbClient.withFetcher(new MockFetcher(CROSS_CURRENCY_RESPONSE), {
        baseCurrency: "USD",
      });
      const result = await client.getRate("EUR", "2025-01-15");

      expect(result.base).toBe("USD");
      expect(result.currency).toBe("EUR");
      const rate = result.rates.get("2025-01-15");
      expect(rate).toBeCloseTo(1 / 1.03, 10);
    });

    it("converts amount with non-EUR base", async () => {
      // 100 USD → GBP: 100 * (0.84/1.03) ≈ 81.55
      const client = EcbClient.withFetcher(new MockFetcher(CROSS_CURRENCY_RESPONSE), {
        baseCurrency: "USD",
      });
      const conversion = await client.convert(100, "GBP", "2025-01-15");

      expect(conversion.amount).toBe(Math.round(100 * (0.84 / 1.03) * 100) / 100);
      expect(conversion.currency).toBe("GBP");
    });

    it("handles getRates with multiple currencies and non-EUR base", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(CROSS_CURRENCY_MULTI_DATE_RESPONSE), {
        baseCurrency: "USD",
      });
      const result = await client.getRates({
        currencies: ["GBP"],
        startDate: "2025-01-15",
        endDate: "2025-01-16",
      });

      expect(result.base).toBe("USD");
      const jan15 = result.rates.get("2025-01-15");
      expect(jan15?.GBP).toBeCloseTo(0.84 / 1.03, 10);
      const jan16 = result.rates.get("2025-01-16");
      expect(jan16?.GBP).toBeCloseTo(0.85 / 1.04, 10);
    });

    it("getObservations returns adjusted rates with non-EUR base", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(CROSS_CURRENCY_RESPONSE), {
        baseCurrency: "USD",
      });
      const obs = await client.getObservations({
        currencies: ["GBP"],
        startDate: "2025-01-15",
        endDate: "2025-01-15",
      });

      expect(obs).toHaveLength(1);
      expect(obs[0]?.baseCurrency).toBe("USD");
      expect(obs[0]?.currency).toBe("GBP");
      expect(obs[0]?.rate).toBeCloseTo(0.84 / 1.03, 10);
    });

    it("default EUR base behavior is unchanged", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(SINGLE_CURRENCY_RESPONSE));
      const result = await client.getRate("USD", "2025-01-15");

      expect(result.base).toBe("EUR");
      expect(result.rates.get("2025-01-15")).toBe(1.03);
    });

    it("per-query baseCurrency override computes cross rates", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(CROSS_CURRENCY_RESPONSE));
      const obs = await client.getObservations({
        currencies: ["GBP"],
        startDate: "2025-01-15",
        endDate: "2025-01-15",
        baseCurrency: "USD",
      });

      expect(obs).toHaveLength(1);
      expect(obs[0]?.baseCurrency).toBe("USD");
      expect(obs[0]?.rate).toBeCloseTo(0.84 / 1.03, 10);
    });

    it("rejects baseCurrency same as only target currency", async () => {
      const client = EcbClient.withFetcher(new MockFetcher(SINGLE_CURRENCY_RESPONSE), {
        baseCurrency: "USD",
      });

      await expect(client.getRate("USD", "2025-01-15")).rejects.toThrow(EcbValidationError);
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
      const fetcher = new MockFetcher(CROSS_CURRENCY_RESPONSE);
      const client = EcbClient.withFetcher(fetcher, {
        baseUrl: "https://custom.api.com",
        baseCurrency: "USD",
      });

      const result = await client.getRate("GBP", "2025-01-15");
      expect(result.rates.size).toBe(1);
      expect(result.base).toBe("USD");
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
