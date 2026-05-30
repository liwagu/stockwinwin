"""
Pydantic models for the Paper Desk paper-validation loop.
"""

from datetime import datetime
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

PaperAgent = Literal["macro", "research", "risk"]
PaperSessionStatus = Literal["open", "allocated", "resolved"]
PaperAssetType = Literal["stock", "crypto", "etf"]

SUPPORTED_PAPER_SYMBOLS = {"NVDA", "AMD", "TSLA", "BTCUSDT", "SPY"}


class PaperDeskAsset(BaseModel):
    symbol: str
    display_name: str
    asset_type: PaperAssetType
    current_price: float = Field(..., gt=0)
    price_source: str


class PaperDeskBrief(BaseModel):
    agent: PaperAgent
    stance: str
    thesis: str
    confidence: float = Field(..., ge=0, le=1)
    evidence: List[str] = Field(default_factory=list)
    invalidation: str
    source_quality: Literal["market_data", "prediction_cache", "fallback", "model_inference"]
    allocation_guardrails: str
    generated_at: datetime


class PaperDeskAllocationRequest(BaseModel):
    session_id: str
    anonymous_id: str = Field(..., min_length=8, max_length=128)
    allocations: Dict[str, float]

    @field_validator("allocations")
    @classmethod
    def validate_allocations(cls, allocations: Dict[str, float]) -> Dict[str, float]:
        normalized = {symbol.upper(): float(weight) for symbol, weight in allocations.items()}
        if not normalized:
            raise ValueError("At least one allocation is required")

        unsupported = sorted(set(normalized) - SUPPORTED_PAPER_SYMBOLS)
        if unsupported:
            raise ValueError(f"Unsupported paper symbols: {', '.join(unsupported)}")

        for symbol, weight in normalized.items():
            if weight < 0 or weight > 100:
                raise ValueError(f"Allocation for {symbol} must be between 0 and 100")

        total = sum(normalized.values())
        if abs(total - 100.0) > 0.01:
            raise ValueError(f"Allocations must total 100, got {total:.2f}")

        return normalized


class PaperDeskResolveRequest(BaseModel):
    session_id: str
    anonymous_id: str = Field(..., min_length=8, max_length=128)


class PaperDeskAllocation(BaseModel):
    id: str
    session_id: str
    anonymous_id: str
    allocations: Dict[str, float]
    submitted_at: datetime


class PaperDeskResult(BaseModel):
    id: str
    allocation_id: str
    session_id: str
    returns: Dict[str, float]
    portfolio_return: float
    benchmark_symbol: str
    benchmark_return: float
    alpha: float
    drawdown: float
    price_source: str
    resolved_at: datetime


class PaperDeskSession(BaseModel):
    session_id: str
    trading_date: str
    status: PaperSessionStatus
    paper_only: bool = True
    disclaimer: str = "Paper-only research workflow. No real-money orders are placed."
    starting_cash: int = 100000
    benchmark_symbol: str = "SPY"
    assets: List[PaperDeskAsset]
    briefs: List[PaperDeskBrief]
    allocation: Optional[PaperDeskAllocation] = None
    result: Optional[PaperDeskResult] = None
    generated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaperDeskHistoryResponse(BaseModel):
    anonymous_id: str
    sessions: List[PaperDeskSession]
