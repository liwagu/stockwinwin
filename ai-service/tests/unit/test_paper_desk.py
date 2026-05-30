import json
import sys
import types
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


# ---------------------------------------------------------------------------
# Optional LLM adapter
# ---------------------------------------------------------------------------


def _clear_llm_env(monkeypatch):
    for name in (
        "PAPER_DESK_AGENT_MODE",
        "PAPER_DESK_LLM_BASE_URL",
        "PAPER_DESK_LLM_API_KEY",
        "PAPER_DESK_LLM_MODEL",
    ):
        monkeypatch.delenv(name, raising=False)


def _valid_llm_payload():
    def _section(stance):
        return {
            "stance": stance,
            "thesis": "Paper-only thesis authored by the model.",
            "confidence": 0.7,
            "evidence": ["Model-generated evidence point."],
            "invalidation": "Fails if realized returns diverge from the thesis.",
            "allocation_guardrails": "Keep each non-SPY asset at or below 40%.",
        }

    return {
        "macro": _section("Risk-on but benchmark-aware"),
        "research": _section("Test AI infrastructure leadership"),
        "risk": _section("Controlled paper risk"),
    }


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class _FakeClient:
    """Minimal stand-in for httpx.Client used as a context manager."""

    def __init__(self, response=None, error=None):
        self._response = response
        self._error = error
        self.last_headers = None

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def post(self, url, headers=None, json=None):
        self.last_headers = headers
        if self._error is not None:
            raise self._error
        return self._response


def _anthropic_response(payload_dict):
    return _FakeResponse(
        {"content": [{"type": "text", "text": json.dumps(payload_dict)}]}
    )


def test_llm_adapter_disabled_by_default(monkeypatch):
    import services.paper_desk_llm as llm_module

    _clear_llm_env(monkeypatch)

    def _no_http(*args, **kwargs):  # pragma: no cover - must never run
        raise AssertionError("HTTP must not be called in deterministic mode")

    monkeypatch.setattr(llm_module.httpx, "Client", _no_http)

    assert llm_module.generate_llm_briefs(_assets()) is None


def test_llm_mode_missing_credentials_falls_back(monkeypatch):
    import services.paper_desk_llm as llm_module

    _clear_llm_env(monkeypatch)
    monkeypatch.setenv("PAPER_DESK_AGENT_MODE", "llm")
    # No base URL / API key configured.

    def _no_http(*args, **kwargs):  # pragma: no cover - must never run
        raise AssertionError("HTTP must not be called without credentials")

    monkeypatch.setattr(llm_module.httpx, "Client", _no_http)

    assert llm_module.generate_llm_briefs(_assets()) is None


def test_llm_mode_valid_response(monkeypatch):
    import services.paper_desk_llm as llm_module

    _clear_llm_env(monkeypatch)
    monkeypatch.setenv("PAPER_DESK_AGENT_MODE", "llm")
    monkeypatch.setenv("PAPER_DESK_LLM_BASE_URL", "https://example.test")
    monkeypatch.setenv("PAPER_DESK_LLM_API_KEY", "secret-key-value")

    fake_client = _FakeClient(response=_anthropic_response(_valid_llm_payload()))
    monkeypatch.setattr(llm_module.httpx, "Client", lambda *a, **k: fake_client)

    briefs = llm_module.generate_llm_briefs(_assets())

    assert briefs is not None
    assert [b.agent for b in briefs] == ["macro", "research", "risk"]
    assert all(b.source_quality == "model_inference" for b in briefs)
    # API key is forwarded for auth but never the model name default.
    assert fake_client.last_headers["x-api-key"] == "secret-key-value"


def test_llm_mode_http_error_falls_back(monkeypatch):
    import services.paper_desk_llm as llm_module

    _clear_llm_env(monkeypatch)
    monkeypatch.setenv("PAPER_DESK_AGENT_MODE", "llm")
    monkeypatch.setenv("PAPER_DESK_LLM_BASE_URL", "https://example.test")
    monkeypatch.setenv("PAPER_DESK_LLM_API_KEY", "secret-key-value")

    fake_client = _FakeClient(error=RuntimeError("boom"))
    monkeypatch.setattr(llm_module.httpx, "Client", lambda *a, **k: fake_client)

    assert llm_module.generate_llm_briefs(_assets()) is None


