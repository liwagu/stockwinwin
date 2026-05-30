"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Gauge, LineChart, ShieldCheck } from "lucide-react";
import { GoogleMark } from "@/app/components/GoogleMark";
import { useAuth } from "@/app/providers/AuthProvider";

export default function LoginPage() {
    const router = useRouter();
    const { user, loading, signInWithGoogle } = useAuth();

    useEffect(() => {
        if (!loading && user) {
            router.replace("/dashboard");
        }
    }, [loading, router, user]);

    const handleGoogleSignIn = async () => {
        await signInWithGoogle();
    };

    return (
        <main className="sw-shell">
            <nav className="sw-nav" aria-label="Primary">
                <Link href="/" className="sw-wordmark">
                    <span className="sw-logo-mark">S</span>
                    StockWin
                </Link>
                <div className="sw-nav-links">
                    <Link href="/#pricing" className="sw-nav-link">Pricing</Link>
                    <Link href="/signup" className="sw-nav-link">Sign up</Link>
                </div>
            </nav>

            <section className="sw-container-wide grid min-h-[calc(100vh-6rem)] items-center gap-8 py-12 lg:grid-cols-[0.86fr_1fr]">
                <div className="sw-card p-6 sm:p-8">
                    <div className="space-y-3">
                        <p className="sw-label">SECURE ACCESS</p>
                        <h1 className="sw-heading">Welcome back to the market desk.</h1>
                        <p className="sw-copy">
                            Sign in to inspect forecasts, subscription status, and the latest prediction sync.
                        </p>
                    </div>

                    <div className="mt-8 space-y-5">
                        <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            className="sw-button-primary w-full disabled:pointer-events-none disabled:opacity-50"
                        >
                            <GoogleMark />
                            {loading ? "Opening Google..." : "Continue with Google"}
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </button>

                        <p className="text-sm leading-6 text-[var(--color-muted)]">
                            By continuing you agree to the{" "}
                            <Link href="/terms" className="font-medium text-[var(--color-accent)] underline-offset-4 hover:underline">
                                Terms
                            </Link>{" "}
                            and{" "}
                            <Link href="/privacy" className="font-medium text-[var(--color-accent)] underline-offset-4 hover:underline">
                                Privacy Policy
                            </Link>
                            .
                        </p>
                    </div>

                    <p className="mt-8 border-t border-[var(--color-rule)] pt-5 text-sm text-[var(--color-ink-2)]">
                        New to StockWin?{" "}
                        <Link href="/signup" className="font-semibold text-[var(--color-ink)] underline-offset-4 hover:underline">
                            Create an account
                        </Link>
                    </p>
                </div>

                <aside className="sw-card p-6 sm:p-8">
                    <div className="grid gap-4 sm:grid-cols-3">
                        {[
                            { label: "Forecast horizon", value: "24h", icon: Gauge },
                            { label: "Refresh cadence", value: "Hourly", icon: LineChart },
                            { label: "Payment", value: "Stripe", icon: ShieldCheck },
                        ].map(item => (
                            <div key={item.label} className="sw-panel p-4">
                                <item.icon className="mb-4 size-5 text-[var(--color-accent)]" aria-hidden="true" />
                                <p className="sw-label">{item.label}</p>
                                <p className="mt-2 font-mono text-xl font-semibold text-[var(--color-ink)]">{item.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 border-t border-[var(--color-rule)] pt-8">
                        <p className="sw-label">FORECAST DESK</p>
                        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-ink)]">
                            Forecasts, coverage, and risk context in one view.
                        </h2>
                        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--color-ink-2)]">
                            StockWin keeps model output close to sync state and asset coverage, so each curve is easier to judge before it enters your own trading process.
                        </p>
                    </div>

                    <div className="mt-8 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-rule)]">
                        {["BTCUSDT", "ETHUSDT", "NVDA", "TSLA"].map((symbol, index) => (
                            <div
                                key={symbol}
                                className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-[var(--color-rule)] px-4 py-3 last:border-b-0"
                            >
                                <span className="font-mono text-sm font-semibold text-[var(--color-ink)]">{symbol}</span>
                                <span className="font-mono text-sm text-[var(--color-muted)]">
                                    {index === 0 ? "live" : "queued"}
                                </span>
                            </div>
                        ))}
                    </div>
                </aside>
            </section>
        </main>
    );
}
