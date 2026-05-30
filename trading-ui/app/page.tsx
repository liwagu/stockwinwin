"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, Database, RefreshCw, ShieldCheck } from "lucide-react";
import { AnimatedHeroText } from "./components/AnimatedHeroText";
import { CryptoPredictionChart } from "./components/CryptoPredictionChart";
import { Footer } from "./components/Footer";
import { PricingSection } from "./components/PricingSection";
import { ThemeToggle } from "./components/ThemeToggle";
import { trackEvent } from "@/lib/analytics";
import { isPaperDeskEnabled } from "@/lib/features";
import { SUPPORTED_MARKET_SYMBOLS } from "@/lib/markets";
import { useAuth } from "./providers/AuthProvider";
import type { PredictionForecast } from "@/types/predictions";

const landingSymbols = SUPPORTED_MARKET_SYMBOLS.slice(0, 3);

export default function LandingPage() {
  const [forecast, setForecast] = useState<PredictionForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    trackEvent("homepage_viewed", { source_page: "/" });
    void fetchPredictions();
  }, []);

  useEffect(() => {
    if (forecast?.predictions.length && !selectedSymbol) {
      setSelectedSymbol(forecast.predictions[0].symbol);
    }
  }, [forecast, selectedSymbol]);

  const fetchPredictions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/predictions");
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Prediction service is not available.");
        return;
      }

      const filteredPredictions = data.predictions.filter((p: { symbol: string }) =>
        landingSymbols.includes(p.symbol)
      );
      setForecast({ ...data, predictions: filteredPredictions });
      trackEvent("prediction_board_loaded", {
        source_page: "/",
        prediction_count: filteredPredictions.length,
      });
    } catch (err) {
      console.error(err);
      setError("Network error while loading the forecast desk.");
    } finally {
      setLoading(false);
    }
  };

  const selectedPrediction = useMemo(() => {
    return forecast?.predictions.find(prediction => prediction.symbol === selectedSymbol) || null;
  }, [forecast?.predictions, selectedSymbol]);

  const generatedLabel = useMemo(() => {
    if (!forecast?.generated_at) return "Waiting for sync";
    return new Date(forecast.generated_at).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [forecast?.generated_at]);

  const authNavLink = !authLoading && user
    ? { href: "/dashboard", label: "Dashboard" }
    : { href: "/login", label: "Sign in" };
  const paperDeskEnabled = isPaperDeskEnabled();

  return (
    <div className="sw-shell">
      <ThemeToggle />

      <nav className="sw-nav" aria-label="Primary">
        <Link href="/" className="sw-wordmark">
          <Image src="/logo.svg" width={24} height={24} alt="" className="h-6 w-6" />
          StockWin
        </Link>
        <div className="sw-nav-links">
          <Link href="#desk" className="sw-nav-link">Desk</Link>
          {paperDeskEnabled && <Link href="/paper" className="sw-nav-link">Paper</Link>}
          <Link href="#pricing" className="sw-nav-link">Pricing</Link>
          <Link href={authNavLink.href} className="sw-nav-link">{authNavLink.label}</Link>
        </div>
      </nav>

      <main>
        <section className="sw-container-wide grid gap-10 pb-16 pt-16 lg:grid-cols-[0.78fr_1.22fr] lg:items-start lg:pt-24">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
              Forecast service online
            </div>
            <div className="space-y-5">
              <h1 className="sw-display">
                <AnimatedHeroText />
              </h1>
              <p className="sw-copy max-w-xl">
                StockWin turns live market data into 24-hour forecast curves with confidence bands, clear coverage status, and a restrained research surface.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="sw-button-primary">
                Open the desk
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#pricing" className="sw-button-secondary">See pricing</Link>
            </div>
          </div>

          <div id="desk" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: Activity, label: "Preview assets", value: forecast ? String(forecast.predictions.length) : "0" },
                { icon: RefreshCw, label: "Refresh", value: "Hourly" },
                { icon: Database, label: "Last sync", value: generatedLabel },
              ].map(item => (
                <div key={item.label} className="sw-panel p-4">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <p className="sw-label mt-4">{item.label}</p>
                  <p className="mt-1 truncate font-mono text-sm font-semibold">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="sw-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-2 pb-3">
                <div>
                  <p className="sw-label">Live forecast desk</p>
                  <p className="text-sm text-muted-foreground">Select an asset to inspect the curve.</p>
                </div>
                <button type="button" onClick={fetchPredictions} className="sw-button-plain min-h-9 px-3">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>

              {loading && (
                <div className="flex min-h-[24rem] items-center justify-center text-sm text-muted-foreground">
                  Loading the public forecast board
                </div>
              )}

              {!loading && error && (
                <div className="flex min-h-[24rem] flex-col items-center justify-center gap-4 text-center">
                  <ShieldCheck className="h-7 w-7 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Forecast service unavailable</p>
                    <p className="mt-1 max-w-md text-sm text-muted-foreground">{error}</p>
                  </div>
                </div>
              )}

              {forecast && !loading && !error && (
                <div className="grid gap-4 pt-3 lg:grid-cols-[12rem_1fr]">
                  <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
                    {forecast.predictions.map(prediction => (
                      <button
                        key={prediction.symbol}
                        type="button"
                        onClick={() => {
                          setSelectedSymbol(prediction.symbol);
                          trackEvent("prediction_symbol_selected", {
                            source_page: "/",
                            symbol: prediction.symbol,
                          });
                        }}
                        className={`min-w-36 rounded-[var(--radius-input)] border px-3 py-3 text-left text-sm lg:min-w-0 ${
                          selectedSymbol === prediction.symbol ? "border-foreground bg-foreground text-background" : "bg-background"
                        }`}
                      >
                        <span className="block font-semibold">{prediction.display_name}</span>
                        <span className="block font-mono text-xs opacity-70">{prediction.symbol}</span>
                      </button>
                    ))}
                  </div>
                  {selectedPrediction && <CryptoPredictionChart prediction={selectedPrediction} />}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="sw-container grid gap-8 border-y py-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="sw-label">Product posture</p>
            <h2 className="sw-heading mt-3">Forecasts without certainty theater.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["Model output", "24-hour curves show the model path and uncertainty range instead of a single magic number."],
              ["Coverage state", "The desk makes sync time and available assets visible before you make any decision."],
              ["Risk framing", "Forecasts are research inputs, not financial advice or guaranteed outcomes."],
              ["Simple access", "Free sampling stays available; professional access unlocks the broader asset universe."],
            ].map(([title, body]) => (
              <div key={title} className="border-t pt-4">
                <h3 className="font-semibold tracking-[-0.02em]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <PricingSection />
      </main>

      <Footer />
    </div>
  );
}