def test_llm_mode_malformed_json_falls_back(monkeypatch):
    import services.paper_desk_llm as llm_module

    _clear_llm_env(monkeypatch)
    monkeypatch.setenv("PAPER_DESK_AGENT_MODE", "llm")
    monkeypatch.setenv("PAPER_DESK_LLM_BASE_URL", "https://example.test")
    monkeypatch.setenv("PAPER_DESK_LLM_API_KEY", "secret-key-value")

    bad_response = _FakeResponse({"content": [{"type": "text", "text": "not json {{"}]})
    fake_client = _FakeClient(response=bad_response)
    monkeypatch.setattr(llm_module.httpx, "Client", lambda *a, **k: fake_client)

    assert llm_module.generate_llm_briefs(_assets()) is None


def test_llm_mode_incomplete_agents_falls_back(monkeypatch):
    import services.paper_desk_llm as llm_module

    _clear_llm_env(monkeypatch)
    monkeypatch.setenv("PAPER_DESK_AGENT_MODE", "llm")
    monkeypatch.setenv("PAPER_DESK_LLM_BASE_URL", "https://example.test")
    monkeypatch.setenv("PAPER_DESK_LLM_API_KEY", "secret-key-value")

    payload = _valid_llm_payload()
    del payload["risk"]
    fake_client = _FakeClient(response=_anthropic_response(payload))
    monkeypatch.setattr(llm_module.httpx, "Client", lambda *a, **k: fake_client)

    assert llm_module.generate_llm_briefs(_assets()) is None


def test_llm_mode_validation_failure_falls_back(monkeypatch):
    import services.paper_desk_llm as llm_module

    _clear_llm_env(monkeypatch)
    monkeypatch.setenv("PAPER_DESK_AGENT_MODE", "llm")
    monkeypatch.setenv("PAPER_DESK_LLM_BASE_URL", "https://example.test")
    monkeypatch.setenv("PAPER_DESK_LLM_API_KEY", "secret-key-value")

    payload = _valid_llm_payload()
    payload["macro"]["confidence"] = 5.0  # out of [0, 1] range -> Pydantic failure
    fake_client = _FakeClient(response=_anthropic_response(payload))
    monkeypatch.setattr(llm_module.httpx, "Client", lambda *a, **k: fake_client)

    assert llm_module.generate_llm_briefs(_assets()) is None


def test_build_committee_briefs_deterministic_when_disabled(monkeypatch):
    import services.paper_desk_committee as committee

    _clear_llm_env(monkeypatch)

    briefs = committee.build_committee_briefs(_assets())

    assert [b.agent for b in briefs] == ["macro", "research", "risk"]
    # Deterministic macro/research briefs are never labeled model_inference.
    by_agent = {b.agent: b for b in briefs}
    assert by_agent["macro"].source_quality != "model_inference"


# ===========================================================================
# T5 hardening: resolve idempotency
# ===========================================================================


def test_resolve_idempotent_does_not_recompute_returns(service, monkeypatch):
    """Resolve must persist exactly one result and never recompute it.

    A second resolve call must not invoke the realized-returns generator again,
    even if that generator would now produce different numbers. This proves the
    result row is read back, not silently re-fabricated on every call.
    """
    import services.paper_desk_service as service_module

    session = service.get_today_session("anonymous-test-user")
    service.submit_allocation(
        PaperDeskAllocationRequest(
            session_id=session.session_id,
            anonymous_id="anonymous-test-user",
            allocations={"NVDA": 25.0, "AMD": 15.0, "TSLA": 10.0, "BTCUSDT": 10.0, "SPY": 40.0},
        )
    )

    calls = {"count": 0}

    def _counting_returns():
        calls["count"] += 1
        # Each call would return materially different numbers if it were used.
        drift = calls["count"] * 0.05
        return (
            {"NVDA": 0.02 + drift, "AMD": 0.01, "TSLA": -0.01, "BTCUSDT": 0.015, "SPY": 0.004},
            "fallback",
        )

    monkeypatch.setattr(service_module, "build_realized_returns", _counting_returns)

    request = PaperDeskResolveRequest(
        session_id=session.session_id,
        anonymous_id="anonymous-test-user",
    )
    first = service.resolve_session(request).result
    second = service.resolve_session(request).result
    third = service.resolve_session(request).result

    # Realized returns are computed exactly once across three resolve calls.
    assert calls["count"] == 1
    assert first is not None and second is not None and third is not None
    assert second.id == first.id == third.id
    assert second.resolved_at == first.resolved_at == third.resolved_at
    assert second.portfolio_return == first.portfolio_return == third.portfolio_return
    assert second.returns == first.returns == third.returns


