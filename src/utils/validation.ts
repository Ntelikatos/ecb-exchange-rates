import { EcbValidationError } from "../errors/index.js";
import type { ExchangeRateQuery } from "../types/index.js";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY_REGEX = /^[A-Z]{3}$/;

/**
 * Validates exchange rate query parameters.
 * Single Responsibility: only concerned with input validation.
 */
export function validateQuery(query: ExchangeRateQuery): void {
  if (query.currencies.length === 0) {
    throw new EcbValidationError("At least one currency must be specified.");
  }

  for (const currency of query.currencies) {
    if (!CURRENCY_REGEX.test(currency)) {
      throw new EcbValidationError(
        `Invalid currency code "${currency}". Must be a 3-letter ISO 4217 code.`,
      );
    }
  }

  if (!ISO_DATE_REGEX.test(query.startDate)) {
    throw new EcbValidationError(
      `Invalid startDate "${query.startDate}". Expected format: YYYY-MM-DD.`,
    );
  }

  if (query.endDate !== undefined && !ISO_DATE_REGEX.test(query.endDate)) {
    throw new EcbValidationError(
      `Invalid endDate "${query.endDate}". Expected format: YYYY-MM-DD.`,
    );
  }

  if (query.endDate !== undefined && query.startDate > query.endDate) {
    throw new EcbValidationError(
      `startDate "${query.startDate}" must not be after endDate "${query.endDate}".`,
    );
  }

  if (query.baseCurrency !== undefined && !CURRENCY_REGEX.test(query.baseCurrency)) {
    throw new EcbValidationError(
      `Invalid baseCurrency "${query.baseCurrency}". Must be a 3-letter ISO 4217 code.`,
    );
  }

  if (
    query.baseCurrency !== undefined &&
    query.currencies.length === 1 &&
    query.currencies[0] === query.baseCurrency
  ) {
    throw new EcbValidationError(
      `baseCurrency "${query.baseCurrency}" cannot be the same as the only target currency.`,
    );
  }
}
