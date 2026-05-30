import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

/** Consistent paper-only disclaimer surfaced at every commitment point
 * (submit + resolve). Keeps the no-real-money boundary always visible. */
export function PaperOnlyNote({ children }: { children?: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-xs leading-5 text-[var(--color-muted)]">
      <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>
        {children ??
          "Paper-only simulation. No real-money orders are placed and no returns are guaranteed."}
      </span>
    </p>
  );
}

/** Inline error surface for a single async region. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-start gap-3 rounded-[var(--radius-panel)] border border-[var(--color-negative)]/40 bg-[var(--color-negative)]/5 p-4 text-sm text-[var(--color-ink)]"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--color-negative)]" aria-hidden="true" />
      <span className="min-w-0 flex-1">{message}</span>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="sw-button-secondary min-h-9 px-3 text-xs">
          Retry
        </button>
      ) : null}
    </div>
  );
}

/** Skeleton block for a loading async region. */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[var(--radius-panel)] border border-[var(--color-rule)] bg-[color-mix(in_oklch,var(--color-elevated)_72%,var(--color-paper))] ${className}`}
      aria-hidden="true"
    />
  );
}

/** Empty-state copy for a section with no data yet. */
export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-sm text-[var(--color-ink-2)]">{children}</p>;
}
