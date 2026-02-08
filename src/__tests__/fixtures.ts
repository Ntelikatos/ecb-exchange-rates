import type { HttpFetcher } from "../services/http-fetcher.js";
import type { SdmxJsonResponse } from "../types/index.js";

/**
 * Realistic SDMX-JSON response for D.USD.EUR.SP00.A with 2 daily observations.
 */
export const SINGLE_CURRENCY_RESPONSE: SdmxJsonResponse = {
  header: {
    id: "test-single",
    test: false,
    prepared: "2026-02-07T21:00:00.000+00:00",
    sender: { id: "ECB" },
  },
  dataSets: [
    {
      action: "Replace",
      series: {
        "0:0:0:0:0": {
          attributes: [0, null, 0],
          observations: {
            "0": [1.03, 0, 0, null, null],
            "1": [1.0303, 0, 0, null, null],
          },
        },
      },
    },
  ],
  structure: {
    name: "Exchange Rates",
    dimensions: {
      series: [
        { id: "FREQ", name: "Frequency", values: [{ id: "D", name: "Daily" }] },
        { id: "CURRENCY", name: "Currency", values: [{ id: "USD", name: "US dollar" }] },
        {
          id: "CURRENCY_DENOM",
          name: "Currency denominator",
          values: [{ id: "EUR", name: "Euro" }],
        },
        { id: "EXR_TYPE", name: "Exchange rate type", values: [{ id: "SP00", name: "Spot" }] },
        { id: "EXR_SUFFIX", name: "Series variation", values: [{ id: "A", name: "Average" }] },
      ],
      observation: [
        {
          id: "TIME_PERIOD",
          name: "Time period or range",
          role: "time",
          values: [
            { id: "2025-01-15", name: "2025-01-15" },
            { id: "2025-01-16", name: "2025-01-16" },
          ],
        },
      ],
    },
  },
};

/**
 * Multi-currency response: USD + GBP, 2 dates each.
 */
export const MULTI_CURRENCY_RESPONSE: SdmxJsonResponse = {
  header: {
    id: "test-multi",
    test: false,
    prepared: "2026-02-07T21:00:00.000+00:00",
    sender: { id: "ECB" },
  },
  dataSets: [
    {
      action: "Replace",
      series: {
        "0:0:0:0:0": {
          attributes: [],
          observations: {
            "0": [1.03, 0],
            "1": [1.0303, 0],
          },
        },
        "0:1:0:0:0": {
          attributes: [],
          observations: {
            "0": [0.8442, 0],
            "1": [0.8451, 0],
          },
        },
      },
    },
  ],
  structure: {
    name: "Exchange Rates",
    dimensions: {
      series: [
        { id: "FREQ", name: "Frequency", values: [{ id: "D", name: "Daily" }] },
        {
          id: "CURRENCY",
          name: "Currency",
          values: [
            { id: "USD", name: "US dollar" },
            { id: "GBP", name: "Pound sterling" },
          ],
        },
        {
          id: "CURRENCY_DENOM",
          name: "Currency denominator",
          values: [{ id: "EUR", name: "Euro" }],
        },
        { id: "EXR_TYPE", name: "Exchange rate type", values: [{ id: "SP00", name: "Spot" }] },
        { id: "EXR_SUFFIX", name: "Series variation", values: [{ id: "A", name: "Average" }] },
      ],
      observation: [
        {
          id: "TIME_PERIOD",
          name: "Time period or range",
          role: "time",
          values: [
            { id: "2025-01-15", name: "2025-01-15" },
            { id: "2025-01-16", name: "2025-01-16" },
          ],
        },
      ],
    },
  },
};

/**
 * Cross-currency response: USD + GBP from ECB (EUR-denominated).
 * Used to test redenomination to a non-EUR base (e.g., USD).
 *
 * EUR/USD = 1.03, EUR/GBP = 0.84
 * Cross rate: 1 USD = 0.84/1.03 GBP ≈ 0.8155
 * EUR as target: 1 USD = 1/1.03 EUR ≈ 0.9709
 */
