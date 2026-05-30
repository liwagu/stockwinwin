export type PaperAgent = "macro" | "research" | "risk";
export type PaperSessionStatus = "open" | "allocated" | "resolved";
export type PaperAssetType = "stock" | "crypto" | "etf";
export type PaperSourceQuality = "market_data" | "prediction_cache" | "fallback" | "model_inference";

export interface PaperDeskAsset {
  symbol: string;
  display_name: string;
  asset_type: PaperAssetType;
  current_price: number;
  price_source: string;
}

export interface PaperDeskBrief {
  agent: PaperAgent;
  stance: string;
  thesis: string;
  confidence: number;
  evidence: string[];
  invalidation: string;
  source_quality: PaperSourceQuality;
  allocation_guardrails: string;
  generated_at: string;
}

export interface PaperDeskAllocation {
  id: string;
  session_id: string;
  anonymous_id: string;
  allocations: Record<string, number>;
  submitted_at: string;
}

export interface PaperDeskResult {
  id: string;
  allocation_id: string;
  session_id: string;
  returns: Record<string, number>;
  portfolio_return: number;
  benchmark_symbol: string;
  benchmark_return: number;
  alpha: number;
  drawdown: number;
  price_source: string;
  resolved_at: string;
}

export interface PaperDeskSession {
  session_id: string;
  trading_date: string;
  status: PaperSessionStatus;
  paper_only: boolean;
  disclaimer: string;
  starting_cash: number;
  benchmark_symbol: string;
  assets: PaperDeskAsset[];
  briefs: PaperDeskBrief[];
  allocation: PaperDeskAllocation | null;
  result: PaperDeskResult | null;
  generated_at: string;
}

export interface PaperDeskHistoryResponse {
  anonymous_id: string;
  sessions: PaperDeskSession[];
}

export interface PaperDeskAllocationPayload {
  session_id: string;
  anonymous_id: string;
  allocations: Record<string, number>;
}

export interface PaperDeskResolvePayload {
  session_id: string;
  anonymous_id: string;
}
