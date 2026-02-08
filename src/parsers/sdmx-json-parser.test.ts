import { describe, expect, it } from "vitest";
import { MULTI_CURRENCY_RESPONSE, SINGLE_CURRENCY_RESPONSE } from "../__tests__/fixtures.js";
import { EcbParseError } from "../errors/index.js";
import type { SdmxJsonResponse } from "../types/index.js";
import { parseJsonResponse, parseSdmxJson } from "./sdmx-json-parser.js";

describe("parseJsonResponse", () => {
  it("parses a single-currency response into observations", () => {
    const obs = parseJsonResponse(SINGLE_CURRENCY_RESPONSE);

    expect(obs).toHaveLength(2);
    expect(obs[0]).toEqual({
      currency: "USD",
      baseCurrency: "EUR",
      date: "2025-01-15",
      rate: 1.03,
    });
    expect(obs[1]).toEqual({
      currency: "USD",
      baseCurrency: "EUR",
      date: "2025-01-16",
      rate: 1.0303,
    });
  });

  it("parses a multi-currency response into observations", () => {
    const obs = parseJsonResponse(MULTI_CURRENCY_RESPONSE);

    expect(obs).toHaveLength(4);

    const currencies = new Set(obs.map((o) => o.currency));
    expect(currencies).toEqual(new Set(["USD", "GBP"]));

    const usdJan15 = obs.find((o) => o.currency === "USD" && o.date === "2025-01-15");
    expect(usdJan15?.rate).toBe(1.03);

    const gbpJan15 = obs.find((o) => o.currency === "GBP" && o.date === "2025-01-15");
    expect(gbpJan15?.rate).toBe(0.8442);
  });

  it("returns empty array for empty dataSets", () => {
    const emptyResponse: SdmxJsonResponse = {
      ...SINGLE_CURRENCY_RESPONSE,
      dataSets: [],
    };
    expect(parseJsonResponse(emptyResponse)).toEqual([]);
  });

  it("throws EcbParseError for missing CURRENCY dimension", () => {
    const badResponse = {
      ...SINGLE_CURRENCY_RESPONSE,
      structure: { dimensions: { series: [], observation: [] } },
    } as SdmxJsonResponse;

    expect(() => parseJsonResponse(badResponse)).toThrow(EcbParseError);
  });

  it("throws EcbParseError for missing CURRENCY_DENOM dimension", () => {
    const response: SdmxJsonResponse = {
      ...SINGLE_CURRENCY_RESPONSE,
      structure: {
        ...SINGLE_CURRENCY_RESPONSE.structure,
        dimensions: {
          series: [
            { id: "FREQ", name: "Frequency", values: [{ id: "D", name: "Daily" }] },
            { id: "CURRENCY", name: "Currency", values: [{ id: "USD", name: "US dollar" }] },
            // CURRENCY_DENOM intentionally missing
          ],
          observation: SINGLE_CURRENCY_RESPONSE.structure.dimensions.observation,
        },
      },
    };

    expect(() => parseJsonResponse(response)).toThrow(EcbParseError);
    expect(() => parseJsonResponse(response)).toThrow(/CURRENCY_DENOM/);
  });

  it("throws EcbParseError for missing TIME_PERIOD observation dimension", () => {
    const response: SdmxJsonResponse = {
      ...SINGLE_CURRENCY_RESPONSE,
      structure: {
        ...SINGLE_CURRENCY_RESPONSE.structure,
        dimensions: {
          series: SINGLE_CURRENCY_RESPONSE.structure.dimensions.series,
          observation: [{ id: "OTHER_DIM", name: "Other", values: [] }],
        },
      },
    };

    expect(() => parseJsonResponse(response)).toThrow(EcbParseError);
    expect(() => parseJsonResponse(response)).toThrow(/TIME_PERIOD/);
  });

  it("throws EcbParseError when structure.dimensions is missing", () => {
    const response = {
      header: SINGLE_CURRENCY_RESPONSE.header,
      dataSets: SINGLE_CURRENCY_RESPONSE.dataSets,
      structure: {},
    } as unknown as SdmxJsonResponse;

    expect(() => parseJsonResponse(response)).toThrow(EcbParseError);
    expect(() => parseJsonResponse(response)).toThrow(/structure\.dimensions/);
  });

  it("returns empty array when dataSets is undefined", () => {
    const response = {
      header: SINGLE_CURRENCY_RESPONSE.header,
      dataSets: undefined,
      structure: SINGLE_CURRENCY_RESPONSE.structure,
    } as unknown as SdmxJsonResponse;

    expect(parseJsonResponse(response)).toEqual([]);
  });

  it("skips dataSets with missing series property", () => {
    const response = {
      ...SINGLE_CURRENCY_RESPONSE,
      dataSets: [{ action: "Replace" }],
    } as unknown as SdmxJsonResponse;

    expect(parseJsonResponse(response)).toEqual([]);
  });

  it("skips series with insufficient dimension indices", () => {
    const response: SdmxJsonResponse = {
      ...SINGLE_CURRENCY_RESPONSE,
      dataSets: [
        {
          series: {
            // Only 2 indices — CURRENCY_DENOM (index 2) will be undefined
            "0:0": {
              attributes: [],
              observations: { "0": [1.03] },
            },
          },
        },
      ],
    };

    expect(parseJsonResponse(response)).toEqual([]);
  });

  it("skips series when currency value has no id", () => {
    const response: SdmxJsonResponse = {
      ...SINGLE_CURRENCY_RESPONSE,
      structure: {
        ...SINGLE_CURRENCY_RESPONSE.structure,
        dimensions: {
          series: [
            { id: "FREQ", name: "Frequency", values: [{ id: "D", name: "Daily" }] },
            { id: "CURRENCY", name: "Currency", values: [{ name: "US dollar" }] },
            { id: "CURRENCY_DENOM", name: "Denom", values: [{ id: "EUR", name: "Euro" }] },
            { id: "EXR_TYPE", name: "Type", values: [{ id: "SP00", name: "Spot" }] },
            { id: "EXR_SUFFIX", name: "Suffix", values: [{ id: "A", name: "Average" }] },
          ],
          observation: SINGLE_CURRENCY_RESPONSE.structure.dimensions.observation,
        },
      },
    };

    expect(parseJsonResponse(response)).toEqual([]);
  });

  it("skips series when baseCurrency value has no id", () => {
    const response: SdmxJsonResponse = {
      ...SINGLE_CURRENCY_RESPONSE,
      structure: {
        ...SINGLE_CURRENCY_RESPONSE.structure,
        dimensions: {
          series: [
            { id: "FREQ", name: "Frequency", values: [{ id: "D", name: "Daily" }] },
            { id: "CURRENCY", name: "Currency", values: [{ id: "USD", name: "US dollar" }] },
            { id: "CURRENCY_DENOM", name: "Denom", values: [{ name: "Euro" }] },
            { id: "EXR_TYPE", name: "Type", values: [{ id: "SP00", name: "Spot" }] },
            { id: "EXR_SUFFIX", name: "Suffix", values: [{ id: "A", name: "Average" }] },
          ],
          observation: SINGLE_CURRENCY_RESPONSE.structure.dimensions.observation,
        },
      },
    };

    expect(parseJsonResponse(response)).toEqual([]);
  });

  it("skips observations with null rate values", () => {
    const response: SdmxJsonResponse = {
      ...SINGLE_CURRENCY_RESPONSE,
      dataSets: [
        {
          series: {
            "0:0:0:0:0": {
              attributes: [],
              observations: {
                "0": [null, 0, 0, null, null],
              },
            },
          },
        },
      ],
    };

    expect(parseJsonResponse(response)).toEqual([]);
  });

  it("skips observations with out-of-range time index", () => {
    const response: SdmxJsonResponse = {
      ...SINGLE_CURRENCY_RESPONSE,
      dataSets: [
        {
          series: {
            "0:0:0:0:0": {
              attributes: [],
              observations: {
                "99": [1.03, 0],
              },
            },
          },
        },
      ],
    };

    expect(parseJsonResponse(response)).toEqual([]);
  });

  it("handles series with empty observations object", () => {
    const response: SdmxJsonResponse = {
      ...SINGLE_CURRENCY_RESPONSE,
      dataSets: [
        {
          series: {
            "0:0:0:0:0": {
              attributes: [],
              observations: {},
            },
          },
        },
      ],
    };

    expect(parseJsonResponse(response)).toEqual([]);
  });

  it("collects observations from multiple dataSets", () => {
    const response: SdmxJsonResponse = {
      ...SINGLE_CURRENCY_RESPONSE,
      dataSets: [
        {
          series: {
            "0:0:0:0:0": {
              attributes: [],
              observations: { "0": [1.03, 0] },
            },
          },
        },
        {
          series: {
            "0:0:0:0:0": {
              attributes: [],
              observations: { "1": [1.0303, 0] },
            },
          },
        },
      ],
    };

    const obs = parseJsonResponse(response);
    expect(obs).toHaveLength(2);
    expect(obs[0]?.date).toBe("2025-01-15");
    expect(obs[0]?.rate).toBe(1.03);
    expect(obs[1]?.date).toBe("2025-01-16");
    expect(obs[1]?.rate).toBe(1.0303);
  });

  it("throws EcbParseError when dimension values array is missing", () => {
    const response: SdmxJsonResponse = {
      ...SINGLE_CURRENCY_RESPONSE,
      structure: {
        dimensions: {
          series: [
            { id: "FREQ", name: "Frequency", values: [{ id: "D", name: "Daily" }] },
            { id: "CURRENCY", name: "Currency", values: undefined as unknown as [] },
            { id: "CURRENCY_DENOM", name: "Denom", values: [{ id: "EUR", name: "Euro" }] },
            { id: "EXR_TYPE", name: "Type", values: [{ id: "SP00", name: "Spot" }] },
            { id: "EXR_SUFFIX", name: "Suffix", values: [{ id: "A", name: "Average" }] },
          ],
          observation: SINGLE_CURRENCY_RESPONSE.structure.dimensions.observation,
        },
      },
    };

    expect(() => parseJsonResponse(response)).toThrow(EcbParseError);
    expect(() => parseJsonResponse(response)).toThrow(/missing dimension values/);
  });
});

describe("parseSdmxJson", () => {
  it("parses valid JSON string", () => {
    const json = JSON.stringify(SINGLE_CURRENCY_RESPONSE);
    const result = parseSdmxJson(json);
    expect(result.header.id).toBe("test-single");
  });

  it("throws EcbParseError for invalid JSON", () => {
    expect(() => parseSdmxJson("not json")).toThrow(EcbParseError);
  });
});
