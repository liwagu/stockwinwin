"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CryptoPredictionChart } from "@/app/components/CryptoPredictionChart";
import { BlurOverlay } from "@/app/components/BlurOverlay";

import { PredictionPlaceholder } from "@/app/(dashboard)/components/prediction-placeholder";
import { CelebrationOverlay } from "@/app/components/CelebrationOverlay";
import { Footer } from "@/app/components/Footer";
import { CRYPTO_ASSETS, STOCK_ASSETS } from "@/app/(dashboard)/config/assets";
import { useSubscriptionStatus } from "@/app/hooks/useSubscriptionStatus";
import { trackEvent } from "@/lib/analytics";
import type { CryptoPrediction, PredictionForecast } from "@/types/predictions";

type UserProfile = {
    tier?: string;
    plan?: string;
    email?: string;
};

type DashboardClientProps = {
    user: User;
    profile: UserProfile | null;
    initialPredictions: PredictionForecast | null;
    searchParams: { [key: string]: string | string[] | undefined };
};

const buildPredictionMap = (predictions: CryptoPrediction[]): Map<string, CryptoPrediction> => {
    const map = new Map<string, CryptoPrediction>();

    for (const prediction of predictions) {
        const symbol = prediction.symbol?.toUpperCase();
        if (!symbol) continue;

        map.set(symbol, prediction);

        if (symbol.endsWith("USDT")) {
            map.set(symbol.replace("USDT", ""), prediction);
        }

        const [baseSymbol] = symbol.split(".");
        if (baseSymbol && baseSymbol !== symbol) {
            map.set(baseSymbol, prediction);
        }

        const alphanumericSymbol = symbol.replace(/[^A-Z0-9]/g, "");
        if (alphanumericSymbol && alphanumericSymbol !== symbol) {
            map.set(alphanumericSymbol, prediction);
        }
    }

    return map;
};

