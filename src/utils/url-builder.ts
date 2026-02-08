import type { ExchangeRateQuery } from "../types/index.js";

const DEFAULT_BASE_URL = "https://data-api.ecb.europa.eu/service";

/**
 * Builds the ECB SDMX API URL for exchange rate queries.
 * Single Responsibility: only concerned with URL construction.
 *
 * URL pattern: {base}/data/EXR/{freq}.{currencies}.EUR.SP00.A?params
 *
 * The ECB API only supports EUR as the denomination currency.
 * Non-EUR base currencies are handled via cross-rate math in the client.
 *
 * Content format is controlled via the HTTP Accept header (application/json),
 * not via a URL parameter.
 */
export function buildExchangeRateUrl(
  query: ExchangeRateQuery,
  baseUrl: string = DEFAULT_BASE_URL,
): string {
  const frequency = query.frequency ?? "D";
  const currencyKey = query.currencies.join("+");

  // Always use EUR as the denomination currency in the ECB API URL.
  // The ECB SDMX API only supports EUR as the base currency.
  // Non-EUR base currencies are handled via cross-rate math after fetching.
  const baseCurrency = "EUR";

  // EXR series key: FREQ.CURRENCY.CURRENCY_DENOM.EXR_TYPE.EXR_SUFFIX
  const seriesKey = `${frequency}.${currencyKey}.${baseCurrency}.SP00.A`;

  const url = new URL(`${baseUrl}/data/EXR/${seriesKey}`);
  url.searchParams.set("startPeriod", query.startDate);

  if (query.endDate !== undefined) {
    url.searchParams.set("endPeriod", query.endDate);
  }

  return url.toString();
}
