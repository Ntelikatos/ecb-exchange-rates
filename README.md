# ecb-exchange-rates

A typed TypeScript wrapper for the **European Central Bank** exchange rates SDMX API. Zero dependencies, production-ready, fully typed.

## Features

- **Zero dependencies** — uses only native `fetch` (Node.js 18+)
- **Fully typed** — strict TypeScript with exported types for everything
- **Configurable base currency** — defaults to EUR, but can be changed per-client or per-query
- **Dual ESM/CJS** — works with `import` and `require`
- **SOLID architecture** — modular, testable, extensible
- **Dependency injection** — swap HTTP fetcher for testing or custom transports

## Installation

```bash
npm install ecb-exchange-rates
# or
pnpm add ecb-exchange-rates
```

## Quick Start

```ts
import { EcbClient } from "ecb-exchange-rates";

const ecb = new EcbClient();

// Get a rate for a specific date
const result = await ecb.getRate("USD", "2025-01-15");
console.log(result.rates.get("2025-01-15")); // 1.03

// Convert 100 of the base currency to USD
const conversion = await ecb.convert(100, "USD", "2025-01-15");
console.log(conversion); // { amount: 103, rate: 1.03, date: "2025-01-15", currency: "USD" }

// Get rate history
const history = await ecb.getRateHistory("USD", "2025-01-01", "2025-01-31");
for (const [date, rate] of history.rates) {
  console.log(`${date}: ${rate}`);
}

// Multiple currencies at once
const multi = await ecb.getRates({
  currencies: ["USD", "GBP", "JPY"],
  startDate: "2025-01-01",
  endDate: "2025-01-31",
});
for (const [date, rates] of multi.rates) {
  console.log(`${date}: USD=${rates.USD}, GBP=${rates.GBP}, JPY=${rates.JPY}`);
}

// Raw observations (full control)
const observations = await ecb.getObservations({
  currencies: ["USD"],
  startDate: "2025-01-01",
  endDate: "2025-01-31",
  frequency: "D",
});
```

## API Reference

### `EcbClient`

#### Constructor

```ts
new EcbClient(config?: EcbClientConfig)
```

| Option         | Type       | Default                                  | Description                         |
| -------------- | ---------- | ---------------------------------------- | ----------------------------------- |
| `baseCurrency` | `string`   | `"EUR"`                                  | Default base (denomination) currency |
| `baseUrl`      | `string`   | `https://data-api.ecb.europa.eu/service` | ECB API base URL                    |
| `timeoutMs`    | `number`   | `30000`                                  | Request timeout in ms               |
| `fetchFn`      | `Function` | `globalThis.fetch`                       | Custom fetch for DI                 |

#### Methods

| Method            | Description                                       | Returns                            |
| ----------------- | ------------------------------------------------- | ---------------------------------- |
| `getRate`         | Single currency, single date                      | `ExchangeRateResult`               |
| `getRateHistory`  | Single currency, date range                       | `ExchangeRateResult`               |
| `getRates`        | Multiple currencies, date range                   | `ExchangeRatesResult`              |
| `getObservations` | Raw observation array                             | `ExchangeRateObservation[]`        |
| `convert`         | Convert base currency amount to target currency   | `{ amount, rate, date, currency }` |

#### Static Factory

```ts
// Inject a custom HTTP fetcher (useful for testing)
const client = EcbClient.withFetcher(myCustomFetcher, { baseCurrency: "USD" });
```

### Base Currency Configuration

The base currency defaults to `"EUR"` but can be configured at three levels:

```ts
// 1. Client-level default
const client = new EcbClient({ baseCurrency: "USD" });

// 2. Per-query override
const result = await client.getRates({
  currencies: ["GBP", "JPY"],
  startDate: "2025-01-15",
  baseCurrency: "CHF", // overrides client default for this query
});

// 3. The result's `base` field is derived from the API response
console.log(result.base); // "CHF"
```

## Architecture

```
src/
├── types/          # Type definitions (interfaces, SDMX-JSON shapes)
├── errors/         # Error hierarchy (EcbError -> EcbApiError, EcbNetworkError, etc.)
├── parsers/        # SDMX-JSON response parser
├── services/       # HTTP fetcher abstraction
├── utils/          # URL builder, query validation
├── client.ts       # Main EcbClient facade
└── index.ts        # Public API barrel export
```

### SOLID Principles

- **S** — Each module has a single responsibility (parsing, fetching, validating, URL building)
- **O** — New formats/transports can be added without modifying existing code
- **L** — All error types extend `EcbError` and are interchangeable
- **I** — `HttpFetcher` interface exposes only what consumers need
- **D** — `EcbClient` depends on the `HttpFetcher` abstraction, not `fetch` directly

## Error Handling

```ts
import { EcbApiError, EcbNetworkError, EcbValidationError } from "ecb-exchange-rates";

try {
  const result = await ecb.getRate("USD", "2025-01-15");
} catch (error) {
  if (error instanceof EcbValidationError) {
    // Invalid query parameters
  } else if (error instanceof EcbApiError) {
    // HTTP error from ECB (error.statusCode, error.statusText)
  } else if (error instanceof EcbNetworkError) {
    // Network failure / timeout
  }
}
```

## Testing

```bash
pnpm test              # Run tests
pnpm test:coverage     # Run tests with coverage
pnpm typecheck         # Type check
pnpm lint              # Lint + format check
```

## Notes

- **No API key required** — the ECB API is free and open access.
- **No weekend/holiday data** — the ECB only publishes rates on TARGET business days.
- **Historical data from 1999** — data is available from January 4, 1999.
- **Rates published at ~16:00 CET** — reference rates are set daily around 16:00 CET.

## License

[MIT](LICENSE)
