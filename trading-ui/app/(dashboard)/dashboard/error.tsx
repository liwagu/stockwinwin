"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, Home, RefreshCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center p-4">
      <section className="sw-card w-full max-w-md p-6 text-center sm:p-8">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-[var(--color-negative)] bg-[color-mix(in_oklch,var(--color-negative)_9%,transparent)]">
          <AlertCircle className="size-6 text-[var(--color-negative)]" aria-hidden="true" />
        </div>

        <h1 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-[var(--color-ink)]">Dashboard failed to load</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-ink-2)]">
          The error has been logged. Try reloading the dashboard, or return to the main desk.
        </p>

        {process.env.NODE_ENV === "development" && error.message && (
          <div className="mt-6 rounded-[var(--radius-input)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4 text-left">
            <p className="break-words font-mono text-xs text-[var(--color-negative)]">{error.message}</p>
            {error.digest && <p className="mt-2 text-xs text-[var(--color-muted)]">Error ID: {error.digest}</p>}
          </div>
        )}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="sw-button-primary flex-1">
            <RefreshCcw className="size-4" aria-hidden="true" />
            Try again
          </button>
          <Link href="/dashboard" className="sw-button-secondary flex-1">
            <Home className="size-4" aria-hidden="true" />
            Go home
          </Link>
        </div>
      </section>
    </div>
  );
}