export const CROSS_CURRENCY_RESPONSE: SdmxJsonResponse = {
  header: {
    id: "test-cross",
    test: false,
    prepared: "2026-02-07T21:00:00.000+00:00",
    sender: { id: "ECB" },
  },
  dataSets: [
    {
      action: "Replace",
      series: {
        "0:0:0:0:0": {
          attributes: [],
          observations: {
            "0": [1.03, 0],
          },
        },
        "0:1:0:0:0": {
          attributes: [],
          observations: {
            "0": [0.84, 0],
          },
        },
      },
    },
  ],
  structure: {
    name: "Exchange Rates",
    dimensions: {
      series: [
        { id: "FREQ", name: "Frequency", values: [{ id: "D", name: "Daily" }] },
        {
          id: "CURRENCY",
          name: "Currency",
          values: [
            { id: "USD", name: "US dollar" },
            { id: "GBP", name: "Pound sterling" },
          ],
        },
        {
          id: "CURRENCY_DENOM",
          name: "Currency denominator",
          values: [{ id: "EUR", name: "Euro" }],
        },
        { id: "EXR_TYPE", name: "Exchange rate type", values: [{ id: "SP00", name: "Spot" }] },
        { id: "EXR_SUFFIX", name: "Series variation", values: [{ id: "A", name: "Average" }] },
      ],
      observation: [
        {
          id: "TIME_PERIOD",
          name: "Time period or range",
          role: "time",
          values: [{ id: "2025-01-15", name: "2025-01-15" }],
        },
      ],
    },
  },
};

/**
 * Cross-currency response with multiple dates: USD + GBP, 2 dates each.
 * Used to test multi-date cross-currency redenomination.
 */
export const CROSS_CURRENCY_MULTI_DATE_RESPONSE: SdmxJsonResponse = {
  header: {
    id: "test-cross-multi",
    test: false,
    prepared: "2026-02-07T21:00:00.000+00:00",
    sender: { id: "ECB" },
  },
  dataSets: [
    {
      action: "Replace",
      series: {
        "0:0:0:0:0": {
          attributes: [],
          observations: {
            "0": [1.03, 0],
            "1": [1.04, 0],
          },
        },
        "0:1:0:0:0": {
          attributes: [],
          observations: {
            "0": [0.84, 0],
            "1": [0.85, 0],
          },
        },
      },
    },
  ],
  structure: {
    name: "Exchange Rates",
    dimensions: {
      series: [
        { id: "FREQ", name: "Frequency", values: [{ id: "D", name: "Daily" }] },
        {
          id: "CURRENCY",
          name: "Currency",
          values: [
            { id: "USD", name: "US dollar" },
            { id: "GBP", name: "Pound sterling" },
          ],
        },
        {
          id: "CURRENCY_DENOM",
          name: "Currency denominator",
          values: [{ id: "EUR", name: "Euro" }],
        },
        { id: "EXR_TYPE", name: "Exchange rate type", values: [{ id: "SP00", name: "Spot" }] },
        { id: "EXR_SUFFIX", name: "Series variation", values: [{ id: "A", name: "Average" }] },
      ],
      observation: [
        {
          id: "TIME_PERIOD",
          name: "Time period or range",
          role: "time",
          values: [
            { id: "2025-01-15", name: "2025-01-15" },
            { id: "2025-01-16", name: "2025-01-16" },
          ],
        },
      ],
    },
  },
};

/**
 * Weekend fallback response: data for Wed-Fri (Jan 15-17) returned
 * when querying a lookback window that includes a weekend date.
 * Used to test that getRate() picks the most recent (Friday) rate.
 */
export const WEEKEND_FALLBACK_RESPONSE: SdmxJsonResponse = {
  header: {
    id: "test-weekend-fallback",
    test: false,
    prepared: "2026-02-07T21:00:00.000+00:00",
    sender: { id: "ECB" },
  },
  dataSets: [
    {
      action: "Replace",
      series: {
        "0:0:0:0:0": {
          attributes: [],
          observations: {
            "0": [1.03, 0],
            "1": [1.035, 0],
            "2": [1.04, 0],
          },
        },
      },
    },
  ],
  structure: {
    name: "Exchange Rates",
    dimensions: {
      series: [
        { id: "FREQ", name: "Frequency", values: [{ id: "D", name: "Daily" }] },
        { id: "CURRENCY", name: "Currency", values: [{ id: "USD", name: "US dollar" }] },
        {
          id: "CURRENCY_DENOM",
          name: "Currency denominator",
          values: [{ id: "EUR", name: "Euro" }],
        },
        { id: "EXR_TYPE", name: "Exchange rate type", values: [{ id: "SP00", name: "Spot" }] },
        { id: "EXR_SUFFIX", name: "Series variation", values: [{ id: "A", name: "Average" }] },
      ],
      observation: [
        {
          id: "TIME_PERIOD",
          name: "Time period or range",
          role: "time",
          values: [
            { id: "2025-01-15", name: "2025-01-15" },
            { id: "2025-01-16", name: "2025-01-16" },
            { id: "2025-01-17", name: "2025-01-17" },
          ],
        },
      ],
    },
  },
};

