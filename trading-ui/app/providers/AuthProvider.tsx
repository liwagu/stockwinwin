"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session, User, AuthChangeEvent } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type AuthContextValue = {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signInWithGoogle: (options?: { redirectTo?: string }) => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUpWithEmail: (email: string, password: string, options?: { redirectTo?: string }) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const supabase = useMemo(() => getSupabaseBrowserClient(), []);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        const initialize = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!active) return;

            setSession(session);
            setLoading(false);
        };

        initialize();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_: AuthChangeEvent, newSession: Session | null) => {
            setSession(newSession);
            setLoading(false);
            router.refresh();
        });

        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, [router, supabase]);

    const contextValue = useMemo<AuthContextValue>(() => {
        const signInWithGoogle = async (options?: { redirectTo?: string }) => {
            const redirectTo = options?.redirectTo ?? `${window.location.origin}/auth/callback`;

            setLoading(true);

            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo,
                    queryParams: {
                        access_type: "offline",
                        prompt: "consent",
                    },
                },
            });

            if (error) {
                setLoading(false);
                throw error;
            }
        };

        const signInWithEmail = async (email: string, password: string) => {
            setLoading(true);

            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            setLoading(false);

            if (error) {
                return { error };
            }

            router.push("/dashboard");
            router.refresh();
            return { error: null };
        };

        const signUpWithEmail = async (
            email: string,
            password: string,
            options?: { redirectTo?: string }
        ) => {
            const redirectTo = options?.redirectTo ?? `${window.location.origin}/auth/callback`;

            setLoading(true);

            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: redirectTo,
                },
            });

            setLoading(false);

            if (error) {
                return { error };
            }

            return { error: null };
        };

        const signOut = async () => {
            try {
                setLoading(true);

                // Step 1: Call server route to clear HTTP-only cookies
                const response = await fetch("/auth/signout", { method: "POST" });

                if (!response.ok) {
                    console.error("Server-side signout failed:", response.status);
                    throw new Error("Failed to sign out from server");
                }

                // Step 2: Clear client-side state (localStorage, memory)
                // This triggers onAuthStateChange which calls router.refresh()
                await supabase.auth.signOut();

                // Step 3: Navigate to home page after complete sign out
                // Don't call router.refresh() here - onAuthStateChange handles it
                window.location.href = "/";
            } catch (error) {
                console.error("Sign out error:", error);
                // Even if there's an error, try to clean up client state
                await supabase.auth.signOut().catch(() => {});
                window.location.href = "/";
            } finally {
                setLoading(false);
            }
        };

        return {
            user: session?.user ?? null,
            session,
            loading,
            signInWithGoogle,
            signInWithEmail,
            signUpWithEmail,
            signOut,
        };
    }, [loading, router, session, supabase]);

    return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return context;
}
