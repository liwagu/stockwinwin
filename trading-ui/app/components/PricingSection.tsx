"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

type PricingPlan = {
  name: string;
  description: string;
  price: string;
  period: string;
  features: string[];
  ctaText: string;
  ctaHref: string;
  highlighted?: boolean;
};

const plans: PricingPlan[] = [
  {
    name: "Free",
    description: "For checking the public forecast desk.",
    price: "$0",
    period: "",
    features: [
      "Public 20-symbol forecast board",
      "24-hour curves with confidence bands",
      "Hourly refresh when the backend is online",
      "No card required",
    ],
    ctaText: "Start free",
    ctaHref: "/signup",
  },
  {
    name: "Professional",
    description: "For a larger watchlist and early product access.",
    price: "$15",
    period: "/mo",
    features: [
      "Everything in Free",
      "Private dashboard access",
      "Search across the crypto and equity universe",
      "Stripe-managed subscription",
      "Early access to risk and audit tools",
    ],
    ctaText: "Upgrade",
    ctaHref: "/signup?plan=pro",
    highlighted: true,
  },
];

export function PricingSection() {
  const router = useRouter();

  useEffect(() => {
    trackEvent("pricing_viewed", { source_page: "/" });
  }, []);

  return (
    <section id="pricing" className="sw-container py-20">
      <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
        <div className="space-y-4">
          <p className="sw-label">Pricing</p>
          <h2 className="sw-heading">Simple access for the forecast desk.</h2>
          <p className="sw-copy">
            Start with public forecasts, then unlock the larger asset universe and early professional tooling.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {plans.map(plan => (
            <article key={plan.name} className={`sw-card p-6 ${plan.highlighted ? "border-foreground" : ""}`}>
              <div className="flex min-h-full flex-col gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold tracking-[-0.03em]">{plan.name}</h3>
                    {plan.highlighted && <span className="sw-label">Paid</span>}
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{plan.description}</p>
                </div>

                <div className="flex items-end gap-2">
                  <span className="font-mono text-4xl font-semibold tracking-[-0.06em]">{plan.price}</span>
                  {plan.period && <span className="pb-1 text-sm text-muted-foreground">{plan.period}</span>}
                </div>

                <ul className="space-y-3 text-sm text-muted-foreground">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => {
                    trackEvent("pricing_cta_clicked", {
                      plan: plan.name.toLowerCase(),
                      source_page: "/",
                    });
                    router.push(plan.ctaHref);
                  }}
                  className={plan.highlighted ? "sw-button-primary mt-auto" : "sw-button-secondary mt-auto"}
                >
                  {plan.ctaText}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
