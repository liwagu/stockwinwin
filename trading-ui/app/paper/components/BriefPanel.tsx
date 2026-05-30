import { Brain, Landmark, ShieldCheck } from "lucide-react";
import type { PaperAgent, PaperDeskBrief } from "@/types/paper-desk";
import { formatSourceQuality, isFallbackSource } from "./paperFormat";

const AGENT_META: Record<PaperAgent, { label: string; icon: typeof Landmark }> = {
  macro: { label: "Macro", icon: Landmark },
  research: { label: "Research", icon: Brain },
  risk: { label: "Risk", icon: ShieldCheck },
};

/** A single agent brief, surfacing every field the contract requires:
 * stance, thesis, confidence, evidence, invalidation, allocation_guardrails,
 * and source_quality (with a fallback marker so simulated inputs are obvious). */
export function BriefPanel({ brief }: { brief: PaperDeskBrief }) {
  const meta = AGENT_META[brief.agent];
  const Icon = meta.icon;
  const confidencePct = Math.round(brief.confidence * 100);
  const simulated = isFallbackSource(brief.source_quality);

  return (
    <article className="sw-panel p-4" aria-label={`${meta.label} brief`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-rule)] bg-[var(--color-elevated)]">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="sw-label">{meta.label}</p>
            <h3 className="truncate text-lg font-semibold text-[var(--color-ink)]">{brief.stance}</h3>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span
            aria-label={`${meta.label} confidence ${confidencePct} percent`}
            className="block font-mono text-sm text-[var(--color-ink)]"
          >
            {confidencePct}%
          </span>
          <span
            title={simulated ? "Not from a live market feed" : undefined}
            className={`mt-1 block rounded-full border px-2 py-1 font-mono text-[0.68rem] ${
              simulated
                ? "border-[var(--color-warning)]/50 text-[var(--color-warning)]"
                : "border-[var(--color-rule)] text-[var(--color-muted)]"
            }`}
          >
            {formatSourceQuality(brief.source_quality)}
          </span>
        </div>
      </div>

      {/* Confidence meter — visual + accessible */}
      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-paper-2)]"
        role="meter"
        aria-valuenow={confidencePct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${meta.label} confidence`}
      >
        <div
          className="h-full rounded-full bg-[var(--color-accent)]"
          style={{ width: `${confidencePct}%` }}
        />
      </div>

      <p className="mt-4 text-sm leading-6 text-[var(--color-ink-2)]">{brief.thesis}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <BriefBlock label="Evidence">
          <ul className="space-y-1">
            {brief.evidence.map(line => (
              <li key={line} className="flex gap-2 text-sm leading-5 text-[var(--color-ink-2)]">
                <span aria-hidden="true" className="text-[var(--color-accent)]">
                  &bull;
                </span>
                <span className="min-w-0">{line}</span>
              </li>
            ))}
          </ul>
        </BriefBlock>
        <BriefBlock label="Invalidation">
          <p className="text-sm leading-5 text-[var(--color-ink-2)]">{brief.invalidation}</p>
        </BriefBlock>
      </div>

      <div className="mt-4 border-t border-[var(--color-rule)] pt-3">
        <p className="sw-label">Allocation guardrails</p>
        <p className="mt-2 text-sm leading-5 text-[var(--color-ink-2)]">{brief.allocation_guardrails}</p>
      </div>
    </article>
  );
}

function BriefBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[var(--color-rule)] pt-3">
      <p className="sw-label">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
