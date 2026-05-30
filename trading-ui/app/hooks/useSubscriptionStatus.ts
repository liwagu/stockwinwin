import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/app/providers/AuthProvider";

interface SubscriptionStatus {
  isPro: boolean;
  isPolling: boolean;
  error: string | null;
}

/**
 * Poll subscription status after successful Stripe checkout.
 *
 * Handles the delay between Stripe redirect and webhook updating the database.
 * Polls /api/users/me every 2 seconds for up to 30 seconds (15 attempts).
 * Automatically stops polling if user session becomes invalid.
 *
 * @param shouldPoll - Start polling when true
 * @returns Subscription status and polling state
 */
export function useSubscriptionStatus(shouldPoll: boolean): SubscriptionStatus {
  const { session } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attemptCountRef = useRef(0);
  const maxAttempts = 15; // 15 attempts × 2s = 30s total (increased for webhook delay)
  const pollInterval = 2000; // 2 seconds

  useEffect(() => {
    // Stop polling if no session (user signed out)
    if (!shouldPoll || !session) {
      return;
    }

    setIsPolling(true);
    attemptCountRef.current = 0;

    const pollStatus = async () => {
      // Double-check session is still valid before making request
      if (!session) {
        console.log("Subscription polling stopped: no valid session");
        return true; // Stop polling
      }

      try {
        const response = await fetch("/api/users/me", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          // If 401, session is invalid - stop polling
          if (response.status === 401) {
            console.log("Subscription polling stopped: session invalidated");
            return true; // Stop polling
          }
          throw new Error("Failed to fetch subscription status");
        }

        const data = await response.json();
        const tier = data.tier?.toLowerCase();

        if (tier === "professional") {
          // Success! User is now Pro
          setIsPro(true);
          setIsPolling(false);
          return true; // Stop polling
        }

        return false; // Continue polling
      } catch (err) {
        console.error("Subscription status poll error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        return false;
      }
    };

    const intervalId = setInterval(async () => {
      attemptCountRef.current += 1;

      const shouldStop = await pollStatus();

      if (shouldStop || attemptCountRef.current >= maxAttempts) {
        clearInterval(intervalId);
        setIsPolling(false);

        // If we hit max attempts without success, show error
        if (!shouldStop && attemptCountRef.current >= maxAttempts) {
          setError(
            "Upgrade is processing. Please refresh the page in a moment to see your Pro features."
          );
        }
      }
    }, pollInterval);

    // Initial check immediately
    void pollStatus().then((shouldStop) => {
      if (shouldStop) {
        clearInterval(intervalId);
        setIsPolling(false);
      }
    });

    return () => {
      clearInterval(intervalId);
      setIsPolling(false);
    };
  }, [shouldPoll, session]); // Re-run effect if session changes

  return { isPro, isPolling, error };
}
