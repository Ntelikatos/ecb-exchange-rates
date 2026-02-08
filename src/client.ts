import { EcbNoDataError } from "./errors/index.js";
import { parseJsonResponse, parseSdmxJson } from "./parsers/sdmx-json-parser.js";
import { FetchHttpFetcher, type HttpFetcher } from "./services/http-fetcher.js";
import type {
  ConversionResult,
  EcbClientConfig,
  ExchangeRateObservation,
  ExchangeRateQuery,
  ExchangeRateResult,
  ExchangeRatesResult,
  Frequency,
} from "./types/index.js";
import { buildExchangeRateUrl } from "./utils/url-builder.js";
import { validateQuery } from "./utils/validation.js";

const DEFAULT_BASE_URL = "https://data-api.ecb.europa.eu/service";
const DEFAULT_BASE_CURRENCY = "EUR";

/**
 * ECB Exchange Rates Client.
 *
 * Provides a clean, typed interface to the European Central Bank's
 * exchange rate reference data via the SDMX RESTful API.
 *
 * Uses the `Accept: application/json` header to receive SDMX-JSON
 * responses, then parses them into strongly-typed results.
 *
 * Design principles:
 * - **Single Responsibility**: Orchestrates query → fetch → parse → transform.
 * - **Open/Closed**: New data sources can be added via the `HttpFetcher` interface.
 * - **Dependency Inversion**: Depends on `HttpFetcher` abstraction, not `fetch` directly.
 * - **Interface Segregation**: Exposes focused methods for specific use cases.
 *
 * @example
 * ```ts
 * const client = new EcbClient();
 *
 * // Get rate for a specific date (defaults to EUR base)
 * const result = await client.getRate("USD", "2025-01-15");
 * console.log(result.rates.get("2025-01-15")); // e.g. 1.03
 *
 * // Use a different base currency
 * const client2 = new EcbClient({ baseCurrency: "USD" });
 * ```
 */
export class EcbClient {
  private readonly baseUrl: string;
  private readonly baseCurrency: string;
  private readonly fetcher: HttpFetcher;

  constructor(config: EcbClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.baseCurrency = config.baseCurrency ?? DEFAULT_BASE_CURRENCY;
    this.fetcher = new FetchHttpFetcher(config.fetchFn, config.timeoutMs);
  }

  /**
   * Creates an EcbClient with a custom HttpFetcher implementation.
   * Useful for testing or when you need full control over HTTP behavior.
   */
  static withFetcher(
    fetcher: HttpFetcher,
    config: Pick<EcbClientConfig, "baseUrl" | "baseCurrency"> = {},
  ): EcbClient {
    const client = new EcbClient(config);
    Object.defineProperty(client, "fetcher", { value: fetcher });
    return client;
  }

  /**
   * Get the exchange rate for a single currency against the base currency.
   *
   * @param currency - Target currency code (e.g. "USD")
   * @param date - The date to query (YYYY-MM-DD). Returns the nearest available rate.
   */
  async getRate(currency: string, date: string): Promise<ExchangeRateResult> {
    const query: ExchangeRateQuery = {
      currencies: [currency],
      startDate: date,
      endDate: date,
    };
    return this.getSingleCurrencyRates(query);
  }

  /**
   * Get the exchange rate for a single currency over a date range.
   *
   * @param currency - Target currency code (e.g. "USD")
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   * @param frequency - Data frequency (default: "D" daily)
   */
  async getRateHistory(
    currency: string,
    startDate: string,
    endDate: string,
    frequency: Frequency = "D",
  ): Promise<ExchangeRateResult> {
    const query: ExchangeRateQuery = {
      currencies: [currency],
      startDate,
      endDate,
      frequency,
    };
    return this.getSingleCurrencyRates(query);
  }

  /**
   * Get exchange rates for multiple currencies.
   *
   * @param query - The query parameters
   */
  async getRates(query: ExchangeRateQuery): Promise<ExchangeRatesResult> {
    const resolved = this.resolveQuery(query);
    validateQuery(resolved);

    const observations = await this.fetchAndParse(resolved);
    return this.transformToMultiCurrencyResult(observations, resolved);
  }

  /**
   * Get raw observations — useful when you need full control over the data.
   *
   * @param query - The query parameters
   */
  async getObservations(query: ExchangeRateQuery): Promise<ExchangeRateObservation[]> {
    const resolved = this.resolveQuery(query);
    validateQuery(resolved);
    return this.fetchAndParse(resolved);
  }

  /**
   * Convert an amount from the base currency to a target currency at a specific date.
   *
   * @param amount - The amount in the base currency
   * @param currency - Target currency code
   * @param date - The date for the exchange rate (YYYY-MM-DD)
   * @throws {EcbNoDataError} When no rate is available for the given date (weekends, holidays, future dates)
   */
  async convert(amount: number, currency: string, date: string): Promise<ConversionResult> {
    const result = await this.getRate(currency, date);
    const entry = result.rates.entries().next().value as [string, number];
    const [actualDate, rate] = entry;

    return {
      amount: Math.round(amount * rate * 100) / 100,
      rate,
      date: actualDate,
      currency,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────

  /**
   * Resolves a query by applying the client's default baseCurrency
   * when the query doesn't specify one.
   */
  private resolveQuery(query: ExchangeRateQuery): ExchangeRateQuery {
    if (query.baseCurrency !== undefined) {
      return query;
    }
    return { ...query, baseCurrency: this.baseCurrency };
  }

  private async fetchAndParse(query: ExchangeRateQuery): Promise<ExchangeRateObservation[]> {
    const url = buildExchangeRateUrl(query, this.baseUrl);
    const raw = await this.fetcher.get(url);

    if (!raw || raw.trim().length === 0) {
      throw new EcbNoDataError(query.currencies, query.startDate, query.endDate);
    }

    const json = parseSdmxJson(raw);
    const observations = parseJsonResponse(json);

    if (observations.length === 0) {
      throw new EcbNoDataError(query.currencies, query.startDate, query.endDate);
    }

    return observations;
  }

  private async getSingleCurrencyRates(query: ExchangeRateQuery): Promise<ExchangeRateResult> {
    const resolved = this.resolveQuery(query);
    validateQuery(resolved);

    const observations = await this.fetchAndParse(resolved);

    const rates = new Map<string, number>();
    for (const obs of observations) {
      rates.set(obs.date, obs.rate);
    }

    // Derive base from parsed response when available, fall back to query
    const base = observations[0]?.baseCurrency ?? resolved.baseCurrency ?? this.baseCurrency;

    return {
      base,
      currency: resolved.currencies[0] as string,
      rates,
    };
  }

  private transformToMultiCurrencyResult(
    observations: ExchangeRateObservation[],
    query: ExchangeRateQuery,
  ): ExchangeRatesResult {
    const rates = new Map<string, Record<string, number>>();

    for (const obs of observations) {
      let dateRates = rates.get(obs.date);
      if (!dateRates) {
        dateRates = {};
        rates.set(obs.date, dateRates);
      }
      dateRates[obs.currency] = obs.rate;
    }

    // Derive base from parsed response when available, fall back to query
    const base = observations[0]?.baseCurrency ?? query.baseCurrency ?? this.baseCurrency;

    return {
      base,
      currencies: query.currencies,
      rates,
    };
  }
}
