"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, RefreshCw, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { trackEvent } from "@/lib/analytics";
import {
  getPaperDeskHistory,
  getPaperDeskSession,
  resolvePaperDeskSession,
  submitPaperDeskAllocation,
} from "@/lib/paperDesk";
import type { PaperDeskHistoryResponse, PaperDeskSession } from "@/types/paper-desk";
import { AllocationPanel } from "./components/AllocationPanel";
import { BriefPanel } from "./components/BriefPanel";
import { HistoryPanel, LedgerPanel } from "./components/JournalPanel";
import { ResultPanel } from "./components/ResultPanel";
import { EmptyState, ErrorState, PaperOnlyNote, SkeletonBlock } from "./components/StateBlocks";
import { clampWeight, type Allocations } from "./components/allocationMath";
import { formatDate, formatStatus } from "./components/paperFormat";

const ANONYMOUS_ID_KEY = "stockwin_paper_anonymous_id";

export default function PaperDeskClient() {
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const [session, setSession] = useState<PaperDeskSession | null>(null);
  const [history, setHistory] = useState<PaperDeskHistoryResponse | null>(null);
  const [allocations, setAllocations] = useState<Allocations>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resolving, setResolving] = useState(false);

  const loadHistory = useCallback(async (id: string) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      setHistory(await getPaperDeskHistory(id));
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "History is unavailable.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadSession = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const nextSession = await getPaperDeskSession(id);
      setSession(nextSession);
      trackEvent("paper_desk_loaded", { status: nextSession.status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Paper Desk is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDeskForId = useCallback(
    async (id: string) => {
      await Promise.all([loadSession(id), loadHistory(id)]);
    },
    [loadSession, loadHistory]
  );

  useEffect(() => {
    const id = getOrCreateAnonymousId();
    setAnonymousId(id);
    void loadDeskForId(id);
  }, [loadDeskForId]);

  useEffect(() => {
    if (!session) return;
    if (session.allocation) {
      setAllocations(session.allocation.allocations);
      return;
    }
    const next: Allocations = {};
    for (const asset of session.assets) {
      next[asset.symbol] = asset.symbol === session.benchmark_symbol ? 100 : 0;
    }
    setAllocations(next);
  }, [session]);

  const isSubmitted = Boolean(session?.allocation);
  const isResolved = Boolean(session?.result);

  const ledgerAllocations = useMemo<Allocations>(
    () => (session?.allocation ? session.allocation.allocations : allocations),
    [session, allocations]
  );

  const updateAllocation = useCallback(
    (symbol: string, value: number) => {
      if (isSubmitted) return;
      setAllocations(current => ({ ...current, [symbol]: clampWeight(value) }));
    },
    [isSubmitted]
  );

  const replaceAllocations = useCallback(
    (next: Allocations) => {
      if (isSubmitted) return;
      setAllocations(next);
    },
    [isSubmitted]
  );

  async function submitAllocation() {
    if (!session || !anonymousId || isSubmitted) return;
    setSubmitting(true);
    setError(null);
    try {
      const nextSession = await submitPaperDeskAllocation({
        session_id: session.session_id,
        anonymous_id: anonymousId,
        allocations,
      });
      setSession(nextSession);
      void loadHistory(anonymousId);
      trackEvent("paper_desk_allocation_submitted", { session_id: session.session_id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Allocation was not submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resolveSession() {
    if (!session || !anonymousId || !isSubmitted || isResolved) return;
    setResolving(true);
    setError(null);
    try {
      const nextSession = await resolvePaperDeskSession({
        session_id: session.session_id,
        anonymous_id: anonymousId,
      });
      setSession(nextSession);
      void loadHistory(anonymousId);
      trackEvent("paper_desk_resolved", { session_id: session.session_id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Paper session was not resolved.");
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="sw-shell">
      <ThemeToggle />
      <nav className="sw-nav" style={{ position: "relative", top: "auto" }} aria-label="Primary">
        <Link href="/" className="sw-wordmark">
          <Image src="/logo.svg" width={24} height={24} alt="" className="h-6 w-6" />
          StockWin
        </Link>
        <div className="sw-nav-links">
          <Link href="/" className="sw-nav-link">Home</Link>
          <Link href="/dashboard" className="sw-nav-link">Dashboard</Link>
        </div>
      </nav>

      <main className="sw-container-wide py-10 md:py-14">
        <section className="grid gap-6 border-b border-[var(--color-rule)] pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <p className="sw-label">PAPER DESK</p>
            <h1 className="mt-3 text-4xl font-semibold leading-none text-[var(--color-ink)] md:text-6xl">
              One-person investment bank
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--color-ink-2)]">
              Read the Macro, Research, and Risk briefs, then allocate 100% of paper capital across the
              desk universe. Your committee advises; you decide.
            </p>
            <div className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-rule)] bg-[var(--color-elevated)] px-4 text-sm font-medium text-[var(--color-ink)]">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Paper-only research log. No orders.
            </div>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-5 lg:w-auto lg:min-w-[32rem] lg:items-end">
            <a
              href="https://paper.stockwin.win"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 w-fit items-center gap-2 rounded-full border border-[var(--color-rule)] bg-[var(--color-ink)] px-5 text-sm font-semibold text-[var(--color-surface)] transition hover:-translate-y-0.5 hover:bg-[var(--color-teal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
            >
              Change mode
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
            <div className="grid w-full min-w-0 gap-2 sm:grid-cols-3">
              <Metric label="Mode" value="Paper" />
              <Metric label="Benchmark" value={session?.benchmark_symbol || "SPY"} />
              <Metric label="Status" value={session ? formatStatus(session.status) : "Loading"} />
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6">
            <ErrorState message={error} onRetry={() => anonymousId && loadDeskForId(anonymousId)} />
          </div>
        )}

        {loading && (
          <div role="status" aria-live="polite" className="grid gap-6 pt-8 xl:grid-cols-[0.9fr_1.15fr_0.82fr]">
            <span className="sr-only">Loading Paper Desk</span>
            <SkeletonBlock className="h-[28rem]" />
            <SkeletonBlock className="h-[28rem]" />
            <SkeletonBlock className="h-[28rem]" />
          </div>
        )}

        {!loading && !session && !error && (
          <div className="pt-10">
            <EmptyState>No paper session is available right now. Try refreshing.</EmptyState>
          </div>
        )}

        {!loading && session && (
          <div className="grid gap-6 pt-8 xl:grid-cols-[0.9fr_1.15fr_0.82fr]">
            <AllocationPanel
              assets={session.assets}
              benchmarkSymbol={session.benchmark_symbol}
              allocations={allocations}
              submitted={isSubmitted}
              submitting={submitting}
              onChange={updateAllocation}
              onReplace={replaceAllocations}
              onSubmit={submitAllocation}
            />

            <section className="space-y-4" aria-label="Agent committee">
              <SectionHeader label="Committee" right={session.paper_only ? "No execution" : undefined} />
              {session.briefs.length === 0 ? (
                <EmptyState>No briefs were generated for this session.</EmptyState>
              ) : (
                <div className="grid gap-3">
                  {session.briefs.map(brief => (
                    <BriefPanel key={brief.agent} brief={brief} />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4" aria-label="Journal">
              <SectionHeader label="Journal" right={formatDate(session.trading_date)} />
              <div className="space-y-3">
                <LedgerPanel allocations={ledgerAllocations} />

                <ResultPanel
                  result={session.result}
                  assets={session.assets}
                  allocated={ledgerAllocations}
                  canResolve={isSubmitted && !isResolved}
                  resolving={resolving}
                  submitted={isSubmitted}
                  onResolve={resolveSession}
                />

                <HistoryPanel
                  history={history}
                  loading={historyLoading}
                  error={historyError}
                  onRetry={() => anonymousId && loadHistory(anonymousId)}
                />

                <div className="flex items-start justify-between gap-3 pt-1">
                  <PaperOnlyNote>{session.disclaimer}</PaperOnlyNote>
                  <button
                    type="button"
                    onClick={() => anonymousId && loadDeskForId(anonymousId)}
                    className="sw-button-plain min-h-11 shrink-0 px-3"
                    aria-label="Refresh Paper Desk"
                  >
                    <RefreshCw className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function SectionHeader({ label, right }: { label: string; right?: string }) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-4 border-b border-[var(--color-rule)] pb-3">
      <h2 className="sw-label">{label}</h2>
      {right ? <span className="font-mono text-sm text-[var(--color-muted)]">{right}</span> : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="sw-panel p-3">
      <p className="sw-label">{label}</p>
      <p className="mt-2 truncate font-mono text-sm font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  );
}

function getOrCreateAnonymousId() {
  const existing = window.localStorage.getItem(ANONYMOUS_ID_KEY);
  if (existing && existing.length >= 8) return existing;
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  const next = `paper_${random}`;
  window.localStorage.setItem(ANONYMOUS_ID_KEY, next);
  return next;
}
