"use client";

import { track } from "@vercel/analytics";

type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsProperties = Record<string, AnalyticsValue>;

export function trackEvent(name: string, properties: AnalyticsProperties = {}) {
  try {
    track(name, sanitizeProperties(properties));
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[analytics]", name, properties, error);
    }
  }
}

export function readAttributionParams() {
  if (typeof window === "undefined") {
    return {};
  }

  const params = new URLSearchParams(window.location.search);

  return {
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
    source_page: window.location.pathname,
    referrer: document.referrer || undefined,
  };
}

function sanitizeProperties(properties: AnalyticsProperties): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(properties).filter((entry): entry is [string, string | number | boolean] => {
      const value = entry[1];
      return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
    })
  );
}
