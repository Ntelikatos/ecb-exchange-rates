import { describe, expect, it } from "vitest";
import { EcbValidationError } from "../errors/index.js";
import { validateQuery } from "./validation.js";

describe("validateQuery", () => {
  it("rejects empty currencies array", () => {
    expect(() => validateQuery({ currencies: [], startDate: "2025-01-15" })).toThrow(
      EcbValidationError,
    );
  });

  it("rejects 2-letter currency code", () => {
    expect(() => validateQuery({ currencies: ["US"], startDate: "2025-01-15" })).toThrow(
      EcbValidationError,
    );
  });

  it("rejects lowercase currency code", () => {
    expect(() => validateQuery({ currencies: ["usd"], startDate: "2025-01-15" })).toThrow(
      EcbValidationError,
    );
  });

  it("accepts format-valid dates without calendar validation", () => {
    // Regex only checks format, not calendar validity — by design
    expect(() => validateQuery({ currencies: ["USD"], startDate: "2025-13-01" })).not.toThrow();
  });

  it("rejects startDate after endDate", () => {
    expect(() =>
      validateQuery({ currencies: ["USD"], startDate: "2025-01-20", endDate: "2025-01-10" }),
    ).toThrow(EcbValidationError);
  });

  it("accepts valid query parameters", () => {
    expect(() =>
      validateQuery({ currencies: ["USD", "GBP"], startDate: "2025-01-01", endDate: "2025-01-31" }),
    ).not.toThrow();
  });

  it("rejects invalid date format", () => {
    expect(() => validateQuery({ currencies: ["USD"], startDate: "01-15-2025" })).toThrow(
      EcbValidationError,
    );
  });

  it("rejects invalid baseCurrency", () => {
    expect(() =>
      validateQuery({ currencies: ["USD"], startDate: "2025-01-01", baseCurrency: "eu" }),
    ).toThrow(EcbValidationError);
  });

  it("accepts valid baseCurrency", () => {
    expect(() =>
      validateQuery({ currencies: ["GBP"], startDate: "2025-01-01", baseCurrency: "USD" }),
    ).not.toThrow();
  });

  it("rejects invalid endDate format", () => {
    expect(() =>
      validateQuery({ currencies: ["USD"], startDate: "2025-01-01", endDate: "01/15/2025" }),
    ).toThrow(EcbValidationError);
  });

  it("includes invalid endDate value in error message", () => {
    expect(() =>
      validateQuery({ currencies: ["USD"], startDate: "2025-01-01", endDate: "not-valid" }),
    ).toThrow(/not-valid/);
  });

  it("accepts endDate equal to startDate", () => {
    expect(() =>
      validateQuery({ currencies: ["USD"], startDate: "2025-01-15", endDate: "2025-01-15" }),
    ).not.toThrow();
  });

  it("rejects empty string as currency code", () => {
    expect(() => validateQuery({ currencies: [""], startDate: "2025-01-15" })).toThrow(
      EcbValidationError,
    );
  });

  it("rejects currency code with special characters", () => {
    expect(() => validateQuery({ currencies: ["U$D"], startDate: "2025-01-15" })).toThrow(
      EcbValidationError,
    );
  });

  it("rejects 4-letter currency code", () => {
    expect(() => validateQuery({ currencies: ["USDD"], startDate: "2025-01-15" })).toThrow(
      EcbValidationError,
    );
  });

  it("validates all currencies in the array", () => {
    expect(() =>
      validateQuery({ currencies: ["USD", "invalid", "GBP"], startDate: "2025-01-15" }),
    ).toThrow(EcbValidationError);
  });
});