export function DashboardClient({
    user,
    profile,
    initialPredictions,
    searchParams,
}: DashboardClientProps) {
    const router = useRouter();
    const [forecast, setForecast] = useState<PredictionForecast | null>(initialPredictions);
    const [predictionsError, setPredictionsError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedPrediction, setExpandedPrediction] = useState<CryptoPrediction | null>(null);

    const quickFilters = ["BTC", "ETH", "XRP", "NVDA"];

    // Upgrade flow state
    const upgradeStatus = typeof searchParams.upgraded === "string" ? searchParams.upgraded : undefined;
    const isUpgradeSuccess = upgradeStatus === "success";
    const isUpgradeCanceled = upgradeStatus === "canceled";
    const [showCelebration, setShowCelebration] = useState(false);

    // Poll subscription status after successful Stripe checkout
    const { isPro, isPolling, error: pollingError } = useSubscriptionStatus(isUpgradeSuccess);

    const displayName =
        (user?.user_metadata?.full_name as string | undefined) ||
        user?.user_metadata?.name ||
        user?.email ||
        "Investor";

    const tierLabel = (profile?.tier || profile?.plan || "free").toUpperCase();
    const isFreeUser = tierLabel === "FREE";

    // Clear unused `plan` parameter from URL (it's not used in dashboard)
    useEffect(() => {
        const planParam = searchParams.plan;
        if (planParam && !upgradeStatus) {
            router.replace("/dashboard");
        }
    }, [searchParams, upgradeStatus, router]);

    // Fetch predictions periodically (every 5 minutes)
    useEffect(() => {
        const fetchPredictions = async () => {
            try {
                const response = await fetch("/api/predictions");

                if (!response.ok) {
                    if (response.status === 503) {
                        setPredictionsError("Predictions are being generated. Please refresh in a moment.");
                        return;
                    }
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                setForecast(data);
                setPredictionsError(null);
            } catch (error) {
                console.error("Failed to load predictions:", error);
                setPredictionsError("Unable to load predictions. Backend service may be offline.");
            }
        };

        const interval = setInterval(fetchPredictions, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        trackEvent("dashboard_returned", {
            tier: tierLabel.toLowerCase(),
            prediction_count: forecast?.predictions.length || 0,
        });
    }, [forecast?.predictions.length, tierLabel]);

    useEffect(() => {
        if (isPro && isUpgradeSuccess) {
            trackEvent("checkout_completed", {
                plan: "professional",
                source_page: "/dashboard",
            });
            setShowCelebration(true);
        }
    }, [isPro, isUpgradeSuccess]);

    const handleCelebrationComplete = () => {
        setShowCelebration(false);
        router.replace("/dashboard");
        router.refresh();
    };

    const cryptoPredictions = forecast?.predictions.filter(p => p.symbol.includes("USDT")) || [];
    const stockPredictions = forecast?.predictions.filter(p => !p.symbol.includes("USDT")) || [];

    const cryptoPredictionMap = buildPredictionMap(cryptoPredictions);
    const stockPredictionMap = buildPredictionMap(stockPredictions);

    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filterAssets = useMemo(() => {
        const matches = (symbol: string, displayName: string) => {
            if (!normalizedQuery) return true;
            return symbol.toLowerCase().includes(normalizedQuery) || displayName.toLowerCase().includes(normalizedQuery);
        };

        return {
            crypto: CRYPTO_ASSETS.filter(asset => matches(asset.symbol, asset.displayName)),
            stocks: STOCK_ASSETS.filter(asset => matches(asset.symbol, asset.displayName)),
        };
    }, [normalizedQuery]);

    const filteredCryptoAssets = filterAssets.crypto;
    const filteredStockAssets = filterAssets.stocks;

    const countAssetsWithData = (assets: typeof CRYPTO_ASSETS, map: Map<string, CryptoPrediction>) =>
        assets.filter(asset => map.has(asset.symbol.toUpperCase())).length;

    const cryptoCoverageAll = countAssetsWithData(CRYPTO_ASSETS, cryptoPredictionMap);
    const stockCoverageAll = countAssetsWithData(STOCK_ASSETS, stockPredictionMap);
    const cryptoAssetsWithData = countAssetsWithData(filteredCryptoAssets, cryptoPredictionMap);
    const stockAssetsWithData = countAssetsWithData(filteredStockAssets, stockPredictionMap);
    const hasSearch = normalizedQuery.length > 0;

    const closeExpandedPrediction = () => setExpandedPrediction(null);
    const handleExpandPrediction = (prediction: CryptoPrediction) => setExpandedPrediction(prediction);

    useEffect(() => {
        if (!expandedPrediction) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                closeExpandedPrediction();
            }
        };

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [expandedPrediction]);

    const lastUpdatedLabel = useMemo(() => {
        if (!forecast?.generated_at) return "Syncing";
        try {
            const date = new Date(forecast.generated_at);
            return date.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return "Syncing";
        }
    }, [forecast?.generated_at]);

    const handleQuickFilter = (value: string) => {
        setSearchQuery(value);
        trackEvent("dashboard_quick_filter_clicked", {
            query: value,
            tier: tierLabel.toLowerCase(),
        });
    };

    const handleLockedUpgradeClick = (symbol: string, assetType: "crypto" | "stock") => {
        trackEvent("locked_symbol_clicked", {
            symbol,
            asset_type: assetType,
            tier: tierLabel.toLowerCase(),
        });
        router.push(`/dashboard/billing?symbol=${encodeURIComponent(symbol)}`);
    };

    return (
        <>
            <CelebrationOverlay isVisible={showCelebration} onComplete={handleCelebrationComplete} />

            <div className="space-y-10">
                <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
                    <Card className="sw-card">
                        <CardHeader className="space-y-3">
                            <div className="flex flex-wrap items-end justify-between gap-3">
                                <div>
                                    <p className="sw-label">COMMAND CONSOLE</p>
                                    <p className="sw-heading mt-2">Welcome back, {displayName}</p>
                                </div>
                                <div className="text-right text-sm text-[var(--color-ink-2)]">
                                    <p className="sw-label">LAST SYNC</p>
                                    <p>{lastUpdatedLabel}</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-3 sm:grid-cols-3">
                                {[
                                    {
                                        label: "Crypto coverage",
                                        value: `${cryptoCoverageAll} / ${CRYPTO_ASSETS.length}`,
                                    },
                                    {
                                        label: "Stock coverage",
                                        value: `${stockCoverageAll} / ${STOCK_ASSETS.length}`,
                                    },
                                    {
                                        label: "Model latency",
                                        value: forecast ? "~60m" : "Syncing",
                                    },
                                ].map(stat => (
                                    <div
                                        key={stat.label}
                                        className="sw-panel px-4 py-4 text-sm text-[var(--color-ink-2)]"
                                    >
                                        <p className="sw-label">{stat.label}</p>
                                        <p className="mt-2 font-mono text-2xl font-semibold text-[var(--color-ink)]">{stat.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3">
                                <p className="sw-label">SEARCH UNIVERSE</p>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
                                    <Input
                                        placeholder="Find any ticker e.g. BTC, Apple, TSLA"
                                        value={searchQuery}
                                        onChange={event => setSearchQuery(event.target.value)}
                                        className="sw-input pl-11 text-base placeholder:text-[var(--color-muted)]"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.08em] text-[var(--color-muted)]">
                                    {quickFilters.map(filter => (
                                        <button
                                            type="button"
                                            key={filter}
                                            onClick={() => handleQuickFilter(filter)}
                                            className="rounded-full border border-[var(--color-rule)] px-3 py-1 transition hover:border-[var(--color-rule-strong)] hover:text-[var(--color-ink)]"
                                        >
                                            #{filter}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="sw-card">
                        <CardHeader className="space-y-3">
                            <p className="sw-label">ACCESS TIER</p>
                            <p className="sw-heading">{tierLabel} mode</p>
                            <p className="text-sm leading-6 text-[var(--color-ink-2)]">
                                {isFreeUser
                                    ? "Unlock the full AI signal stack across all crypto & equities."
                                    : "You have full access to every prediction stream and advanced tooling."}
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <ul className="space-y-2 text-sm text-[var(--color-ink-2)]">
                                <li>24h AI forecast curves</li>
                                <li>Confidence bands and model notes</li>
                                <li>Custom ticker search desk</li>
                            </ul>
                            <button
                                type="button"
                                className={`w-full ${isFreeUser ? "sw-button-primary" : "sw-button-secondary"}`}
                                onClick={() => router.push("/dashboard/billing")}
                            >
                                {isFreeUser ? "Upgrade to Pro" : "Manage Plan"}
                            </button>
                        </CardContent>
                    </Card>
                </div>



                {isPolling && (
                    <Card className="sw-panel text-[var(--color-ink)]">
                        <CardContent className="pt-6">
                            <p className="text-center text-sm">Confirming your upgrade...</p>
                        </CardContent>
                    </Card>
                )}

                {pollingError && (
                    <Card className="border-[var(--color-warning)] bg-[color-mix(in_oklch,var(--color-warning)_10%,transparent)] text-[var(--color-ink)]">
                        <CardContent className="pt-6">
                            <p className="text-sm text-center">{pollingError}</p>
                        </CardContent>
                    </Card>
                )}

                {isUpgradeCanceled && (
                    <Card className="sw-panel text-[var(--color-ink)]">
                        <CardContent className="pt-6 text-center space-y-2">
                            <p className="text-base font-semibold">No changes made</p>
                            <p className="text-sm text-[var(--color-ink-2)]">
                                Your free tier is still active. Upgrade anytime when you&apos;re ready.
                            </p>
                            <button
                                onClick={() => router.replace("/dashboard")}
                                className="text-sm text-[var(--color-accent)] underline underline-offset-4"
                            >
                                Dismiss
                            </button>
                        </CardContent>
                    </Card>
                )}

                {predictionsError && (
                    <Card className="border-[var(--color-warning)] bg-[color-mix(in_oklch,var(--color-warning)_10%,transparent)] text-[var(--color-ink)]">
                        <CardContent className="pt-6">
                            <p className="text-sm text-center">{predictionsError}</p>
                        </CardContent>
                    </Card>
                )}

                <div className="space-y-5">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <p className="sw-label">DESK 01</p>
                            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-ink)]">Cryptocurrency desk</h2>
                            <p className="text-sm text-[var(--color-ink-2)]">24h horizon / refreshed hourly</p>
                        </div>
                        <span className="text-sm text-[var(--color-ink-2)]">
                            Live data for {cryptoAssetsWithData} / {hasSearch ? filteredCryptoAssets.length : CRYPTO_ASSETS.length} assets
                        </span>
                    </div>

                    {filteredCryptoAssets.length === 0 ? (
                        <Card className="sw-panel">
                            <CardContent className="pt-6 text-center text-sm text-[var(--color-ink-2)]">
                                No cryptocurrency matches for {'"'}{searchQuery}{'"'}. Try another ticker.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {filteredCryptoAssets.map(asset => {
                                const prediction = cryptoPredictionMap.get(asset.symbol.toUpperCase());
                                const isLockedForUser = isFreeUser && asset.tier === "pro";

                                const content = prediction ? (
                                    <CryptoPredictionChart
                                        prediction={prediction}
                                        onExpand={handleExpandPrediction}
                                    />
                                ) : (
                                    <PredictionPlaceholder assetName={asset.displayName} />
                                );

                                return (
                                    <BlurOverlay
                                        key={asset.symbol}
                                        isBlurred={isLockedForUser}
                                        predictionName={asset.displayName}
                                        onUpgradeClick={() => handleLockedUpgradeClick(asset.symbol, "crypto")}
                                    >
                                        {content}
                                    </BlurOverlay>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="space-y-5">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <p className="sw-label">DESK 02</p>
                            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-ink)]">Equities desk</h2>
                            <p className="text-sm text-[var(--color-ink-2)]">US large-cap universe / refreshed hourly</p>
                        </div>
                        <span className="text-sm text-[var(--color-ink-2)]">
                            Live data for {stockAssetsWithData} / {hasSearch ? filteredStockAssets.length : STOCK_ASSETS.length} assets
                        </span>
                    </div>

                    {filteredStockAssets.length === 0 ? (
                        <Card className="sw-panel">
                            <CardContent className="pt-6 text-center text-sm text-[var(--color-ink-2)]">
                                No stock matches for {'"'}{searchQuery}{'"'}. Try another ticker.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {filteredStockAssets.map(asset => {
                                const prediction = stockPredictionMap.get(asset.symbol.toUpperCase());
                                const isLockedForUser = isFreeUser && asset.tier === "pro";

                                const content = prediction ? (
                                    <CryptoPredictionChart
                                        prediction={prediction}
                                        onExpand={handleExpandPrediction}
                                    />
                                ) : (
                                    <PredictionPlaceholder assetName={asset.displayName} />
                                );

                                return (
                                    <BlurOverlay
                                        key={asset.symbol}
                                        isBlurred={isLockedForUser}
                                        predictionName={asset.displayName}
                                        onUpgradeClick={() => handleLockedUpgradeClick(asset.symbol, "stock")}
                                    >
                                        {content}
                                    </BlurOverlay>
                                );
                            })}
                        </div>
                    )}
                </div>

                <Card className="sw-panel text-[var(--color-ink-2)]">
                    <CardContent className="pt-6">
                        <p className="text-center text-sm">
                            Predictions powered by StockWin&apos;s AI forecasting stack. Updated hourly with live market data.
                            {isFreeUser && (
                                <span className="mt-2 block text-[var(--color-ink)]">
                                    Upgrade to <span className="font-semibold text-[var(--color-accent)]">PRO</span> to unlock every desk and custom ticker search.
                                </span>
                            )}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Footer />

            {expandedPrediction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={closeExpandedPrediction} />
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="sw-card relative z-10 w-[min(calc(100%_-_1rem),64rem)] p-4 shadow-[0_24px_60px_-32px_var(--color-shadow)] sm:p-6"
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <p className="sw-label">EXPANDED VIEW</p>
                                <p className="text-xl font-semibold text-[var(--color-ink)]">{expandedPrediction.display_name}</p>
                            </div>
                            <button
                                type="button"
                                onClick={closeExpandedPrediction}
                                className="sw-button-secondary min-h-9 px-3 text-sm"
                                aria-label="Close expanded chart"
                            >
                                Close
                            </button>
                        </div>
                        <CryptoPredictionChart prediction={expandedPrediction} isExpanded />
                    </div>
                </div>
            )}
        </>
    );
}
