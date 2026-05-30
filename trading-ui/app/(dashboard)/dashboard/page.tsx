import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./DashboardClient";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

type UserProfile = {
    tier?: string;
    plan?: string;
    email?: string;
};

type PredictionForecast = {
    predictions: Array<{
        symbol: string;
        display_name: string;
        current_price: number;
        forecast_timestamp: string;
        prediction_horizon_hours: number;
        predictions: Array<{
            hour_offset: number;
            timestamp: string;
            predicted_price: number;
            confidence_lower: number;
            confidence_upper: number;
        }>;
        historical_data: Array<{
            timestamp: string;
            price: number;
        }>;
        model_version: string;
        confidence_score: number;
    }>;
    generated_at: string;
};

type DashboardSearchParams = { [key: string]: string | string[] | undefined };

/**
 * Fetch user profile from backend API using Supabase access token
 */
async function fetchUserProfile(accessToken: string): Promise<UserProfile | null> {
    try {
        const res = await fetch(`${AI_SERVICE_URL}/v1/users/me`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            cache: 'no-store',  // Always fetch fresh data
        });

        if (!res.ok) {
            console.error(`Failed to fetch user profile: ${res.status}`);
            return null;
        }

        return await res.json();
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
}

/**
 * Fetch predictions from backend API
 */
async function fetchPredictions(): Promise<PredictionForecast | null> {
    try {
        const res = await fetch(`${AI_SERVICE_URL}/v1/predictions`, {
            cache: 'no-store',  // Always fetch fresh data
        });

        if (!res.ok) {
            console.error(`Failed to fetch predictions: ${res.status} ${res.statusText}`);
            return null;
        }

        return res.json();
    } catch (error) {
        console.error("Error fetching predictions:", error);
        return null;
    }
}

/**
 * Dashboard page - Server Component with data fetching
 *
 * This page fetches user profile and predictions server-side using Supabase auth,
 * then passes the data to the DashboardClient component for rendering and interactivity.
 */
export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<DashboardSearchParams>;
}) {
    const resolvedSearchParams = await searchParams;

    // Step 1: Create Supabase client (reads from HTTP cookies)
    const supabase = await createClient();

    // Step 2: Verify user authentication
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        redirect('/login');
    }

    // Step 3: Get access token for backend API calls
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
        redirect('/login');
    }

    // Step 4: Fetch user profile from backend
    const profile = await fetchUserProfile(session.access_token);

    // Step 5: Fetch predictions from backend
    const predictions = await fetchPredictions();

    // Step 6: Pass data to Client Component for rendering
    return (
        <DashboardClient
            user={user}
            profile={profile}
            initialPredictions={predictions}
            searchParams={resolvedSearchParams}
        />
    );
}
