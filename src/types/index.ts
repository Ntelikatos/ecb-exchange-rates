/**
 * All ISO 4217 currency codes supported by the ECB, as a runtime array.
 * Use this to programmatically list or iterate over all available currencies.
 *
 * @example
 * ```ts
 * import { ALL_CURRENCY_CODES } from "ecb-exchange-rates-ts";
 * console.log(ALL_CURRENCY_CODES); // ["AUD", "BGN", ..., "ZAR"]
 * ```
 */
export const ALL_CURRENCY_CODES = [
  "AUD",
  "BGN",
  "BRL",
  "CAD",
  "CHF",
  "CNY",
  "CZK",
  "DKK",
  "EUR",
  "GBP",
  "HKD",
  "HUF",
  "IDR",
  "ILS",
  "INR",
  "ISK",
  "JPY",
  "KRW",
  "MXN",
  "MYR",
  "NOK",
  "NZD",
  "PHP",
  "PLN",
  "RON",
  "SEK",
  "SGD",
  "THB",
  "TRY",
  "USD",
  "ZAR",
] as const;

/**
 * ISO 4217 currency codes supported by the ECB.
 */
export type CurrencyCode = (typeof ALL_CURRENCY_CODES)[number];

/** Data frequency for the exchange rate series. */
export type Frequency = "D" | "M" | "A";

/** Exchange rate type as defined in the ECB's EXR dataflow. */
export type ExchangeRateType = "SP00" | "EN00";

/** Series variation suffix. */
export type SeriesVariation = "A" | "E";

/**
 * A single exchange rate observation from the ECB.
 */
export interface ExchangeRateObservation {
  /** The date of the observation (YYYY-MM-DD for daily). */
  readonly date: string;
  /** The target currency code. */
  readonly currency: string;
  /** The denomination (base) currency. */
  readonly baseCurrency: string;
  /** The exchange rate value: 1 baseCurrency = `rate` units of `currency`. */
  readonly rate: number;
}

/**
 * Result for a single currency rate query.
 */
export interface ExchangeRateResult {
  /** The base (denomination) currency. */
  readonly base: string;
  /** Map of date → rate for each observation. */
  readonly rates: ReadonlyMap<string, number>;
  /** The target currency. */
  readonly currency: string;
  /** The originally requested date (set when fallback to a different date occurred). */
  readonly requestedDate?: string;
}

/**
 * Result for a multi-currency rate query.
 */
export interface ExchangeRatesResult {
  /** The base (denomination) currency. */
  readonly base: string;
  /** Map of date → { currency → rate }. */
  readonly rates: ReadonlyMap<string, Readonly<Record<string, number>>>;
  /** The currencies included in the result. */
  readonly currencies: readonly string[];
}

/**
 * Result of a currency conversion via `EcbClient.convert()`.
 */
export interface ConversionResult {
  /** The converted amount in the target currency (rounded to 2 decimal places). */
  readonly amount: number;
  /** The exchange rate used for the conversion. */
  readonly rate: number;
  /** The date of the exchange rate used. */
  readonly date: string;
  /** The target currency code. */
  readonly currency: string;
  /** The originally requested date, if different from the actual rate date due to weekend/holiday fallback. */
  readonly requestedDate?: string;
}

/**
 * Parameters to query exchange rates.
 */
export interface ExchangeRateQuery {
  /** One or more target currencies. */
  readonly currencies: readonly string[];
  /** Start date (inclusive), format YYYY-MM-DD. */
  readonly startDate: string;
  /** End date (inclusive), format YYYY-MM-DD. */
  readonly endDate?: string;
  /** Data frequency. Defaults to "D" (daily). */
  readonly frequency?: Frequency;
  /** Base (denomination) currency. Defaults to the client's configured baseCurrency. */
  readonly baseCurrency?: string;
}

/**
 * Configuration for the ECB client.
 */
export interface EcbClientConfig {
  /** Base URL of the ECB SDMX API. Defaults to the official endpoint. */
  readonly baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to 30_000. */
  readonly timeoutMs?: number;
  /** Custom fetch implementation for dependency injection. */
  readonly fetchFn?: typeof globalThis.fetch;
  /** Default base (denomination) currency. Defaults to "EUR". */
  readonly baseCurrency?: string;
}

// ── SDMX-JSON response shapes ──────────────────────────────────────────

/** A dimension or attribute value in the SDMX-JSON structure. */
export interface SdmxValue {
  readonly id?: string;
  readonly name: string;
  readonly start?: string;
  readonly end?: string;
}

/** A dimension component (series-level or observation-level). */
export interface SdmxDimension {
  readonly id: string;
  readonly name: string;
  readonly role?: string;
  readonly values: readonly SdmxValue[];
}

/** A single series within a dataset, keyed by colon-separated dimension indices. */
export interface SdmxSeries {
  readonly attributes: readonly (number | null)[];
  /**
   * Observations keyed by observation-dimension index (as string).
   * Each value is a tuple: [rate, ...attributeIndices].
   */
  readonly observations: Readonly<Record<string, readonly (number | null)[]>>;
}

/** A dataset in the SDMX-JSON response. */
export interface SdmxDataSet {
  readonly action?: string;
  readonly validFrom?: string;
  readonly series: Readonly<Record<string, SdmxSeries>>;
}

/** The structure metadata in the SDMX-JSON response. */
export interface SdmxStructure {
  readonly name?: string;
  readonly dimensions: {
    readonly series: readonly SdmxDimension[];
    readonly observation: readonly SdmxDimension[];
  };
  readonly attributes?: {
    readonly series?: readonly SdmxDimension[];
    readonly observation?: readonly SdmxDimension[];
  };
}

/** Top-level SDMX-JSON data message from the ECB API. */
export interface SdmxJsonResponse {
  readonly header: {
    readonly id: string;
    readonly test: boolean;
    readonly prepared: string;
    readonly sender: { readonly id: string };
  };
  readonly dataSets: readonly SdmxDataSet[];
  readonly structure: SdmxStructure;
}
