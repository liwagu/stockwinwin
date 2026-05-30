"""
Application service for the Paper Desk paper-validation loop.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, Iterable, List, Optional
from uuid import NAMESPACE_URL, uuid5

from models.paper_desk import (
    PaperDeskAllocation,
    PaperDeskAllocationRequest,
    PaperDeskAsset,
    PaperDeskHistoryResponse,
    PaperDeskResolveRequest,
    PaperDeskResult,
    PaperDeskSession,
)
from repositories.paper_desk import PaperDeskRepository, paper_desk_repo
from services.paper_desk_committee import (
    build_assets,
    build_committee_briefs,
    build_realized_returns,
)

PAPER_NAMESPACE = "https://stockwin.win/paper-desk"


class PaperDeskService:
    def __init__(self, repository: PaperDeskRepository = paper_desk_repo) -> None:
        self.repository = repository

    def get_today_session(self, anonymous_id: str) -> PaperDeskSession:
        self._validate_anonymous_id(anonymous_id)
        session_id = self._session_id_for_date(self._today())
        row = self._ensure_session(session_id)
        return self._build_session(row, anonymous_id)

    def submit_allocation(self, request: PaperDeskAllocationRequest) -> PaperDeskSession:
        row = self._ensure_session(request.session_id)
        existing = self.repository.get_allocation(request.session_id, request.anonymous_id)
        if existing is None:
            allocation_id = self._stable_id("allocation", request.session_id, request.anonymous_id)
            now = self._now()
            self.repository.upsert_allocation(
                {
                    "id": allocation_id,
                    "session_id": request.session_id,
                    "anonymous_id": request.anonymous_id,
                    "allocations": request.allocations,
                    "submitted_at": now.isoformat(),
                }
            )

        return self._build_session(row, request.anonymous_id)

    def resolve_session(self, request: PaperDeskResolveRequest) -> PaperDeskSession:
        row = self._ensure_session(request.session_id)
        allocation = self.repository.get_allocation(request.session_id, request.anonymous_id)
        if allocation is None:
            raise ValueError("Allocation is required before resolve")

        existing = self.repository.get_result(allocation["id"])
        if existing is None:
            returns, price_source = build_realized_returns()
            portfolio_return = self._portfolio_return(allocation["allocations"], returns)
            benchmark_symbol = row.get("benchmark_symbol", "SPY")
            benchmark_return = returns.get(benchmark_symbol, 0.0)
            result_id = self._stable_id("result", allocation["id"])

            self.repository.upsert_result(
                {
                    "id": result_id,
                    "allocation_id": allocation["id"],
                    "session_id": request.session_id,
                    "returns": returns,
                    "portfolio_return": round(portfolio_return, 6),
                    "benchmark_symbol": benchmark_symbol,
                    "benchmark_return": round(benchmark_return, 6),
                    "alpha": round(portfolio_return - benchmark_return, 6),
                    "drawdown": round(max(0.0, -portfolio_return), 6),
                    "price_source": price_source,
                    "resolved_at": self._now().isoformat(),
                }
            )

        return self._build_session(row, request.anonymous_id)

    def get_history(self, anonymous_id: str) -> PaperDeskHistoryResponse:
        self._validate_anonymous_id(anonymous_id)
        sessions: List[PaperDeskSession] = []
        for allocation in self.repository.get_history_allocations(anonymous_id):
            row = self.repository.get_session(allocation["session_id"])
            if row is not None:
                sessions.append(self._build_session(row, anonymous_id))

        return PaperDeskHistoryResponse(anonymous_id=anonymous_id, sessions=sessions)

    def _ensure_session(self, session_id: str) -> Dict:
        existing = self.repository.get_session(session_id)
        if existing is not None:
            if not self.repository.get_briefs(session_id):
                assets = [PaperDeskAsset(**asset) for asset in existing.get("assets", [])]
                self._replace_briefs(session_id, build_committee_briefs(assets))
            return existing

        trading_date = session_id.replace("paper-", "")
        assets = build_assets()
        briefs = build_committee_briefs(assets)
        now = self._now()
        row = self.repository.upsert_session(
            {
                "id": session_id,
                "trading_date": trading_date,
                "status": "open",
                "paper_only": True,
                "starting_cash": 100000,
                "benchmark_symbol": "SPY",
                "assets": self._dump_many(assets),
                "generated_at": now.isoformat(),
            }
        )
        self._replace_briefs(session_id, briefs)
        return row

    def _replace_briefs(self, session_id: str, briefs: Iterable) -> None:
        rows = []
        for brief in briefs:
            payload = brief.model_dump(mode="json")
            payload["id"] = self._stable_id("brief", session_id, payload["agent"])
            payload["session_id"] = session_id
            rows.append(payload)
        self.repository.replace_briefs(session_id, rows)

    def _build_session(self, row: Dict, anonymous_id: str) -> PaperDeskSession:
        briefs = self.repository.get_briefs(row["id"])
        allocation_row = self.repository.get_allocation(row["id"], anonymous_id)
        result_row: Optional[Dict] = None
        if allocation_row is not None:
            result_row = self.repository.get_result(allocation_row["id"])

        status = "open"
        if result_row is not None:
            status = "resolved"
        elif allocation_row is not None:
            status = "allocated"

        return PaperDeskSession(
            session_id=row["id"],
            trading_date=str(row["trading_date"]),
            status=status,
            paper_only=bool(row.get("paper_only", True)),
            starting_cash=int(row.get("starting_cash", 100000)),
            benchmark_symbol=row.get("benchmark_symbol", "SPY"),
            assets=row.get("assets", []),
            briefs=briefs,
            allocation=PaperDeskAllocation(**allocation_row) if allocation_row else None,
            result=PaperDeskResult(**result_row) if result_row else None,
            generated_at=row["generated_at"],
        )

    def _portfolio_return(self, allocations: Dict[str, float], returns: Dict[str, float]) -> float:
        return sum((weight / 100.0) * returns.get(symbol, 0.0) for symbol, weight in allocations.items())

    def _today(self) -> str:
        return self._now().date().isoformat()

    def _now(self) -> datetime:
        return datetime.now(timezone.utc)

    def _session_id_for_date(self, trading_date: str) -> str:
        return f"paper-{trading_date}"

    def _stable_id(self, *parts: str) -> str:
        return str(uuid5(NAMESPACE_URL, ":".join((PAPER_NAMESPACE, *parts))))

    def _validate_anonymous_id(self, anonymous_id: str) -> None:
        if len(anonymous_id) < 8 or len(anonymous_id) > 128:
            raise ValueError("anonymous_id must be between 8 and 128 characters")

    def _dump_many(self, models: Iterable) -> List[Dict]:
        return [model.model_dump(mode="json") for model in models]


paper_desk_service = PaperDeskService()
