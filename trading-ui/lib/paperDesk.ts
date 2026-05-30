import type {
  PaperDeskAllocationPayload,
  PaperDeskHistoryResponse,
  PaperDeskResolvePayload,
  PaperDeskSession,
} from "@/types/paper-desk";

async function requestPaperDesk<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data?.detail === "string"
        ? data.detail
        : typeof data?.message === "string"
          ? data.message
          : "Paper Desk is unavailable.";
    throw new Error(message);
  }

  return data as T;
}

export function getPaperDeskSession(anonymousId: string) {
  const params = new URLSearchParams({ anonymous_id: anonymousId });
  return requestPaperDesk<PaperDeskSession>(`/api/paper-desk/session/today?${params.toString()}`);
}

export function submitPaperDeskAllocation(payload: PaperDeskAllocationPayload) {
  return requestPaperDesk<PaperDeskSession>("/api/paper-desk/allocation", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resolvePaperDeskSession(payload: PaperDeskResolvePayload) {
  return requestPaperDesk<PaperDeskSession>("/api/paper-desk/resolve", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getPaperDeskHistory(anonymousId: string) {
  const params = new URLSearchParams({ anonymous_id: anonymousId });
  return requestPaperDesk<PaperDeskHistoryResponse>(`/api/paper-desk/history?${params.toString()}`);
}
