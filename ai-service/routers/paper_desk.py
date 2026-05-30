"""
Public Paper Desk endpoints.
"""

from fastapi import APIRouter, HTTPException, Query, status

from models.paper_desk import (
    PaperDeskAllocationRequest,
    PaperDeskHistoryResponse,
    PaperDeskResolveRequest,
    PaperDeskSession,
)
from services.paper_desk_service import paper_desk_service

router = APIRouter(prefix="/v1/paper-desk", tags=["paper-desk"])


@router.get("/session/today", response_model=PaperDeskSession)
async def get_today_session(
    anonymous_id: str = Query(..., min_length=8, max_length=128),
):
    try:
        return paper_desk_service.get_today_session(anonymous_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/allocation", response_model=PaperDeskSession)
async def submit_allocation(request: PaperDeskAllocationRequest):
    try:
        return paper_desk_service.submit_allocation(request)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/resolve", response_model=PaperDeskSession)
async def resolve_session(request: PaperDeskResolveRequest):
    try:
        return paper_desk_service.resolve_session(request)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/history", response_model=PaperDeskHistoryResponse)
async def get_history(
    anonymous_id: str = Query(..., min_length=8, max_length=128),
):
    try:
        return paper_desk_service.get_history(anonymous_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
