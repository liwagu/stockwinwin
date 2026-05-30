import type { PaperDeskHistoryResponse } from "@/types/paper-desk";
import { formatDate, formatStatus } from "./paperFormat";
import { EmptyState, ErrorState, SkeletonBlock } from "./StateBlocks";
import type { Allocations } from "./allocationMath";

/** Current paper ledger — the weights the user has staged or submitted. */
export function LedgerPanel({ allocations }: { allocations: Allocations }) {
  const rows = Object.entries(allocations)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="sw-panel p-4">
      <p className="sw-label">Ledger</p>
      <div className="mt-3 space-y-2 text-sm">
        {rows.length === 0 ? (
          <EmptyState>No capital allocated yet.</EmptyState>
        ) : (
          rows.map(([symbol, value]) => (
            <div key={symbol} className="flex items-center justify-between gap-3">
              <span className="font-mono font-semibold text-[var(--color-ink)]">{symbol}</span>
              <span className="font-mono text-[var(--color-muted)]">{value.toFixed(0)}%</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** History preview of prior paper sessions, with loading / empty / error states. */
export function HistoryPanel(props: {
  history: PaperDeskHistoryResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const sessions = props.history?.sessions ?? [];

  return (
    <div className="sw-panel p-4">
      <p className="sw-label">History</p>
      <div className="mt-3 space-y-2">
        {props.loading ? (
          <>
            <SkeletonBlock className="h-5 w-full" />
            <SkeletonBlock className="h-5 w-full" />
          </>
        ) : props.error ? (
          <ErrorState message={props.error} onRetry={props.onRetry} />
        ) : sessions.length === 0 ? (
          <EmptyState>No submitted sessions yet.</EmptyState>
        ) : (
          sessions.slice(0, 5).map(item => (
            <div key={item.session_id} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-[var(--color-ink-2)]">{formatDate(item.trading_date)}</span>
              <span className="font-mono text-xs text-[var(--color-muted)]">
                {formatStatus(item.status)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