def test_resolve_idempotent_across_fresh_service_sharing_repo(service):
    """Idempotency is a property of persisted state, not the service instance.

    A new service object sharing the same repository must reuse the stored
    result instead of resolving a second time.
    """
    session = service.get_today_session("anonymous-test-user")
    service.submit_allocation(
        PaperDeskAllocationRequest(
            session_id=session.session_id,
            anonymous_id="anonymous-test-user",
            allocations={"NVDA": 20.0, "AMD": 10.0, "TSLA": 10.0, "BTCUSDT": 10.0, "SPY": 50.0},
        )
    )
    request = PaperDeskResolveRequest(
        session_id=session.session_id,
        anonymous_id="anonymous-test-user",
    )
    first = service.resolve_session(request).result

    second_service = PaperDeskService(service.repository)
    second = second_service.resolve_session(request).result

    assert first is not None and second is not None
    assert second.id == first.id
    assert second.resolved_at == first.resolved_at
    assert second.portfolio_return == first.portfolio_return


def test_resolve_requires_allocation_first(service):
    """Resolve before any allocation is a labeled error, not a fabricated result."""
    session = service.get_today_session("anonymous-test-user")
    with pytest.raises(ValueError):
        service.resolve_session(
            PaperDeskResolveRequest(
                session_id=session.session_id,
                anonymous_id="anonymous-test-user",
            )
        )


# ===========================================================================
# T5 hardening: duplicate allocation submit determinism
# ===========================================================================


def test_duplicate_allocation_first_submit_wins(service):
    """A second submit for the same (session_id, anonymous_id) is a no-op.

    The first submitted weights and stable id persist even when the second
    request carries different (still valid) weights. This keeps duplicate
    submits deterministic rather than mutating committed paper state.
    """
    session = service.get_today_session("anonymous-test-user")
    first_request = PaperDeskAllocationRequest(
        session_id=session.session_id,
        anonymous_id="anonymous-test-user",
        allocations={"NVDA": 20.0, "AMD": 10.0, "TSLA": 10.0, "BTCUSDT": 10.0, "SPY": 50.0},
    )
    second_request = PaperDeskAllocationRequest(
        session_id=session.session_id,
        anonymous_id="anonymous-test-user",
        allocations={"NVDA": 100.0, "AMD": 0.0, "TSLA": 0.0, "BTCUSDT": 0.0, "SPY": 0.0},
    )

    first = service.submit_allocation(first_request).allocation
    second = service.submit_allocation(second_request).allocation

    assert first is not None and second is not None
    assert second.id == first.id
    assert second.submitted_at == first.submitted_at
    # First write wins: the divergent second payload does not overwrite state.
    assert second.allocations == first_request.allocations


def test_allocation_id_is_stable_and_scoped_per_anonymous_id(service):
    """Allocation ids are derived deterministically from (session_id, anonymous_id).

    Same key -> same id across fresh service instances. Different anonymous_id ->
    different id, so users never collide on a shared session.
    """
    session = service.get_today_session("anonymous-user-aaa")
    req_a = PaperDeskAllocationRequest(
        session_id=session.session_id,
        anonymous_id="anonymous-user-aaa",
        allocations={"NVDA": 20.0, "AMD": 10.0, "TSLA": 10.0, "BTCUSDT": 10.0, "SPY": 50.0},
    )
    req_b = PaperDeskAllocationRequest(
        session_id=session.session_id,
        anonymous_id="anonymous-user-bbb",
        allocations={"NVDA": 20.0, "AMD": 10.0, "TSLA": 10.0, "BTCUSDT": 10.0, "SPY": 50.0},
    )

    id_a1 = service.submit_allocation(req_a).allocation.id
    id_b = service.submit_allocation(req_b).allocation.id

    # A fresh service over the same repo derives the identical stable id.
    fresh = PaperDeskService(service.repository)
    id_a2 = fresh.submit_allocation(req_a).allocation.id

    assert id_a1 == id_a2
    assert id_a1 != id_b


# ===========================================================================
# T5 hardening: missing market data -> labeled fallback / incomplete state
# ===========================================================================


