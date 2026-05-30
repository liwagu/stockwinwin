"""
Paper Desk persistence helpers.

Supabase is used when real credentials are configured. A process-local memory
store keeps local demos and tests usable with placeholder `.env.example` values.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict, List, Optional

from config import config


class PaperDeskRepository:
    def __init__(self) -> None:
        self._sessions: Dict[str, Dict[str, Any]] = {}
        self._briefs: Dict[str, List[Dict[str, Any]]] = {}
        self._allocations: Dict[tuple[str, str], Dict[str, Any]] = {}
        self._results: Dict[str, Dict[str, Any]] = {}

    def _use_memory(self) -> bool:
        return (
            not config.SUPABASE_URL
            or not config.SUPABASE_SERVICE_KEY
            or "your-project" in config.SUPABASE_URL
            or "replace-with" in config.SUPABASE_SERVICE_KEY
            or config.SUPABASE_SERVICE_KEY == "test_service_key"
        )

    def _table(self, table_name: str):
        if self._use_memory():
            return None
        from services.supabase_client import get_supabase_client

        return get_supabase_client().table(table_name)

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        table = self._table("paper_sessions")
        if table is None:
            return deepcopy(self._sessions.get(session_id))

        response = table.select("*").eq("id", session_id).limit(1).execute()
        return response.data[0] if response.data else None

    def upsert_session(self, row: Dict[str, Any]) -> Dict[str, Any]:
        table = self._table("paper_sessions")
        if table is None:
            self._sessions[row["id"]] = deepcopy(row)
            return deepcopy(row)

        response = table.upsert(row, on_conflict="id").execute()
        return response.data[0] if response.data else row

    def get_briefs(self, session_id: str) -> List[Dict[str, Any]]:
        table = self._table("paper_agent_briefs")
        if table is None:
            return deepcopy(self._briefs.get(session_id, []))

        response = table.select("*").eq("session_id", session_id).execute()
        return response.data or []

    def replace_briefs(self, session_id: str, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        table = self._table("paper_agent_briefs")
        if table is None:
            self._briefs[session_id] = deepcopy(rows)
            return deepcopy(rows)

        table.delete().eq("session_id", session_id).execute()
        response = table.insert(rows).execute()
        return response.data or rows

    def get_allocation(self, session_id: str, anonymous_id: str) -> Optional[Dict[str, Any]]:
        table = self._table("paper_allocations")
        if table is None:
            return deepcopy(self._allocations.get((session_id, anonymous_id)))

        response = (
            table.select("*")
            .eq("session_id", session_id)
            .eq("anonymous_id", anonymous_id)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    def upsert_allocation(self, row: Dict[str, Any]) -> Dict[str, Any]:
        table = self._table("paper_allocations")
        if table is None:
            self._allocations[(row["session_id"], row["anonymous_id"])] = deepcopy(row)
            return deepcopy(row)

        response = table.upsert(row, on_conflict="session_id,anonymous_id").execute()
        return response.data[0] if response.data else row

    def get_result(self, allocation_id: str) -> Optional[Dict[str, Any]]:
        table = self._table("paper_results")
        if table is None:
            return deepcopy(self._results.get(allocation_id))

        response = table.select("*").eq("allocation_id", allocation_id).limit(1).execute()
        return response.data[0] if response.data else None

    def upsert_result(self, row: Dict[str, Any]) -> Dict[str, Any]:
        table = self._table("paper_results")
        if table is None:
            self._results[row["allocation_id"]] = deepcopy(row)
            return deepcopy(row)

        response = table.upsert(row, on_conflict="allocation_id").execute()
        return response.data[0] if response.data else row

    def get_history_allocations(self, anonymous_id: str, limit: int = 7) -> List[Dict[str, Any]]:
        table = self._table("paper_allocations")
        if table is None:
            rows = [
                deepcopy(row)
                for (session_id, row_anonymous_id), row in self._allocations.items()
                if row_anonymous_id == anonymous_id and session_id in self._sessions
            ]
            rows.sort(key=lambda row: row["submitted_at"], reverse=True)
            return rows[:limit]

        response = (
            table.select("*")
            .eq("anonymous_id", anonymous_id)
            .order("submitted_at", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data or []


paper_desk_repo = PaperDeskRepository()
