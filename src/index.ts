// ── Public API ──────────────────────────────────────────────────────────
// Exposes a minimal, focused surface area (Interface Segregation Principle).

// Main client
export { EcbClient } from "./client.js";

// Constants
export { ALL_CURRENCY_CODES } from "./types/index.js";

// Types
export type {
  ConversionResult,
  CurrencyCode,
  EcbClientConfig,
  ExchangeRateObservation,
  ExchangeRateQuery,
  ExchangeRateResult,
  ExchangeRatesResult,
  Frequency,
  ExchangeRateType,
  SeriesVariation,
  SdmxJsonResponse,
  SdmxDataSet,
  SdmxDimension,
  SdmxSeries,
  SdmxStructure,
  SdmxValue,
} from "./types/index.js";

// Errors
export {
  EcbError,
  EcbApiError,
  EcbNetworkError,
  EcbNoDataError,
  EcbParseError,
  EcbValidationError,
} from "./errors/index.js";

// Extension points (for advanced users / DI)
export type { HttpFetcher } from "./services/http-fetcher.js";
export { FetchHttpFetcher } from "./services/http-fetcher.js";

// Utilities (for advanced users who want to compose their own pipelines)
export { parseJsonResponse, parseSdmxJson } from "./parsers/sdmx-json-parser.js";
export { buildExchangeRateUrl } from "./utils/url-builder.js";
export { validateQuery } from "./utils/validation.js";
