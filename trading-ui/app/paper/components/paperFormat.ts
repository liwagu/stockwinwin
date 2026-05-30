import type { PaperSourceQuality } from "@/types/paper-desk";

/** Source-quality labels. Anything not backed by live market data is explicitly
 * marked so the UI never presents fabricated numbers as real. */
export const SOURCE_QUALITY_LABELS: Record<string, string> = {
  market_data: "Live market data",
  prediction_cache: "Cached model prediction",
  model_inference: "Model inference",
  fallback: "Simulated fallback",
};

export function formatSourceQuality(value: string) {
  return SOURCE_QUALITY_LABELS[value] ?? value.replace(/_/g, " ");
}

/** True when the data behind a number is simulated / not from a live feed. */
export function isFallbackSource(value: string) {
  return value === "fallback" || !SOURCE_QUALITY_LABELS[value];
}

export function sourceTone(value: PaperSourceQuality | string): "live" | "model" | "fallback" {
  if (value === "market_data") return "live";
  if (value === "fallback") return "fallback";
  return "model";
}

export function formatMoney(value: number) {
  if (!Number.isFinite(value)) return "--";
  if (value >= 10000) {
    return `$${Math.round(value).toLocaleString("en-US")}`;
  }
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function formatReturn(value: number) {
  if (!Number.isFinite(value)) return "--";
  const percent = value * 100;
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
}

export function formatDrawdown(value: number) {
  if (!Number.isFinite(value)) return "--";
  if (value === 0) return "0.00%";
  return `-${(value * 100).toFixed(2)}%`;
}

export function returnTone(value: number): "positive" | "negative" | "neutral" {
  if (!Number.isFinite(value) || value === 0) return "neutral";
  return value > 0 ? "positive" : "negative";
}

export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatStatus(value: string) {
  switch (value) {
    case "open":
      return "Open";
    case "allocated":
      return "Allocated";
    case "resolved":
      return "Resolved";
    default:
      return value;
  }
}
