import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardHeader from "./components/dashboard-header";
import { ThemeToggle } from "@/app/components/ThemeToggle";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

type UserProfile = {
    tier?: string;
    plan?: string;
};

type DashboardLayoutProps = {
    children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
    const supabase = await createClient();

    // SECURITY: Always use getUser() for server-side auth validation
    // getUser() validates the JWT with Supabase server, not just cookies
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        redirect("/login");
    }

    // Get session for access token (after validation)
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
        redirect("/login");
    }

    const displayName =
        (user.user_metadata?.full_name as string | undefined) ||
        user.user_metadata?.name ||
        user.email ||
        "Investor";

    let userTier: string | undefined;

    try {
        const response = await fetch(`${AI_SERVICE_URL}/v1/users/me`, {
            headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type": "application/json",
            },
            next: { revalidate: 0 },
        });

        if (response.ok) {
            const profile = (await response.json()) as UserProfile;
            userTier = profile.tier || profile.plan;
        }
    } catch (error) {
        console.error("Failed to fetch user profile from API", error);
    }

    return (
        <div className="sw-shell">
            <ThemeToggle />
            <DashboardHeader displayName={displayName} tier={userTier} />
            <main className="sw-container-wide py-8 md:py-12">{children}</main>
        </div>
    );
}
