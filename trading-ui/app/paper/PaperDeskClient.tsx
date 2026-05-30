"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Landmark,
  LineChart,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { trackEvent } from "@/lib/analytics";
import {
  getPaperDeskHistory,
  getPaperDeskSession,
  resolvePaperDeskSession,
  submitPaperDeskAllocation,
} from "@/lib/paperDesk";
import type { PaperAgent, PaperDeskHistoryResponse, PaperDeskSession } from "@/types/paper-desk";

const ANONYMOUS_ID_KEY = "stockwin_paper_anonymous_id";
const AGENT_META: Record<PaperAgent, { label: string; icon: typeof Landmark }> = {
  macro: { label: "Macro", icon: Landmark },
  research: { label: "Research", icon: Brain },
  risk: { label: "Risk", icon: ShieldCheck },
};

export default function PaperDeskClient() {
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const [session, setSession] = useState<PaperDeskSession | null>(null);
  const [history, setHistory] = useState<PaperDeskHistoryResponse | null>(null);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resolving, setResolving] = useState(false);

  const loadDeskForId = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const [nextSession, nextHistory] = await Promise.all([
        getPaperDeskSession(id),
        getPaperDeskHistory(id),
      ]);
      setSession(nextSession);
      setHistory(nextHistory);
      trackEvent("paper_desk_loaded", { status: nextSession.status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Paper Desk is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

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

    const next: Record<string, number> = {};
    for (const asset of session.assets) {
      next[asset.symbol] = asset.symbol === "SPY" ? 100 : 0;
    }
    setAllocations(next);
  }, [session]);

  const totalAllocation = useMemo(
    () => Object.values(allocations).reduce((sum, value) => sum + Number(value || 0), 0),
    [allocations]
  );

  const totalIsValid = Math.abs(totalAllocation - 100) <= 0.01;
  const isSubmitted = Boolean(session?.allocation);
  const isResolved = Boolean(session?.result);

  function updateAllocation(symbol: string, value: number) {
    if (isSubmitted) return;
    const bounded = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
    setAllocations(current => ({ ...current, [symbol]: bounded }));
  }

  function resetToBenchmark() {
    if (!session || isSubmitted) return;
    setAllocations(
      Object.fromEntries(session.assets.map(asset => [asset.symbol, asset.symbol === "SPY" ? 100 : 0]))
    );
  }

  async function submitAllocation() {
    if (!session || !anonymousId || !totalIsValid || isSubmitted) return;
    setSubmitting(true);
    setError(null);
    try {
      const nextSession = await submitPaperDeskAllocation({
        session_id: session.session_id,
        anonymous_id: anonymousId,
        allocations,
      });
      setSession(nextSession);
      const nextHistory = await getPaperDeskHistory(anonymousId);
      setHistory(nextHistory);
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
      const nextHistory = await getPaperDeskHistory(anonymousId);
      setHistory(nextHistory);
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
            <div className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-rule)] bg-[var(--color-elevated)] px-4 text-sm font-medium text-[var(--color-ink)]">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Paper-only research log. No orders.
            </div>
          </div>
          <div className="grid w-full min-w-0 gap-2 sm:grid-cols-3 lg:w-auto lg:min-w-[32rem]">
            <Metric label="Mode" value="Paper" />
            <Metric label="Benchmark" value={session?.benchmark_symbol || "SPY"} />
            <Metric label="Status" value={session?.status || "Loading"} />
          </div>
        </section>

        {error && (
          <div role="alert" className="mt-6 flex items-start gap-3 rounded-[var(--radius-panel)] border border-[var(--color-negative)]/40 bg-[var(--color-negative)]/5 p-4 text-sm text-[var(--color-ink)]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div role="status" aria-live="polite" className="grid min-h-[32rem] place-items-center text-sm text-[var(--color-muted)]">
            Loading Paper Desk
          </div>
        )}

        {!loading && session && (
          <div className="grid gap-6 pt-8 xl:grid-cols-[0.9fr_1.15fr_0.82fr]">
            <section className="space-y-4">
              <SectionHeader label="Allocation" right={`${totalAllocation.toFixed(0)}%`} />
              <div className="space-y-3">
                {session.assets.map(asset => (
                  <AllocationRow
                    key={asset.symbol}
                    symbol={asset.symbol}
                    name={asset.display_name}
                    price={asset.current_price}
                    source={asset.price_source}
                    value={allocations[asset.symbol] || 0}
                    disabled={isSubmitted}
                    onChange={value => updateAllocation(asset.symbol, value)}
                  />
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-rule)] pt-4">
                <button
                  type="button"
                  onClick={resetToBenchmark}
                  disabled={isSubmitted}
                  className="sw-button-secondary min-h-11 px-4 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={submitAllocation}
                  disabled={!totalIsValid || submitting || isSubmitted}
                  className="sw-button-primary min-h-11 px-4 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitted ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
                  {isSubmitted ? "Submitted" : submitting ? "Submitting" : "Submit"}
                </button>
              </div>
              {!totalIsValid && (
                <p className="text-sm text-[var(--color-negative)]">Total must equal 100%.</p>
              )}
            </section>

            <section className="space-y-4">
              <SectionHeader label="Committee" right={session.paper_only ? "No execution" : ""} />
              <div className="grid gap-3">
                {session.briefs.map(brief => {
                  const meta = AGENT_META[brief.agent];
                  const Icon = meta.icon;
                  return (
                    <article key={brief.agent} className="sw-panel p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-rule)] bg-[var(--color-elevated)]">
                            <Icon className="size-4" aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <p className="sw-label">{meta.label}</p>
                            <h3 className="truncate text-lg font-semibold">{brief.stance}</h3>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <span
                            aria-label={`${meta.label} confidence ${Math.round(brief.confidence * 100)} percent`}
                            className="block font-mono text-sm text-[var(--color-muted)]"
                          >
                            {Math.round(brief.confidence * 100)}%
                          </span>
                          <span className="mt-1 block rounded-full border border-[var(--color-rule)] px-2 py-1 font-mono text-[0.68rem] text-[var(--color-muted)]">
                            {formatSourceQuality(brief.source_quality)}
                          </span>
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-[var(--color-ink-2)]">{brief.thesis}</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <BriefBlock label="Evidence" lines={brief.evidence} />
                        <BriefBlock label="Invalidation" lines={[brief.invalidation]} />
                      </div>
                      <p className="mt-4 border-t border-[var(--color-rule)] pt-3 text-sm text-[var(--color-ink-2)]">
                        {brief.allocation_guardrails}
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="space-y-4">
              <SectionHeader label="Journal" right={formatDate(session.trading_date)} />
              <div className="space-y-3">
                <div className="sw-panel p-4">
                  <p className="sw-label">Ledger</p>
                  <div className="mt-3 space-y-2 text-sm">
                    {(session.allocation ? Object.entries(session.allocation.allocations) : Object.entries(allocations))
                      .filter(([, value]) => value > 0)
                      .map(([symbol, value]) => (
                        <div key={symbol} className="flex items-center justify-between gap-3">
                          <span className="font-mono font-semibold">{symbol}</span>
                          <span className="font-mono text-[var(--color-muted)]">{value.toFixed(0)}%</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="sw-panel p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="sw-label">Score</p>
                    {session.result ? (
                      <span className="rounded-full border border-[var(--color-rule)] px-2 py-1 font-mono text-[0.68rem] text-[var(--color-muted)]">
                        {formatSourceQuality(session.result.price_source)}
                      </span>
                    ) : null}
                  </div>
                  {session.result ? (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <ResultMetric label="Portfolio" value={formatReturn(session.result.portfolio_return)} />
                      <ResultMetric label="Benchmark" value={formatReturn(session.result.benchmark_return)} />
                      <ResultMetric label="Alpha" value={formatReturn(session.result.alpha)} />
                      <ResultMetric label="Drawdown" value={formatDrawdown(session.result.drawdown)} />
                    </div>
                  ) : (
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <span className="text-sm text-[var(--color-ink-2)]">
                        {isSubmitted ? "Ready to score" : "Waiting for allocation"}
                      </span>
                      <button
                        type="button"
                        onClick={resolveSession}
                        disabled={!isSubmitted || resolving || isResolved}
                        className="sw-button-secondary min-h-11 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <LineChart className="size-4" aria-hidden="true" />
                        {resolving ? "Resolving" : "Resolve"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="sw-panel p-4">
                  <p className="sw-label">History</p>
                  <div className="mt-3 space-y-2">
                    {(history?.sessions || []).slice(0, 3).map(item => (
                      <div key={item.session_id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate">{formatDate(item.trading_date)}</span>
                        <span className="font-mono text-[var(--color-muted)]">{item.status}</span>
                      </div>
                    ))}
                    {!history?.sessions.length && (
                      <p className="text-sm text-[var(--color-ink-2)]">No submitted sessions yet.</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-xs leading-5 text-[var(--color-muted)]">{session.disclaimer}</p>
                  <button
                    type="button"
                    onClick={() => anonymousId && loadDeskForId(anonymousId)}
                    className="sw-button-plain min-h-11 px-3"
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

function AllocationRow(props: {
  symbol: string;
  name: string;
  price: number;
  source: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="sw-panel p-4">
      <div className="grid gap-3 sm:grid-cols-[7rem_1fr_4.5rem] sm:items-center">
        <div className="min-w-0">
          <p className="font-mono text-base font-semibold">{props.symbol}</p>
          <p className="truncate text-sm text-[var(--color-ink-2)]">{props.name}</p>
          <p className="font-mono text-xs text-[var(--color-muted)]">
            {formatMoney(props.price)} / {props.source}
          </p>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={props.value}
          disabled={props.disabled}
          onChange={event => props.onChange(Number(event.target.value))}
          className="h-11 w-full accent-[var(--color-ink)] disabled:opacity-60"
          aria-label={`${props.symbol} allocation`}
        />
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={props.value}
          disabled={props.disabled}
          onChange={event => props.onChange(Number(event.target.value))}
          className="sw-input h-11 w-full px-2 text-right font-mono text-sm disabled:opacity-60"
          aria-label={`${props.symbol} allocation percent`}
        />
      </div>
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
      <p className="mt-2 truncate font-mono text-sm font-semibold">{value}</p>
    </div>
  );
}

function BriefBlock({ label, lines }: { label: string; lines: string[] }) {
  return (
    <div className="border-t border-[var(--color-rule)] pt-3">
      <p className="sw-label">{label}</p>
      <div className="mt-2 space-y-1">
        {lines.map(line => (
          <p key={line} className="text-sm leading-5 text-[var(--color-ink-2)]">{line}</p>
        ))}
      </div>
    </div>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  const positive = value.startsWith("+");
  const negative = value.startsWith("-");
  return (
    <div className="border-t border-[var(--color-rule)] pt-3">
      <p className="sw-label">{label}</p>
      <p
        className={`mt-2 font-mono text-lg font-semibold ${
          positive ? "text-[var(--color-accent-2)]" : negative ? "text-[var(--color-negative)]" : ""
        }`}
      >
        {value}
      </p>
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

function formatMoney(value: number) {
  if (value >= 10000) {
    return `$${Math.round(value).toLocaleString("en-US")}`;
  }
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function formatReturn(value: number) {
  const percent = value * 100;
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
}

function formatDrawdown(value: number) {
  if (value === 0) return "0.00%";
  return `-${(value * 100).toFixed(2)}%`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatSourceQuality(value: string) {
  return value.replace(/_/g, " ");
}
