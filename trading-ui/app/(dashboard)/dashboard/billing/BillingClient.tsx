"use client";

import { useState } from "react";
import { AlertCircle, Check, CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

type UserProfile = {
  tier?: string;
  status?: string;
  email?: string;
  current_period_end?: string;
};

type BillingClientProps = {
  profile: UserProfile | null;
};

const proFeatures = [
  "All available forecast desks",
  "Search and track 20+ listed assets",
  "Confidence bands for every projection",
  "Early access to watchlist and risk tooling",
  "Stripe-hosted subscription management",
];

export function BillingClient({ profile }: BillingClientProps) {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    setError(null);
    trackEvent("checkout_started", {
      plan: "professional",
      source_page: "/dashboard/billing",
      value: 15,
    });

    try {
      const response = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400 && errorData.error?.includes("already has")) {
          throw new Error("You already have an active subscription. Please refresh the page.");
        }
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      trackEvent("checkout_failed", {
        plan: "professional",
        source_page: "/dashboard/billing",
      });
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/subscriptions/manage-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to open subscription management");
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPortalLoading(false);
    }
  };

  const isPro = (profile?.tier === "professional" || profile?.tier === "pro") && profile?.status === "active";
  const periodEndLabel = profile?.current_period_end
    ? new Date(profile.current_period_end).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not available";

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="sw-card p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="sw-label">BILLING</p>
            <h1 className="sw-heading mt-3">Subscription and access.</h1>
            <p className="sw-copy mt-4">
              StockWin keeps billing simple: one free tier, one professional tier, and Stripe for payment control.
            </p>
          </div>
          <div className="sw-panel min-w-[14rem] p-4">
            <p className="sw-label">CURRENT STATUS</p>
            <p className="mt-2 font-mono text-2xl font-semibold text-[var(--color-ink)]">
              {isPro ? "PRO" : "FREE"}
            </p>
          </div>
        </div>
      </section>

      {isPro ? (
        <section className="sw-card p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-rule)] px-3 py-1 text-sm text-[var(--color-ink)]">
                <Check className="size-4 text-[var(--color-accent-2)]" aria-hidden="true" />
                Active Professional Subscription
              </div>
              <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[var(--color-ink)]">
                Full forecast access is enabled.
              </h2>
              <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                <div className="sw-panel p-4">
                  <dt className="sw-label">EMAIL</dt>
                  <dd className="mt-2 break-words text-[var(--color-ink)]">{profile?.email || "Not available"}</dd>
                </div>
                <div className="sw-panel p-4">
                  <dt className="sw-label">PERIOD END</dt>
                  <dd className="mt-2 text-[var(--color-ink)]">{periodEndLabel}</dd>
                </div>
              </dl>
            </div>

            <button
              type="button"
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="sw-button-primary w-full lg:w-auto disabled:pointer-events-none disabled:opacity-50"
            >
              {portalLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <CreditCard className="size-4" aria-hidden="true" />}
              {portalLoading ? "Opening portal..." : "Manage subscription"}
            </button>
          </div>
        </section>
      ) : (
        <section className="grid gap-6 lg:grid-cols-[0.92fr_1fr]">
          <div className="sw-card p-6 sm:p-8">
            <p className="sw-label">FREE ACCESS</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--color-ink)]">Keep monitoring the public desk.</h2>
            <p className="mt-4 text-sm leading-6 text-[var(--color-ink-2)]">
              The free tier is useful for checking whether the model stack is online and sampling core forecast output.
            </p>
            <div className="mt-8 grid gap-3">
              {["Limited asset coverage", "Hourly forecast sync", "Basic chart inspection"].map(item => (
                <div key={item} className="flex items-center gap-3 text-sm text-[var(--color-ink-2)]">
                  <Check className="size-4 text-[var(--color-accent-2)]" aria-hidden="true" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="sw-card p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="sw-label">PROFESSIONAL</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--color-ink)]">Full workbench access.</h2>
              </div>
              <div className="font-mono text-4xl font-semibold tracking-[-0.05em] text-[var(--color-ink)]">
                $15<span className="text-base font-normal tracking-normal text-[var(--color-muted)]">/mo</span>
              </div>
            </div>

            <ul className="mt-7 space-y-3">
              {proFeatures.map(feature => (
                <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-[var(--color-ink-2)]">
                  <Check className="mt-1 size-4 shrink-0 text-[var(--color-accent-2)]" aria-hidden="true" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {error && (
              <div className="mt-6 flex gap-3 rounded-[var(--radius-input)] border border-[var(--color-negative)] bg-[color-mix(in_oklch,var(--color-negative)_9%,transparent)] p-3 text-sm text-[var(--color-negative)]">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleUpgrade}
              disabled={checkoutLoading}
              className="sw-button-primary mt-7 w-full disabled:pointer-events-none disabled:opacity-50"
            >
              {checkoutLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="size-4" aria-hidden="true" />}
              {checkoutLoading ? "Redirecting to Stripe..." : "Upgrade with Stripe"}
            </button>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--color-muted)]">
              <Lock className="size-3" aria-hidden="true" />
              <span>Secure checkout</span>
              <span aria-hidden="true">/</span>
              <span>Cancel anytime</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
