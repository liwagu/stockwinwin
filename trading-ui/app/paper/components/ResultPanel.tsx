import { Info, LineChart } from "lucide-react";
import type { PaperDeskAsset, PaperDeskResult } from "@/types/paper-desk";
import {
  formatDrawdown,
  formatReturn,
  formatSourceQuality,
  isFallbackSource,
  returnTone,
} from "./paperFormat";
import { EmptyState, PaperOnlyNote } from "./StateBlocks";

const TONE_CLASS: Record<"positive" | "negative" | "neutral", string> = {
  positive: "text-[var(--color-accent-2)]",
  negative: "text-[var(--color-negative)]",
  neutral: "text-[var(--color-ink)]",
};

export function ResultPanel(props: {
  result: PaperDeskResult | null;
  assets: PaperDeskAsset[];
  allocated: Record<string, number>;
  canResolve: boolean;
  resolving: boolean;
  submitted: boolean;
  onResolve: () => void;
}) {
  const { result, assets, allocated, canResolve, resolving, submitted } = props;

  return (
    <div className="sw-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="sw-label">Score</p>
        {result ? <SourceTag source={result.price_source} /> : null}
      </div>

      {result ? (
        <ResolvedResult result={result} assets={assets} allocated={allocated} />
      ) : (
        <div className="mt-4 flex items-center justify-between gap-4">
          <span className="text-sm text-[var(--color-ink-2)]">
            {submitted ? "Ready to score" : "Waiting for allocation"}
          </span>
          <button
            type="button"
            onClick={props.onResolve}
            disabled={!canResolve || resolving}
            aria-disabled={!canResolve || resolving}
            className="sw-button-secondary min-h-11 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LineChart className="size-4" aria-hidden="true" />
            {resolving ? "Resolving" : "Resolve"}
          </button>
        </div>
      )}
    </div>
  );
}

function ResolvedResult({
  result,
  assets,
  allocated,
}: {
  result: PaperDeskResult;
  assets: PaperDeskAsset[];
  allocated: Record<string, number>;
}) {
  const fallback = isFallbackSource(result.price_source);
  const held = assets.filter(a => (allocated[a.symbol] || 0) > 0);

  return (
    <div className="mt-4 space-y-4">
      {fallback && (
        <p
          className="flex items-start gap-2 rounded-[var(--radius-panel)] border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 p-3 text-xs leading-5 text-[var(--color-ink)]"
          role="note"
        >
          <Info className="mt-0.5 size-3.5 shrink-0 text-[var(--color-warning)]" aria-hidden="true" />
          <span>
            Live market data was unavailable, so these figures use a labeled simulated fallback. Treat
            them as illustrative only.
          </span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <ResultMetric label="Portfolio" value={formatReturn(result.portfolio_return)} tone={returnTone(result.portfolio_return)} />
        <ResultMetric
          label={`Benchmark (${result.benchmark_symbol})`}
          value={formatReturn(result.benchmark_return)}
          tone={returnTone(result.benchmark_return)}
        />
        <ResultMetric label="Alpha vs SPY" value={formatReturn(result.alpha)} tone={returnTone(result.alpha)} />
        <ResultMetric label="Max drawdown" value={formatDrawdown(result.drawdown)} tone={result.drawdown > 0 ? "negative" : "neutral"} />
      </div>

      <div className="border-t border-[var(--color-rule)] pt-3">
        <p className="sw-label">Per-asset return</p>
        <div className="mt-2 space-y-1.5">
          {held.length === 0 ? (
            <EmptyState>No assets were held in this allocation.</EmptyState>
          ) : (
            held.map(asset => {
              const raw = result.returns?.[asset.symbol];
              const hasData = Number.isFinite(raw);
              const tone = hasData ? returnTone(raw as number) : "neutral";
              return (
                <div key={asset.symbol} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="font-mono font-semibold text-[var(--color-ink)]">{asset.symbol}</span>
                    <span className="truncate font-mono text-xs text-[var(--color-muted)]">
                      {(allocated[asset.symbol] || 0).toFixed(0)}%
                    </span>
                  </span>
                  <span className={`font-mono ${TONE_CLASS[tone]}`}>
                    {hasData ? formatReturn(raw as number) : "No data"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <PaperOnlyNote>
        Simulated paper result. No real money was at risk and past simulated performance does not
        guarantee future returns.
      </PaperOnlyNote>
    </div>
  );
}

function SourceTag({ source }: { source: string }) {
  const fallback = isFallbackSource(source);
  return (
    <span
      title={fallback ? "Not from a live market feed" : undefined}
      className={`rounded-full border px-2 py-1 font-mono text-[0.68rem] ${
        fallback
          ? "border-[var(--color-warning)]/50 text-[var(--color-warning)]"
          : "border-[var(--color-rule)] text-[var(--color-muted)]"
      }`}
    >
      {formatSourceQuality(source)}
    </span>
  );
}

function ResultMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "positive" | "negative" | "neutral";
}) {
  return (
    <div className="border-t border-[var(--color-rule)] pt-3">
      <p className="sw-label">{label}</p>
      <p className={`mt-2 font-mono text-lg font-semibold ${TONE_CLASS[tone]}`}>{value}</p>
    </div>
  );
}