/**
 * Cross-currency weekend fallback: USD + GBP data for Jan 15-17.
 * Used to test weekend fallback combined with non-EUR base currency.
 */
export const CROSS_CURRENCY_WEEKEND_FALLBACK_RESPONSE: SdmxJsonResponse = {
  header: {
    id: "test-cross-weekend-fallback",
    test: false,
    prepared: "2026-02-07T21:00:00.000+00:00",
    sender: { id: "ECB" },
  },
  dataSets: [
    {
      action: "Replace",
      series: {
        "0:0:0:0:0": {
          attributes: [],
          observations: {
            "0": [1.03, 0],
            "1": [1.035, 0],
            "2": [1.04, 0],
          },
        },
        "0:1:0:0:0": {
          attributes: [],
          observations: {
            "0": [0.84, 0],
            "1": [0.845, 0],
            "2": [0.85, 0],
          },
        },
      },
    },
  ],
  structure: {
    name: "Exchange Rates",
    dimensions: {
      series: [
        { id: "FREQ", name: "Frequency", values: [{ id: "D", name: "Daily" }] },
        {
          id: "CURRENCY",
          name: "Currency",
          values: [
            { id: "USD", name: "US dollar" },
            { id: "GBP", name: "Pound sterling" },
          ],
        },
        {
          id: "CURRENCY_DENOM",
          name: "Currency denominator",
          values: [{ id: "EUR", name: "Euro" }],
        },
        { id: "EXR_TYPE", name: "Exchange rate type", values: [{ id: "SP00", name: "Spot" }] },
        { id: "EXR_SUFFIX", name: "Series variation", values: [{ id: "A", name: "Average" }] },
      ],
      observation: [
        {
          id: "TIME_PERIOD",
          name: "Time period or range",
          role: "time",
          values: [
            { id: "2025-01-15", name: "2025-01-15" },
            { id: "2025-01-16", name: "2025-01-16" },
            { id: "2025-01-17", name: "2025-01-17" },
          ],
        },
      ],
    },
  },
};

/**
 * Empty response: valid SDMX-JSON structure but no observations.
 * This is what the ECB returns for weekends, holidays, or future dates.
 */
export const EMPTY_RESPONSE: SdmxJsonResponse = {
  header: {
    id: "test-empty",
    test: false,
    prepared: "2026-02-07T21:00:00.000+00:00",
    sender: { id: "ECB" },
  },
  dataSets: [],
  structure: {
    name: "Exchange Rates",
    dimensions: {
      series: [
        { id: "FREQ", name: "Frequency", values: [{ id: "D", name: "Daily" }] },
        { id: "CURRENCY", name: "Currency", values: [{ id: "USD", name: "US dollar" }] },
        {
          id: "CURRENCY_DENOM",
          name: "Currency denominator",
          values: [{ id: "EUR", name: "Euro" }],
        },
        { id: "EXR_TYPE", name: "Exchange rate type", values: [{ id: "SP00", name: "Spot" }] },
        { id: "EXR_SUFFIX", name: "Series variation", values: [{ id: "A", name: "Average" }] },
      ],
      observation: [
        {
          id: "TIME_PERIOD",
          name: "Time period or range",
          role: "time",
          values: [],
        },
      ],
    },
  },
};

/**
 * Mock HTTP fetcher for testing the client without network calls.
 */
export class MockFetcher implements HttpFetcher {
  constructor(private readonly response: SdmxJsonResponse | string) {}
  async get(_url: string): Promise<string> {
    if (typeof this.response === "string") {
      return this.response;
    }
    return JSON.stringify(this.response);
  }
}
