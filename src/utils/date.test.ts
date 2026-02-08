import { describe, expect, it } from "vitest";
import { subtractCalendarDays } from "./date.js";

describe("subtractCalendarDays", () => {
  it("subtracts days within the same month", () => {
    expect(subtractCalendarDays("2025-01-18", 5)).toBe("2025-01-13");
  });

  it("handles month boundary", () => {
    expect(subtractCalendarDays("2025-03-02", 5)).toBe("2025-02-25");
  });

  it("handles year boundary", () => {
    expect(subtractCalendarDays("2025-01-03", 10)).toBe("2024-12-24");
  });

  it("handles leap year (Feb 29 exists)", () => {
    expect(subtractCalendarDays("2024-03-01", 1)).toBe("2024-02-29");
  });

  it("handles non-leap year (Feb 28)", () => {
    expect(subtractCalendarDays("2025-03-01", 1)).toBe("2025-02-28");
  });

  it("subtracts zero days", () => {
    expect(subtractCalendarDays("2025-01-15", 0)).toBe("2025-01-15");
  });

  it("subtracts 10 days for default lookback window", () => {
    expect(subtractCalendarDays("2025-01-18", 10)).toBe("2025-01-08");
  });
});
