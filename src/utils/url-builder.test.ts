import { describe, expect, it } from "vitest";
import { buildExchangeRateUrl } from "./url-builder.js";

describe("buildExchangeRateUrl", () => {
  it("builds correct URL for a single currency with date range", () => {
    const url = buildExchangeRateUrl({
      currencies: ["USD"],
      startDate: "2025-01-15",
      endDate: "2025-01-15",
    });

    expect(url).toContain("/data/EXR/D.USD.EUR.SP00.A");
    expect(url).toContain("startPeriod=2025-01-15");
    expect(url).toContain("endPeriod=2025-01-15");
    expect(url).not.toContain("format=");
  });

  it("builds correct URL for multiple currencies with custom frequency", () => {
    const url = buildExchangeRateUrl({
      currencies: ["USD", "GBP", "JPY"],
      startDate: "2025-01-01",
      frequency: "M",
    });

    // URL may encode + as %2B
    expect(url).toMatch(/M\.USD[+%2B]GBP[+%2B]JPY\.EUR\.SP00\.A/);
    expect(url).not.toContain("endPeriod");
  });

  it("omits endPeriod when endDate is not provided", () => {
    const url = buildExchangeRateUrl({
      currencies: ["USD"],
      startDate: "2025-01-01",
    });

    expect(url).toContain("startPeriod=2025-01-01");
    expect(url).not.toContain("endPeriod");
  });

  it("uses the provided base URL", () => {
    const url = buildExchangeRateUrl(
      { currencies: ["USD"], startDate: "2025-01-01" },
      "https://custom-api.example.com",
    );

    expect(url).toContain("https://custom-api.example.com/data/EXR/");
  });

  it("defaults baseCurrency to EUR when not specified", () => {
    const url = buildExchangeRateUrl({
      currencies: ["USD"],
      startDate: "2025-01-01",
    });

    expect(url).toContain("/data/EXR/D.USD.EUR.SP00.A");
  });

  it("always uses EUR in URL even when baseCurrency is specified", () => {
    const url = buildExchangeRateUrl({
      currencies: ["GBP"],
      startDate: "2025-01-01",
      baseCurrency: "USD",
    });

    expect(url).toContain("/data/EXR/D.GBP.EUR.SP00.A");
    expect(url).not.toContain("USD");
  });
});
