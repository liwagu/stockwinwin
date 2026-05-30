"use client";

import { Maximize2, TrendingDown, TrendingUp } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CryptoPrediction } from "@/types/predictions";

type CryptoPredictionChartProps = {
  prediction: CryptoPrediction;
  onExpand?: (prediction: CryptoPrediction) => void;
  isExpanded?: boolean;
};

type ChartPoint = {
  ts: number;
  fullTime: string;
  historical: number | null;
  predicted: number | null;
  lower: number | null;
  upper: number | null;
  type: "historical" | "current" | "prediction";
  isSeparator?: boolean;
};

const formatPrice = (value: number, digits = 2) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const formatAxisPrice = (value: number) =>
  `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const dateTimeFormatOptions: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
};

const timeFormatOptions: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
};

export function CryptoPredictionChart({ prediction, onExpand, isExpanded = false }: CryptoPredictionChartProps) {
  const chartData: ChartPoint[] = [];
  const historicalData = prediction.historical_data || [];

  for (const hist of historicalData) {
    const d = new Date(hist.timestamp);
    chartData.push({
      ts: d.getTime(),
      fullTime: d.toLocaleString("en-US", dateTimeFormatOptions),
      historical: hist.price,
      predicted: null,
      lower: null,
      upper: null,
      type: "historical",
    });
  }

  const lastHistoricalTime = historicalData.length > 0
    ? new Date(historicalData[historicalData.length - 1].timestamp)
    : new Date(prediction.forecast_timestamp);

  chartData.push({
    ts: lastHistoricalTime.getTime(),
    fullTime: lastHistoricalTime.toLocaleString("en-US", dateTimeFormatOptions),
    historical: prediction.current_price,
    predicted: prediction.current_price,
    lower: prediction.current_price,
    upper: prediction.current_price,
    type: "current",
    isSeparator: true,
  });

  for (const pred of prediction.predictions) {
    const d = new Date(pred.timestamp);
    chartData.push({
      ts: d.getTime(),
      fullTime: d.toLocaleString("en-US", dateTimeFormatOptions),
      historical: null,
      predicted: pred.predicted_price,
      lower: pred.confidence_lower,
      upper: pred.confidence_upper,
      type: "prediction",
    });
  }

  const allPrices = [
    prediction.current_price,
    ...(prediction.historical_data || []).map(h => h.price),
    ...prediction.predictions.map(p => p.predicted_price),
    ...prediction.predictions.map(p => p.confidence_lower),
    ...prediction.predictions.map(p => p.confidence_upper),
  ];
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const padding = Math.max((maxPrice - minPrice) * 0.1, prediction.current_price * 0.002);
  const separatorIndex = chartData.findIndex(d => d.isSeparator);

  const finalPrice = prediction.predictions[prediction.predictions.length - 1]?.predicted_price || prediction.current_price;
  const priceChange = finalPrice - prediction.current_price;
  const priceChangePercent = (priceChange / prediction.current_price) * 100;
  const isPositive = priceChange >= 0;
  const forecastTime = new Date(prediction.forecast_timestamp).toLocaleString("en-US", dateTimeFormatOptions);
  const symbolLabel = prediction.symbol.includes("USDT")
    ? prediction.symbol.replace("USDT", "/USDT")
    : prediction.symbol;
  const gradientId = `confidence-${prediction.symbol.replace(/[^a-zA-Z0-9]/g, "")}`;
  const showExpandButton = Boolean(onExpand) && !isExpanded;

  return (
    <article className="sw-card overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b px-5 py-4">
        <div className="min-w-0 space-y-1">
          <p className="sw-label">{symbolLabel}</p>
          <h3 className="truncate text-xl font-semibold tracking-[-0.035em]">{prediction.display_name}</h3>
          <p className="text-sm text-muted-foreground">Generated {forecastTime}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-xl font-semibold tracking-[-0.04em]">${formatPrice(prediction.current_price)}</p>
          <p className={`inline-flex items-center justify-end gap-1 text-sm ${isPositive ? "text-[var(--color-accent-2)]" : "text-[var(--color-negative)]"}`}>
            {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {isPositive ? "+" : ""}{priceChangePercent.toFixed(2)}%
          </p>
        </div>
      </header>

      <div className="grid grid-cols-3 border-b text-sm">
        {[
          ["Current", `$${formatPrice(prediction.current_price)}`],
          ["24h target", `$${formatPrice(finalPrice)}`],
          ["Confidence", `${Math.round(prediction.confidence_score * 100)}%`],
        ].map(([label, value]) => (
          <div key={label} className="border-r px-5 py-3 last:border-r-0">
            <p className="sw-label">{label}</p>
            <p className="mt-1 font-mono text-base font-semibold tracking-[-0.035em]">{value}</p>
          </div>
        ))}
      </div>

      <div className="px-2 py-4">
        <ResponsiveContainer width="100%" height={isExpanded ? 440 : 300}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 18 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.18} />
                <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-rule)" strokeDasharray="2 6" vertical={false} />
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(ts) => new Date(ts as number).toLocaleTimeString("en-US", timeFormatOptions)}
              tick={{ fill: "var(--color-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              domain={[minPrice - padding, maxPrice + padding]}
              tickFormatter={formatAxisPrice}
              tick={{ fill: "var(--color-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={72}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload as ChartPoint;
                const price = data.historical ?? data.predicted;

                return (
                  <div className="sw-card px-3 py-2 text-sm shadow-sm">
                    <p className="sw-label">{data.fullTime}</p>
                    {price !== null && (
                      <p className="mt-1 font-mono font-semibold">${formatPrice(price)}</p>
                    )}
                    {data.type === "prediction" && data.lower && data.upper && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Range ${formatPrice(data.lower)} - ${formatPrice(data.upper)}
                      </p>
                    )}
                  </div>
                );
              }}
            />
            {separatorIndex >= 0 && (
              <ReferenceLine
                x={chartData[separatorIndex]?.ts}
                stroke="var(--color-rule-strong)"
                strokeDasharray="4 4"
              />
            )}
            <Area type="monotone" dataKey="upper" stroke="none" fill={`url(#${gradientId})`} fillOpacity={1} />
            <Area type="monotone" dataKey="lower" stroke="none" fill={`url(#${gradientId})`} fillOpacity={1} />
            <Line
              type="monotone"
              dataKey="historical"
              stroke="var(--color-ink)"
              strokeWidth={1.8}
              dot={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="var(--color-accent)"
              strokeWidth={1.8}
              dot={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {showExpandButton && (
        <div className="flex justify-end border-t px-4 py-3">
          <button
            type="button"
            onClick={() => onExpand?.(prediction)}
            className="sw-button-plain min-h-9 px-3"
            aria-label={`Expand ${prediction.display_name} chart`}
          >
            <Maximize2 className="h-4 w-4" />
            Expand
          </button>
        </div>
      )}
    </article>
  );
}
