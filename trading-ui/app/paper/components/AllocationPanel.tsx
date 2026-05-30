import { CheckCircle2, RotateCcw, Send, Wand2 } from "lucide-react";
import type { PaperDeskAsset } from "@/types/paper-desk";
import {
  ALLOCATION_PRESETS,
  ALLOCATION_TOLERANCE,
  allocationTotal,
  clampWeight,
  isAllocationValid,
  normalizeToHundred,
  type Allocations,
} from "./allocationMath";
import { formatMoney, formatSourceQuality, isFallbackSource } from "./paperFormat";
import { PaperOnlyNote } from "./StateBlocks";

export function AllocationPanel(props: {
  assets: PaperDeskAsset[];
  benchmarkSymbol: string;
  allocations: Allocations;
  submitted: boolean;
  submitting: boolean;
  onChange: (symbol: string, value: number) => void;
  onReplace: (next: Allocations) => void;
  onSubmit: () => void;
}) {
  const { assets, benchmarkSymbol, allocations, submitted, submitting } = props;
  const symbols = assets.map(a => a.symbol);
  const total = allocationTotal(allocations);
  const valid = isAllocationValid(allocations);
  const remainder = Math.round((100 - total) * 100) / 100;
  const overweight = total - 100 > ALLOCATION_TOLERANCE;
  const underweight = 100 - total > ALLOCATION_TOLERANCE;

  function applyPreset(build: (typeof ALLOCATION_PRESETS)[number]["build"]) {
    if (submitted) return;
    props.onReplace(build(symbols, benchmarkSymbol));
  }

  return (
    <section className="space-y-4" aria-label="Paper allocation">
      <SectionHeader label="Allocation">
        <span
          className={`font-mono text-sm ${valid ? "text-[var(--color-accent-2)]" : "text-[var(--color-warning)]"}`}
          aria-live="polite"
          aria-label={`Total allocation ${total.toFixed(0)} percent`}
        >
          {total.toFixed(0)}%
        </span>
      </SectionHeader>

      {!submitted && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Allocation presets">
          {ALLOCATION_PRESETS.map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.build)}
              className="sw-button-secondary min-h-9 px-3 text-xs"
              title={preset.description}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {assets.map(asset => (
          <AllocationRow
            key={asset.symbol}
            asset={asset}
            value={clampWeight(allocations[asset.symbol] || 0)}
            disabled={submitted}
            onChange={value => props.onChange(asset.symbol, value)}
          />
        ))}
      </div>

      {/* Live running total + under/over messaging */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-[var(--color-rule)] bg-[var(--color-paper-2)]/40 px-4 py-3"
        aria-live="polite"
      >
        <div className="min-w-0">
          <p className="sw-label">Capital deployed</p>
          <p className="mt-1 font-mono text-sm text-[var(--color-ink)]">{total.toFixed(2)}% of 100%</p>
        </div>
        <p className="text-sm">
          {valid ? (
            <span className="inline-flex items-center gap-1.5 text-[var(--color-accent-2)]">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Fully allocated
            </span>
          ) : overweight ? (
            <span className="text-[var(--color-warning)]">
              Over by {Math.abs(remainder).toFixed(2)}% &mdash; trim to reach 100%.
            </span>
          ) : underweight ? (
            <span className="text-[var(--color-warning)]">
              {remainder.toFixed(2)}% uninvested &mdash; allocate the remainder.
            </span>
          ) : null}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-rule)] pt-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => !submitted && props.onReplace(normalizeToHundred(allocations, benchmarkSymbol))}
            disabled={submitted || valid}
            className="sw-button-secondary min-h-11 px-4 disabled:cursor-not-allowed disabled:opacity-50"
            title="Scale current weights so they total exactly 100%"
          >
            <Wand2 className="size-4" aria-hidden="true" />
            Normalize to 100
          </button>
          <button
            type="button"
            onClick={() => applyPreset(ALLOCATION_PRESETS[0].build)}
            disabled={submitted}
            className="sw-button-plain min-h-11 px-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset
          </button>
        </div>
        <button
          type="button"
          onClick={props.onSubmit}
          disabled={!valid || submitting || submitted}
          aria-disabled={!valid || submitting || submitted}
          className="sw-button-primary min-h-11 px-4 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitted ? (
            <CheckCircle2 className="size-4" aria-hidden="true" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
          {submitted ? "Submitted" : submitting ? "Submitting" : "Submit"}
        </button>
      </div>

      {!submitted && !valid && (
        <p className="text-sm text-[var(--color-warning)]" role="status">
          Total must equal 100% before you can submit.
        </p>
      )}

      <PaperOnlyNote>
        Submitting records a paper allocation only. No real-money orders are placed and no returns are
        guaranteed.
      </PaperOnlyNote>
    </section>
  );
}

function AllocationRow(props: {
  asset: PaperDeskAsset;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const { asset, value, disabled } = props;
  const simulated = isFallbackSource(asset.price_source);

  return (
    <div className="sw-panel p-4">
      <div className="grid gap-3 sm:grid-cols-[7rem_1fr_4.5rem] sm:items-center">
        <div className="min-w-0">
          <p className="font-mono text-base font-semibold text-[var(--color-ink)]">{asset.symbol}</p>
          <p className="truncate text-sm text-[var(--color-ink-2)]">{asset.display_name}</p>
          <p className="font-mono text-xs">
            <span className="text-[var(--color-muted)]">{formatMoney(asset.current_price)}</span>
            <span aria-hidden="true" className="text-[var(--color-muted)]">
              {" / "}
            </span>
            <span className={simulated ? "text-[var(--color-warning)]" : "text-[var(--color-muted)]"}>
              {formatSourceQuality(asset.price_source)}
            </span>
          </p>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          disabled={disabled}
          onChange={event => props.onChange(Number(event.target.value))}
          className="h-11 w-full accent-[var(--color-accent)] disabled:opacity-60"
          aria-label={`${asset.symbol} allocation`}
          aria-valuetext={`${value} percent`}
        />
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          step={1}
          value={value}
          disabled={disabled}
          onChange={event => props.onChange(Number(event.target.value))}
          className="sw-input h-11 w-full px-2 text-right font-mono text-sm disabled:opacity-60"
          aria-label={`${asset.symbol} allocation percent`}
        />
      </div>
    </div>
  );
}

function SectionHeader({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-4 border-b border-[var(--color-rule)] pb-3">
      <h2 className="sw-label">{label}</h2>
      {children}
    </div>
  );
}