def test_build_assets_labels_fallback_when_price_lookup_fails(monkeypatch):
    """When live price lookups raise, assets must be labeled price_source='fallback'.

    The fallback price must still be a positive, deterministic number and must
    never be presented as live market data.
    """
    import services.paper_desk_committee as committee

    def _boom_stock(symbol):
        raise RuntimeError("stock feed down")

    def _boom_crypto(symbol):
        raise RuntimeError("crypto feed down")

    monkeypatch.setitem(sys.modules, "stock_data", types.SimpleNamespace(get_current_price=_boom_stock))
    monkeypatch.setitem(sys.modules, "crypto_data", types.SimpleNamespace(get_current_price=_boom_crypto))

    assets = committee.build_assets()

    assert {a.symbol for a in assets} == {"NVDA", "AMD", "TSLA", "BTCUSDT", "SPY"}
    for asset in assets:
        assert asset.price_source == "fallback"
        assert asset.current_price == committee.FALLBACK_PRICES[asset.symbol]
        assert asset.current_price > 0


def test_realized_returns_labeled_fallback_when_no_predictions(monkeypatch):
    """No cached predictions -> realized returns must be labeled 'fallback'."""
    import services.paper_desk_committee as committee

    monkeypatch.setattr(committee, "_prediction_edges", dict)

    returns, source = committee.build_realized_returns()

    assert source == "fallback"
    assert set(returns) == {"NVDA", "AMD", "TSLA", "BTCUSDT", "SPY"}
    assert returns == committee.FALLBACK_RETURNS


def test_realized_returns_labeled_prediction_cache_when_complete(monkeypatch):
    """A complete prediction cache is labeled 'prediction_cache', not 'fallback'."""
    import services.paper_desk_committee as committee

    complete = {"NVDA": 0.03, "AMD": 0.02, "TSLA": 0.01, "BTCUSDT": 0.04, "SPY": 0.005}
    monkeypatch.setattr(committee, "_prediction_edges", lambda: dict(complete))

    returns, source = committee.build_realized_returns()

    assert source == "prediction_cache"
    assert returns == {k: round(v, 6) for k, v in complete.items()}


def test_resolve_result_always_carries_a_data_source_label(service):
    """Every resolved result must carry a non-empty price_source label.

    Missing market data is allowed to degrade to a labeled fallback, but the
    result is never an unlabeled fabricated number.
    """
    session = service.get_today_session("anonymous-test-user")
    service.submit_allocation(
        PaperDeskAllocationRequest(
            session_id=session.session_id,
            anonymous_id="anonymous-test-user",
            allocations={"NVDA": 20.0, "AMD": 20.0, "TSLA": 10.0, "BTCUSDT": 10.0, "SPY": 40.0},
        )
    )
    result = service.resolve_session(
        PaperDeskResolveRequest(
            session_id=session.session_id,
            anonymous_id="anonymous-test-user",
        )
    ).result

    assert result is not None
    assert result.price_source in {"market_data", "prediction_cache", "fallback"}
    assert result.price_source  # non-empty
    # Result is complete: every contract field is present and benchmark is honest.
    assert result.benchmark_symbol == "SPY"
    assert set(result.returns) == {"NVDA", "AMD", "TSLA", "BTCUSDT", "SPY"}
    assert result.alpha == round(result.portfolio_return - result.benchmark_return, 6)


def test_deterministic_briefs_label_fallback_when_market_data_missing(monkeypatch):
    """Under fallback prices and no prediction cache, briefs carry honest labels.

    The macro brief must be labeled 'fallback' (not market_data), and research
    must be 'fallback' (not prediction_cache). The risk brief keeps its
    deterministic 'model_inference' label, which the contract preserves. No
    brief is silently presented as live market data.
    """
    import services.paper_desk_committee as committee

    _clear_llm_env(monkeypatch)
    monkeypatch.setattr(committee, "_prediction_edges", dict)

    # All assets sourced from fallback prices.
    briefs = committee.build_committee_briefs(_assets())
    by_agent = {b.agent: b for b in briefs}

    assert by_agent["macro"].source_quality == "fallback"
    assert by_agent["research"].source_quality == "fallback"
    # Research evidence honestly states the cache was unavailable.
    assert any("unavailable" in e.lower() for e in by_agent["research"].evidence)
    # Risk brief's deterministic label is unchanged by the contract.
    assert by_agent["risk"].source_quality == "model_inference"
    # Every brief still carries an invalidation and guardrails (paper-only safety).
    for brief in briefs:
        assert brief.invalidation
        assert brief.allocation_guardrails
