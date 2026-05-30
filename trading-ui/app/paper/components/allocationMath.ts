export const ALLOCATION_TOLERANCE = 0.01;

export type Allocations = Record<string, number>;

export function allocationTotal(allocations: Allocations): number {
  return Object.values(allocations).reduce(
    (sum, value) => sum + (Number.isFinite(value) ? Number(value) : 0),
    0
  );
}

export function isAllocationValid(allocations: Allocations): boolean {
  const total = allocationTotal(allocations);
  if (Math.abs(total - 100) > ALLOCATION_TOLERANCE) return false;
  return Object.values(allocations).every(value => Number.isFinite(value) && value >= 0);
}

/**
 * Scale every weight so the total becomes exactly 100, then push any rounding
 * remainder onto the largest holding. Empty / all-zero books distribute the
 * benchmark fully into SPY when present, otherwise spread evenly.
 */
export function normalizeToHundred(allocations: Allocations, benchmarkSymbol = "SPY"): Allocations {
  const symbols = Object.keys(allocations);
  if (symbols.length === 0) return {};

  const total = allocationTotal(allocations);

  if (total <= 0) {
    if (symbols.includes(benchmarkSymbol)) {
      return Object.fromEntries(symbols.map(s => [s, s === benchmarkSymbol ? 100 : 0]));
    }
    const even = roundTo(100 / symbols.length, 2);
    const seeded = Object.fromEntries(symbols.map(s => [s, even]));
    return settleRemainder(seeded);
  }

  const scaled: Allocations = {};
  for (const [symbol, value] of Object.entries(allocations)) {
    scaled[symbol] = roundTo((Number(value) / total) * 100, 2);
  }
  return settleRemainder(scaled);
}

/** Push any leftover (100 - sum) onto the largest weight so the total is exact. */
function settleRemainder(allocations: Allocations): Allocations {
  const result = { ...allocations };
  const symbols = Object.keys(result);
  if (symbols.length === 0) return result;
  const sum = allocationTotal(result);
  const remainder = roundTo(100 - sum, 2);
  if (remainder === 0) return result;
  const largest = symbols.reduce((a, b) => (result[b] > result[a] ? b : a), symbols[0]);
  result[largest] = roundTo(result[largest] + remainder, 2);
  return result;
}

export function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function clampWeight(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export type AllocationPreset = {
  id: string;
  label: string;
  description: string;
  build: (symbols: string[], benchmarkSymbol: string) => Allocations;
};

export const ALLOCATION_PRESETS: AllocationPreset[] = [
  {
    id: "benchmark",
    label: "Track SPY",
    description: "100% benchmark",
    build: (symbols, benchmark) =>
      Object.fromEntries(symbols.map(s => [s, s === benchmark ? 100 : 0])),
  },
  {
    id: "equal",
    label: "Equal weight",
    description: "Spread evenly",
    build: symbols =>
      normalizeToHundred(Object.fromEntries(symbols.map(s => [s, 1]))),
  },
  {
    id: "conviction",
    label: "AI conviction",
    description: "Tilt to semis",
    build: (symbols, benchmark) => {
      // Deterministic research tilt toward AI compute, risk-managed with benchmark.
      const tilt: Allocations = { NVDA: 35, AMD: 20, TSLA: 10, BTCUSDT: 10, SPY: 25 };
      const seeded = Object.fromEntries(
        symbols.map(s => [s, tilt[s] ?? (s === benchmark ? 100 : 0)])
      );
      return normalizeToHundred(seeded, benchmark);
    },
  },
];
