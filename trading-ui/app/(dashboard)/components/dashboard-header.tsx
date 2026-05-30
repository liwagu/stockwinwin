"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import { useState } from "react";

type DashboardHeaderProps = {
    displayName: string;
    tier?: string;
};

const navItems = [
    { label: "Markets", href: "/dashboard" },
    { label: "Paper", href: "/paper" },
    { label: "Billing", href: "/dashboard/billing" },
    { label: "Watchlist", href: "/dashboard/watchlist" },
];

export default function DashboardHeader({ displayName, tier }: DashboardHeaderProps) {
    const pathname = usePathname();
    const [loading, setLoading] = useState(false);

    const handleSignOut = async () => {
        try {
            setLoading(true);
            // Use server-side signout to ensure proper cookie clearing
            await fetch("/auth/signout", { method: "POST" });
            // Redirect to home page (not login) after successful signout
            window.location.href = "/";
        } catch (error) {
            console.error("Failed to sign out", error);
            setLoading(false);
        }
    };

    return (
        <header className="sticky top-0 z-40 border-b border-[var(--color-rule)] bg-[color-mix(in_oklch,var(--color-paper)_88%,transparent)] backdrop-blur-xl">
            <div className="sw-container-wide py-4">
                <div className="sw-card flex flex-col gap-4 p-3 md:flex-row md:items-center md:justify-between">
                    <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
                        <span className="sw-logo-mark size-9">S</span>
                        <span className="min-w-0">
                            <span className="sw-label block">STOCKWIN DESK</span>
                            <span className="block truncate text-lg font-semibold tracking-[-0.03em] text-[var(--color-ink)] md:text-xl">
                                Market Forecasting Workbench
                            </span>
                        </span>
                    </Link>

                    <div className="flex flex-col gap-3 md:items-end">
                        <div className="flex items-center gap-3 text-sm text-[var(--color-ink-2)]">
                            <span className="inline-flex size-8 items-center justify-center rounded-full border border-[var(--color-rule)] bg-[var(--color-elevated)]">
                                <UserRound className="size-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0">
                                <span className="sw-label block">OPERATOR</span>
                                <span className="block max-w-[15rem] truncate font-semibold text-[var(--color-ink)]">{displayName}</span>
                            </span>
                            <span className="rounded-full border border-[var(--color-rule)] px-3 py-1 font-mono text-xs text-[var(--color-muted)]">
                                {(tier || "free").toUpperCase()}
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 md:justify-end">
                            <nav className="flex flex-wrap gap-1 text-sm" aria-label="Dashboard">
                                {navItems.map(item => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`rounded-full px-3 py-2 font-medium transition ${
                                                isActive
                                                    ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                                                    : "text-[var(--color-ink-2)] hover:bg-[var(--color-paper-2)] hover:text-[var(--color-ink)]"
                                            }`}
                                        >
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </nav>

                            <button
                                type="button"
                                className="sw-button-secondary min-h-9 px-3 text-xs"
                                onClick={handleSignOut}
                                disabled={loading}
                            >
                                <LogOut className="size-4" aria-hidden="true" />
                                {loading ? "Signing out" : "Sign out"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
