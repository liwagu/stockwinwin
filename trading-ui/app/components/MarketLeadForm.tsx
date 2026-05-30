"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { readAttributionParams, trackEvent } from "@/lib/analytics";

type MarketLeadFormProps = {
  symbol: string;
  displayName: string;
};

export function MarketLeadForm({ symbol, displayName }: MarketLeadFormProps) {
  const [email, setEmail] = useState("");
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          preferred_assets: [symbol],
          selected_symbol: symbol,
          consent_marketing: consentMarketing,
          source: "market_page",
          intent: `daily_updates:${symbol}`,
          ...readAttributionParams(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail?.message || data.message || "Unable to subscribe right now.");
      }

      trackEvent("interest_submitted", {
        source_page: `/markets/${symbol.toLowerCase()}`,
        symbol,
      });
      setMessage(`You are on the ${displayName} update list.`);
      setEmail("");
      setConsentMarketing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to subscribe right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="sw-card space-y-4 p-5">
      <div>
        <p className="sw-label">Daily updates</p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">Follow {displayName}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Get notified when this forecast page becomes a daily report.
        </p>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={event => setEmail(event.target.value)}
          onFocus={() => trackEvent("interest_form_started", { source_page: `/markets/${symbol.toLowerCase()}`, symbol })}
          placeholder="you@example.com"
          className="sw-input w-full"
        />
      </label>

      <label className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
        <input
          type="checkbox"
          checked={consentMarketing}
          onChange={event => setConsentMarketing(event.target.checked)}
          required
          className="mt-1"
        />
        Send me StockWin forecast updates and product emails.
      </label>

      {message && (
        <p className="flex items-center gap-2 rounded-[var(--radius-input)] border px-3 py-2 text-sm">
          <Check className="size-4 text-[var(--color-accent-2)]" />
          {message}
        </p>
      )}

      {error && (
        <p className="rounded-[var(--radius-input)] border border-[var(--color-negative)] px-3 py-2 text-sm text-[var(--color-negative)]">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="sw-button-primary w-full disabled:pointer-events-none disabled:opacity-50">
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        {loading ? "Submitting..." : "Get updates"}
      </button>
    </form>
  );
}
