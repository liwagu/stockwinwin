import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { CryptoPredictionChart } from "@/app/components/CryptoPredictionChart";
import { Footer } from "@/app/components/Footer";
import { MarketLeadForm } from "@/app/components/MarketLeadForm";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { getSupportedMarket, SUPPORTED_MARKETS } from "@/lib/markets";
import type { CryptoPrediction } from "@/types/predictions";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export const dynamic = "force-dynamic";

const dateTimeFormatOptions: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
};

type MarketPageProps = {
  params: Promise<{ symbol: string }>;
};

export async function generateMetadata({ params }: MarketPageProps): Promise<Metadata> {
  const { symbol } = await params;
  const market = getSupportedMarket(symbol);

  if (!market) {
    return {
      title: "Market Forecast Not Found | StockWin",
    };
  }

  return {
    title: `${market.symbol} AI Forecast Today | StockWin`,
    description: `24-hour AI forecast curve, confidence band, and current market sync for ${market.displayName}. Informational research only, not financial advice.`,
    alternates: {
      canonical: `https://www.stockwin.win/markets/${market.symbol.toLowerCase()}`,
    },
    openGraph: {
      title: `${market.symbol} AI Forecast Today`,
      description: `Inspect the latest StockWin forecast curve for ${market.displayName}.`,
      url: `https://www.stockwin.win/markets/${market.symbol.toLowerCase()}`,
      siteName: "StockWin",
      type: "website",
    },
  };
}

export default async function MarketPage({ params }: MarketPageProps) {
  const { symbol } = await params;
  const market = getSupportedMarket(symbol);

  if (!market) {
    notFound();
  }

  const prediction = await fetchPrediction(market.symbol);

  if (!prediction) {
    notFound();
  }

  const finalPoint = prediction.predictions[prediction.predictions.length - 1];
  const targetPrice = finalPoint?.predicted_price || prediction.current_price;
  const changePct = ((targetPrice - prediction.current_price) / prediction.current_price) * 100;
  const isPositive = changePct >= 0;
  const generatedAt = new Date(prediction.forecast_timestamp).toLocaleString("en-US", dateTimeFormatOptions);
  const relatedMarkets = SUPPORTED_MARKETS
    .filter(item => item.symbol !== market.symbol && item.assetType === market.assetType)
    .slice(0, 6);

  return (
    <main className="sw-shell">
      <ThemeToggle />

      <nav className="sw-nav" aria-label="Primary">
        <Link href="/" className="sw-wordmark">
          <span className="sw-logo-mark">S</span>
          StockWin
        </Link>
        <div className="sw-nav-links">
          <Link href="/" className="sw-nav-link">Home</Link>
          <Link href="/signup?plan=pro" className="sw-nav-link">Upgrade</Link>
        </div>
      </nav>

      <section className="sw-container-wide py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back to forecast desk
        </Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div className="space-y-6">
            <div>
              <p className="sw-label">{market.assetType === "crypto" ? "Crypto forecast" : "Equity forecast"}</p>
              <h1 className="sw-display mt-3">{market.symbol} AI forecast today.</h1>
              <p className="sw-copy mt-5">
                Latest 24-hour StockWin forecast curve for {market.displayName}, including target price, confidence band, and sync timestamp.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="sw-panel p-4">
                <p className="sw-label">Current</p>
                <p className="mt-2 font-mono text-2xl font-semibold">${formatPrice(prediction.current_price)}</p>
              </div>
              <div className="sw-panel p-4">
                <p className="sw-label">24h target</p>
                <p className="mt-2 font-mono text-2xl font-semibold">${formatPrice(targetPrice)}</p>
              </div>
              <div className="sw-panel p-4">
                <p className="sw-label">Forecast move</p>
                <p className={`mt-2 flex items-center gap-2 font-mono text-2xl font-semibold ${isPositive ? "text-[var(--color-accent-2)]" : "text-[var(--color-negative)]"}`}>
                  {isPositive ? <TrendingUp className="size-5" /> : <TrendingDown className="size-5" />}
                  {isPositive ? "+" : ""}{changePct.toFixed(2)}%
                </p>
              </div>
            </div>

            <MarketLeadForm symbol={market.symbol} displayName={market.displayName} />
          </div>

          <div className="space-y-5">
            <CryptoPredictionChart prediction={prediction} isExpanded />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="sw-panel p-4">
                <Clock className="size-4 text-muted-foreground" />
                <p className="sw-label mt-4">Last generated</p>
                <p className="mt-2 font-mono text-sm font-semibold">{generatedAt}</p>
              </div>
              <div className="sw-panel p-4">
                <ShieldCheck className="size-4 text-muted-foreground" />
                <p className="sw-label mt-4">Risk frame</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Research output only. Not investment advice or a guarantee of future performance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sw-container border-y py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="sw-label">Related markets</p>
            <h2 className="sw-heading mt-3">More {market.assetType === "crypto" ? "crypto" : "equity"} forecasts.</h2>
          </div>
          <Link href="/signup?plan=pro" className="sw-button-secondary">
            Open dashboard
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {relatedMarkets.map(item => (
            <Link key={item.symbol} href={`/markets/${item.symbol.toLowerCase()}`} className="sw-panel block p-4 transition hover:border-[var(--color-rule-strong)]">
              <p className="sw-label">{item.symbol}</p>
              <p className="mt-2 font-semibold">{item.displayName}</p>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}

async function fetchPrediction(symbol: string): Promise<CryptoPrediction | null> {
  const response = await fetch(`${AI_SERVICE_URL}/v1/predictions/${symbol}`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch ${symbol} prediction: ${response.status}`);
  }

  return response.json();
}

function formatPrice(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
