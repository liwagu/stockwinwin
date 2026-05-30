from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from models.paper_desk import (
    PaperDeskAllocationRequest,
    PaperDeskAsset,
    PaperDeskBrief,
    PaperDeskResolveRequest,
)
from repositories.paper_desk import PaperDeskRepository
from services.paper_desk_service import PaperDeskService


def _assets():
    return [
        PaperDeskAsset(
            symbol="NVDA",
            display_name="NVIDIA",
            asset_type="stock",
            current_price=180.0,
            price_source="fallback",
        ),
        PaperDeskAsset(
            symbol="AMD",
            display_name="AMD",
            asset_type="stock",
            current_price=160.0,
            price_source="fallback",
        ),
        PaperDeskAsset(
            symbol="TSLA",
            display_name="Tesla",
            asset_type="stock",
            current_price=350.0,
            price_source="fallback",
        ),
        PaperDeskAsset(
            symbol="BTCUSDT",
            display_name="Bitcoin",
            asset_type="crypto",
            current_price=105000.0,
            price_source="fallback",
        ),
        PaperDeskAsset(
            symbol="SPY",
            display_name="S&P 500 ETF",
            asset_type="etf",
            current_price=590.0,
            price_source="fallback",
        ),
    ]


def _briefs(_assets):
    now = datetime.now(timezone.utc)
    return [
        PaperDeskBrief(
            agent="macro",
            stance="Risk-on but benchmark-aware",
            thesis="SPY is the hurdle rate.",
            confidence=0.6,
            evidence=["Fallback market data is labeled."],
            invalidation="SPY leads while growth lags.",
            source_quality="fallback",
            allocation_guardrails="Keep a benchmark sleeve.",
            generated_at=now,
        ),
        PaperDeskBrief(
            agent="research",
            stance="Test AI infrastructure leadership",
            thesis="AI infrastructure exposure should be tested on paper.",
            confidence=0.64,
            evidence=["No cached prediction required for this unit test."],
            invalidation="The thesis fails if realized returns diverge.",
            source_quality="fallback",
            allocation_guardrails="Every position needs a one-sentence reason.",
            generated_at=now,
        ),
        PaperDeskBrief(
            agent="risk",
            stance="Controlled paper risk",
            thesis="Concentration is the primary risk.",
            confidence=0.76,
            evidence=["Drawdown is scored."],
            invalidation="One asset drives more than half the outcome.",
            source_quality="model_inference",
            allocation_guardrails="Keep each non-SPY asset at or below 40%.",
            generated_at=now,
        ),
    ]


@pytest.fixture
def service(monkeypatch):
    import services.paper_desk_service as service_module

    monkeypatch.setattr(service_module, "build_assets", _assets)
    monkeypatch.setattr(service_module, "build_committee_briefs", _briefs)
    monkeypatch.setattr(
        service_module,
        "build_realized_returns",
        lambda: (
            {"NVDA": 0.02, "AMD": 0.01, "TSLA": -0.01, "BTCUSDT": 0.015, "SPY": 0.004},
            "fallback",
        ),
    )
    return PaperDeskService(PaperDeskRepository())


def test_allocation_total_must_equal_100():
    with pytest.raises(ValidationError):
        PaperDeskAllocationRequest(
            session_id="paper-2026-05-30",
            anonymous_id="anonymous-test-user",
            allocations={"SPY": 99.0},
        )


def test_duplicate_allocation_is_deterministic(service):
    session = service.get_today_session("anonymous-test-user")
    request = PaperDeskAllocationRequest(
        session_id=session.session_id,
        anonymous_id="anonymous-test-user",
        allocations={"NVDA": 20.0, "AMD": 10.0, "TSLA": 10.0, "BTCUSDT": 10.0, "SPY": 50.0},
    )

    first = service.submit_allocation(request).allocation
    second = service.submit_allocation(request).allocation

    assert first is not None
    assert second is not None
    assert second.id == first.id
    assert second.submitted_at == first.submitted_at
    assert second.allocations == request.allocations


def test_resolve_is_idempotent_and_labels_fallback(service):
    session = service.get_today_session("anonymous-test-user")
    service.submit_allocation(
        PaperDeskAllocationRequest(
            session_id=session.session_id,
            anonymous_id="anonymous-test-user",
            allocations={"NVDA": 25.0, "AMD": 15.0, "TSLA": 10.0, "BTCUSDT": 10.0, "SPY": 40.0},
        )
    )

    request = PaperDeskResolveRequest(
        session_id=session.session_id,
        anonymous_id="anonymous-test-user",
    )
    first = service.resolve_session(request).result
    second = service.resolve_session(request).result

    assert first is not None
    assert second is not None
    assert second.id == first.id
    assert second.resolved_at == first.resolved_at
    assert first.price_source == "fallback"
    assert first.benchmark_symbol == "SPY"
    assert first.portfolio_return == 0.0086
    assert first.benchmark_return == 0.004
    assert first.alpha == 0.0046
    assert first.drawdown == 0


def test_history_returns_submitted_session(service):
    session = service.get_today_session("anonymous-test-user")
    service.submit_allocation(
        PaperDeskAllocationRequest(
            session_id=session.session_id,
            anonymous_id="anonymous-test-user",
            allocations={"NVDA": 20.0, "AMD": 20.0, "TSLA": 0.0, "BTCUSDT": 10.0, "SPY": 50.0},
        )
    )

    history = service.get_history("anonymous-test-user")

    assert history.anonymous_id == "anonymous-test-user"
    assert len(history.sessions) == 1
    assert history.sessions[0].status == "allocated"
