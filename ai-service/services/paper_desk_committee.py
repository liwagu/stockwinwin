"""
Deterministic Macro / Research / Risk committee for Paper Desk.
"""

from __future__ import annotations

from datetime import datetime, timezone
from statistics import mean
from typing import Dict, List

from models.paper_desk import PaperDeskAsset, PaperDeskBrief

PAPER_ASSET_DEFINITIONS = [
    {"symbol": "NVDA", "display_name": "NVIDIA", "asset_type": "stock"},
    {"symbol": "AMD", "display_name": "AMD", "asset_type": "stock"},
    {"symbol": "TSLA", "display_name": "Tesla", "asset_type": "stock"},
    {"symbol": "BTCUSDT", "display_name": "Bitcoin", "asset_type": "crypto"},
    {"symbol": "SPY", "display_name": "S&P 500 ETF", "asset_type": "etf"},
]

FALLBACK_PRICES = {
    "NVDA": 180.0,
    "AMD": 160.0,
    "TSLA": 350.0,
    "BTCUSDT": 105000.0,
    "SPY": 590.0,
}

FALLBACK_RETURNS = {
    "NVDA": 0.018,
    "AMD": 0.012,
    "TSLA": -0.006,
    "BTCUSDT": 0.010,
    "SPY": 0.004,
}


def build_assets() -> List[PaperDeskAsset]:
    assets: List[PaperDeskAsset] = []
    for definition in PAPER_ASSET_DEFINITIONS:
        symbol = definition["symbol"]
        price_source = "market_data"
        try:
            if definition["asset_type"] == "crypto":
                from crypto_data import get_current_price as get_crypto_current_price

                price = get_crypto_current_price(symbol)
            else:
                from stock_data import get_current_price as get_stock_current_price

                price = get_stock_current_price(symbol)
        except Exception:
            price = FALLBACK_PRICES[symbol]
            price_source = "fallback"

        assets.append(
            PaperDeskAsset(
                symbol=symbol,
                display_name=definition["display_name"],
                asset_type=definition["asset_type"],  # type: ignore[arg-type]
                current_price=round(float(price), 4),
                price_source=price_source,
            )
        )

    return assets


def build_committee_briefs(assets: List[PaperDeskAsset]) -> List[PaperDeskBrief]:
    now = datetime.now(timezone.utc)
    edges = _prediction_edges()
    growth_edges = [value for symbol, value in edges.items() if symbol != "SPY"]
    average_growth_edge = mean(growth_edges) if growth_edges else 0.0
    has_market_data = all(asset.price_source != "fallback" for asset in assets)

    return [
        PaperDeskBrief(
            agent="macro",
            stance="Risk-on but benchmark-aware" if average_growth_edge >= 0 else "Defensive until leadership broadens",
            thesis="The desk should treat SPY as the hurdle rate and avoid confusing one hot theme with a durable market regime.",
            confidence=0.72 if has_market_data else 0.58,
            evidence=[
                "SPY is the explicit benchmark for this paper session.",
                "The universe mixes semiconductor, EV, Bitcoin, and broad-market exposure.",
            ],
            invalidation="If SPY leads while growth-beta assets lag, the desk should reduce thematic exposure.",
            source_quality="market_data" if has_market_data else "fallback",
            allocation_guardrails="Keep a benchmark sleeve unless the thesis explicitly needs concentrated beta.",
            generated_at=now,
        ),
        PaperDeskBrief(
            agent="research",
            stance="Test AI infrastructure leadership" if average_growth_edge >= 0 else "Demand proof before adding beta",
            thesis="The research question is whether AI infrastructure exposure can beat SPY on a paper basis after risk is counted.",
            confidence=min(0.82, max(0.55, 0.64 + abs(average_growth_edge) * 4)),
            evidence=_research_evidence(edges),
            invalidation="If forecast direction or realized returns diverge from the AI capex thesis, log the miss rather than average down.",
            source_quality="prediction_cache" if edges else "fallback",
            allocation_guardrails="Size the highest-conviction idea, but every position must be explainable in one sentence.",
            generated_at=now,
        ),
        PaperDeskBrief(
            agent="risk",
            stance="Controlled paper risk",
            thesis="The biggest risk is concentration disguised as conviction; paper trading is useful only if drawdown is scored honestly.",
            confidence=0.76,
            evidence=[
                "Semiconductor and crypto assets can be correlated in risk-on regimes.",
                "The scoring loop includes alpha and drawdown, not only headline PnL.",
            ],
            invalidation="If one asset drives more than half the expected outcome, this is a concentration bet rather than a diversified desk.",
            source_quality="model_inference",
            allocation_guardrails="Default workflow should keep each non-SPY asset at or below 40%.",
            generated_at=now,
        ),
    ]


def build_realized_returns() -> tuple[Dict[str, float], str]:
    edges = _prediction_edges()
    returns: Dict[str, float] = {}
    used_fallback = False

    for definition in PAPER_ASSET_DEFINITIONS:
        symbol = definition["symbol"]
        if symbol in edges:
            returns[symbol] = round(edges[symbol], 6)
        else:
            returns[symbol] = FALLBACK_RETURNS[symbol]
            used_fallback = True

    return returns, "fallback" if used_fallback else "prediction_cache"


def _prediction_edges() -> Dict[str, float]:
    edges: Dict[str, float] = {}
    for symbol in ("NVDA", "AMD", "TSLA", "SPY"):
        try:
            from stock_prediction_engine import get_cached_prediction as get_cached_stock_prediction

            edge = _prediction_edge(get_cached_stock_prediction(symbol))
        except Exception:
            edge = None
        if edge is not None:
            edges[symbol] = edge

    try:
        from crypto_prediction_engine import get_cached_prediction as get_cached_crypto_prediction

        edge = _prediction_edge(get_cached_crypto_prediction("BTCUSDT"))
    except Exception:
        edge = None
    if edge is not None:
        edges["BTCUSDT"] = edge

    return edges


def _prediction_edge(prediction) -> float | None:
    if not prediction or not getattr(prediction, "predictions", None):
        return None
    try:
        current_price = float(prediction.current_price)
        final_price = float(prediction.predictions[-1].predicted_price)
        if current_price <= 0:
            return None
        return (final_price - current_price) / current_price
    except Exception:
        return None


def _research_evidence(edges: Dict[str, float]) -> List[str]:
    if not edges:
        return [
            "Prediction cache unavailable; deterministic fallback thesis is in use.",
            "Fallback thesis uses the fixed Paper Desk AI infrastructure universe.",
        ]

    strongest = sorted(edges.items(), key=lambda item: item[1], reverse=True)[:2]
    return [f"{symbol} cached 24h forecast edge: {edge * 100:.2f}%" for symbol, edge in strongest]
