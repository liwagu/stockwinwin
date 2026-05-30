"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Home, LogIn } from "lucide-react";

type ErrorInfo = {
    error: string;
    errorDescription: string;
};

export default function AuthCodeErrorPage() {
    const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const hash = window.location.hash.slice(1);
        const search = window.location.search.slice(1);
        const params = new URLSearchParams(hash || search);

        const error = params.get("error") || params.get("error_code") || "unknown_error";
        const errorDescription = params.get("error_description") || "An unexpected error occurred during sign-in.";

        setErrorInfo({
            error,
            errorDescription: decodeURIComponent(errorDescription),
        });
        setLoading(false);
    }, []);

    if (loading) {
        return (
            <main className="sw-shell flex min-h-screen items-center justify-center">
                <div className="size-8 animate-spin rounded-full border-2 border-[var(--color-rule)] border-b-[var(--color-ink)]" />
            </main>
        );
    }

    const getErrorMessage = (error: string) => {
        switch (error) {
            case "access_denied":
                return {
                    title: "Sign-in cancelled",
                    message: "The Google sign-in flow was cancelled. You can try again when you are ready.",
                };
            case "unauthorized_client":
                return {
                    title: "Configuration error",
                    message: "There is an issue with the OAuth configuration. Please contact support.",
                };
            case "invalid_request":
                return {
                    title: "Invalid request",
                    message: "The sign-in request was invalid. Please try again.",
                };
            case "server_error":
                return {
                    title: "Server error",
                    message: "The authentication provider returned a server error. Please try again later.",
                };
            default:
                return {
                    title: "Authentication error",
                    message: errorInfo?.errorDescription || "Something went wrong during sign-in. Please try again.",
                };
        }
    };

    const { title, message } = getErrorMessage(errorInfo?.error || "unknown_error");

    return (
        <main className="sw-shell flex min-h-screen items-center justify-center px-4 py-12">
            <section className="sw-card w-full max-w-md p-6 text-center sm:p-8">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-[var(--color-negative)] bg-[color-mix(in_oklch,var(--color-negative)_9%,transparent)]">
                    <AlertCircle className="size-6 text-[var(--color-negative)]" aria-hidden="true" />
                </div>

                <h1 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-[var(--color-ink)]">{title}</h1>
                <p className="mt-3 text-sm leading-6 text-[var(--color-ink-2)]">{message}</p>

                {process.env.NODE_ENV === "development" && errorInfo && (
                    <div className="mt-6 rounded-[var(--radius-input)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4 text-left">
                        <p className="mb-1 font-mono text-xs text-[var(--color-muted)]">Debug info</p>
                        <p className="font-mono text-xs text-[var(--color-ink-2)]">Error: {errorInfo.error}</p>
                        <p className="break-words font-mono text-xs text-[var(--color-ink-2)]">
                            Description: {errorInfo.errorDescription}
                        </p>
                    </div>
                )}

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <Link href="/login" className="sw-button-primary flex-1">
                        <LogIn className="size-4" aria-hidden="true" />
                        Try again
                    </Link>
                    <Link href="/" className="sw-button-secondary flex-1">
                        <Home className="size-4" aria-hidden="true" />
                        Go home
                    </Link>
                </div>

                <p className="mt-6 text-sm text-[var(--color-muted)]">
                    Need help?{" "}
                    <a href="mailto:support@stockwin.com" className="font-medium text-[var(--color-accent)] underline-offset-4 hover:underline">
                        Contact support
                    </a>
                </p>
            </section>
        </main>
    );
}
