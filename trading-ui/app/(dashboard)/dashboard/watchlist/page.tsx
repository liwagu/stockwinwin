import { Bell, ListPlus, Star, TrendingUp } from "lucide-react";

const watchlistPreview = [
    { symbol: "BTCUSDT", note: "Core crypto stream", status: "available" },
    { symbol: "NVDA", note: "Equities desk", status: "available" },
    { symbol: "TSLA", note: "Equities desk", status: "available" },
];

export default function WatchlistPage() {
    return (
        <div className="space-y-8">
            <section className="sw-card p-6 sm:p-8">
                <div className="max-w-2xl">
                    <p className="sw-label">WATCHLIST</p>
                    <h1 className="sw-heading mt-3">Personal asset desk.</h1>
                    <p className="sw-copy mt-4">
                        The next product layer is a smaller surface for assets you actually care about, instead of scanning the whole universe every session.
                    </p>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="sw-card p-6">
                    <div className="inline-flex size-11 items-center justify-center rounded-full border border-[var(--color-rule)] bg-[var(--color-elevated)]">
                        <Star className="size-5 text-[var(--color-accent)]" aria-hidden="true" />
                    </div>
                    <h2 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-[var(--color-ink)]">Coming next</h2>
                    <p className="mt-3 text-sm leading-6 text-[var(--color-ink-2)]">
                        Saved tickers, confidence-change alerts, and a compact daily risk sheet for the symbols you choose.
                    </p>
                    <div className="mt-7 grid gap-3">
                        {[
                            { label: "Save symbols", icon: ListPlus },
                            { label: "Track model drift", icon: TrendingUp },
                            { label: "Alert on threshold changes", icon: Bell },
                        ].map(item => (
                            <div key={item.label} className="sw-panel flex items-center gap-3 p-3 text-sm text-[var(--color-ink-2)]">
                                <item.icon className="size-4 text-[var(--color-accent)]" aria-hidden="true" />
                                {item.label}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="sw-card overflow-hidden">
                    <div className="border-b border-[var(--color-rule)] p-5">
                        <p className="sw-label">PREVIEW TABLE</p>
                    </div>
                    <div className="divide-y divide-[var(--color-rule)]">
                        {watchlistPreview.map(item => (
                            <div key={item.symbol} className="grid grid-cols-[1fr_auto] gap-4 p-5">
                                <div>
                                    <p className="font-mono text-base font-semibold text-[var(--color-ink)]">{item.symbol}</p>
                                    <p className="mt-1 text-sm text-[var(--color-ink-2)]">{item.note}</p>
                                </div>
                                <span className="h-fit rounded-full border border-[var(--color-rule)] px-3 py-1 font-mono text-xs text-[var(--color-muted)]">
                                    {item.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
