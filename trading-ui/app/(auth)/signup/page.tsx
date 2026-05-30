"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Database, ShieldCheck } from "lucide-react";
import { GoogleMark } from "@/app/components/GoogleMark";
import { useAuth } from "@/app/providers/AuthProvider";
import { Checkbox } from "@/components/ui/checkbox";
import { trackEvent } from "@/lib/analytics";

export default function SignupPage() {
    const router = useRouter();
    const { user, loading, signInWithGoogle } = useAuth();
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [plan, setPlan] = useState<string | null>(null);
    const [planLoaded, setPlanLoaded] = useState(false);
    const postSignupPath = plan === "pro" ? "/dashboard/billing?intent=upgrade" : "/dashboard";

    useEffect(() => {
        setPlan(new URLSearchParams(window.location.search).get("plan"));
        setPlanLoaded(true);
    }, []);

    useEffect(() => {
        if (planLoaded && !loading && user) {
            router.replace(postSignupPath);
        }
    }, [loading, planLoaded, postSignupPath, router, user]);

    const handleGoogleSignUp = async () => {
        setAuthError(null);
        trackEvent("signup_started", {
            plan: plan === "pro" ? "professional" : "free",
            source_page: "/signup",
        });

        if (!acceptedTerms) {
            setAuthError("You must accept the terms to continue.");
            return;
        }

        try {
            const next = encodeURIComponent(postSignupPath);
            const redirectTo = `${window.location.origin}/auth/callback?next=${next}`;
            await signInWithGoogle({ redirectTo });
        } catch (error) {
            console.error("Failed to start Google signup", error);
            setAuthError("Unable to start Google sign-up. Please try again.");
        }
    };

    return (
        <main className="sw-shell">
            <nav className="sw-nav" aria-label="Primary">
                <Link href="/" className="sw-wordmark">
                    <span className="sw-logo-mark">S</span>
                    StockWin
                </Link>
                <div className="sw-nav-links">
                    <Link href="/login" className="sw-nav-link">Sign in</Link>
                    <Link href="/#pricing" className="sw-nav-link">Pricing</Link>
                </div>
            </nav>

            <section className="sw-container-wide grid min-h-[calc(100vh-6rem)] items-center gap-8 py-12 lg:grid-cols-[1fr_0.86fr]">
                <div className="space-y-8">
                    <div className="max-w-2xl">
                        <p className="sw-label">START A FORECAST DESK</p>
                        <h1 className="sw-display mt-4">A quieter surface for model-driven market checks.</h1>
                        <p className="sw-copy mt-5">
                            Create an account to inspect hourly forecasts, coverage status, and subscription access without overpromising certainty.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        {[
                            { label: "Forecasts", value: "24h", icon: Database },
                            { label: "Terms", value: "Clear", icon: ShieldCheck },
                            { label: "Access", value: "$15/mo", icon: Check },
                        ].map(item => (
                            <div key={item.label} className="sw-card p-4">
                                <item.icon className="mb-5 size-5 text-[var(--color-accent)]" aria-hidden="true" />
                                <p className="sw-label">{item.label}</p>
                                <p className="mt-2 font-mono text-xl font-semibold text-[var(--color-ink)]">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="sw-card p-6 sm:p-8">
                    <div className="space-y-3">
                        <p className="sw-label">ACCOUNT</p>
                        <h2 className="sw-heading">Create your account.</h2>
                        <p className="sw-copy">Google sign-in keeps the account surface small and easy to recover.</p>
                    </div>

                    <div className="mt-8 space-y-5">
                        <div className="flex items-start gap-3 text-sm leading-6 text-[var(--color-ink-2)]">
                            <Checkbox
                                id="terms"
                                checked={acceptedTerms}
                                onCheckedChange={checked => setAcceptedTerms(Boolean(checked))}
                                className="mt-1 border-[var(--color-rule-strong)] data-[state=checked]:border-[var(--color-ink)] data-[state=checked]:bg-[var(--color-ink)]"
                            />
                            <label htmlFor="terms">
                                I agree to the{" "}
                                <Link href="/terms" className="font-medium text-[var(--color-accent)] underline-offset-4 hover:underline">
                                    Terms of Service
                                </Link>{" "}
                                and{" "}
                                <Link href="/privacy" className="font-medium text-[var(--color-accent)] underline-offset-4 hover:underline">
                                    Privacy Policy
                                </Link>
                                .
                            </label>
                        </div>

                        {authError && (
                            <p className="rounded-[var(--radius-input)] border border-[var(--color-negative)] bg-[color-mix(in_oklch,var(--color-negative)_9%,transparent)] px-3 py-2 text-sm text-[var(--color-negative)]">
                                {authError}
                            </p>
                        )}

                        <button
                            type="button"
                            onClick={handleGoogleSignUp}
                            disabled={loading || !acceptedTerms}
                            className="sw-button-primary w-full disabled:pointer-events-none disabled:opacity-50"
                        >
                            <GoogleMark />
                            {loading ? "Creating account..." : "Continue with Google"}
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </button>

                        <p className="border-t border-[var(--color-rule)] pt-5 text-center text-sm text-[var(--color-ink-2)]">
                            Already have an account?{" "}
                            <Link href="/login" className="font-semibold text-[var(--color-ink)] underline-offset-4 hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}
