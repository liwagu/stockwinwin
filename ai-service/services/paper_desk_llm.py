"""
Optional LLM adapter for Paper Desk Macro / Research / Risk briefs.

The default Paper Desk runtime is fully deterministic. This module adds an
opt-in path that asks an Anthropic Messages-compatible endpoint to author the
three committee briefs in a single HTTP call.

Safety/behavior contract:
- Disabled unless ``PAPER_DESK_AGENT_MODE=llm``.
- Disabled unless both ``PAPER_DESK_LLM_BASE_URL`` and ``PAPER_DESK_LLM_API_KEY``
  are configured.
- Any failure (missing creds, HTTP error, invalid JSON, incomplete agents, or
  Pydantic validation failure) silently returns ``None`` so the caller can keep
  using the deterministic briefs.
- API key values are never logged or surfaced.
- Successful LLM briefs always carry ``source_quality="model_inference"``.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import List, Optional

import httpx

from models.paper_desk import PaperDeskAsset, PaperDeskBrief

logger = logging.getLogger(__name__)

REQUIRED_AGENTS = ("macro", "research", "risk")
DEFAULT_MODEL = "claude-opus-4-8"
ANTHROPIC_VERSION = "2023-06-01"
REQUEST_TIMEOUT_SECONDS = 20.0
MAX_TOKENS = 2048

_SYSTEM_PROMPT = (
    "You are the research committee for a paper-only investment desk. "
    "You never place real-money orders and never promise returns. "
    "Author exactly three briefs for the agents macro, research, and risk. "
    "Respond with strict JSON only, no markdown, matching this shape: "
    '{"macro": {"stance": str, "thesis": str, "confidence": number between 0 and 1, '
    '"evidence": [str, ...], "invalidation": str, "allocation_guardrails": str}, '
    '"research": {... same fields ...}, "risk": {... same fields ...}}. '
    "Every brief must include a falsifiable invalidation and concrete allocation guardrails."
)


def generate_llm_briefs(assets: List[PaperDeskAsset]) -> Optional[List[PaperDeskBrief]]:
    """Return three LLM-authored briefs, or ``None`` to fall back to deterministic.

    This function is deliberately exception-safe: callers can rely on a ``None``
    return for any failure mode instead of handling errors themselves.
    """
    mode = os.getenv("PAPER_DESK_AGENT_MODE", "deterministic").strip().lower()
    if mode != "llm":
        return None

    base_url = (os.getenv("PAPER_DESK_LLM_BASE_URL") or "").strip()
    api_key = (os.getenv("PAPER_DESK_LLM_API_KEY") or "").strip()
    if not base_url or not api_key:
        logger.info("Paper Desk LLM mode requested but credentials are missing; using deterministic briefs.")
        return None

    model = (os.getenv("PAPER_DESK_LLM_MODEL") or "").strip() or DEFAULT_MODEL

    try:
        raw_text = _request_completion(base_url, api_key, model, assets)
    except Exception:
        # Includes httpx transport/HTTP-status errors. Never log the key.
        logger.warning("Paper Desk LLM request failed; using deterministic briefs.", exc_info=False)
        return None

    briefs = _parse_briefs(raw_text)
    if briefs is None:
        logger.warning("Paper Desk LLM response was unusable; using deterministic briefs.")
    return briefs


def _request_completion(base_url: str, api_key: str, model: str, assets: List[PaperDeskAsset]) -> str:
    url = f"{base_url.rstrip('/')}/v1/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
    }
    payload = {
        "model": model,
        "max_tokens": MAX_TOKENS,
        "system": _SYSTEM_PROMPT,
        "messages": [
            {
                "role": "user",
                "content": _user_prompt(assets),
            }
        ],
    }

    with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
        response = client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        body = response.json()

    return _extract_text(body)


def _user_prompt(assets: List[PaperDeskAsset]) -> str:
    lines = [
        f"- {asset.symbol} ({asset.display_name}, {asset.asset_type}): "
        f"price {asset.current_price} via {asset.price_source}"
        for asset in assets
    ]
    universe = "\n".join(lines)
    return (
        "Paper-only session universe (SPY is the benchmark hurdle rate):\n"
        f"{universe}\n\n"
        "Write the macro, research, and risk briefs as strict JSON."
    )


def _extract_text(body: object) -> str:
    """Pull the text payload out of an Anthropic Messages-style response."""
    if not isinstance(body, dict):
        raise ValueError("LLM response was not a JSON object")

    content = body.get("content")
    if not isinstance(content, list):
        raise ValueError("LLM response missing content array")

    for block in content:
        if isinstance(block, dict) and block.get("type", "text") == "text":
            text = block.get("text")
            if isinstance(text, str) and text.strip():
                return text

    raise ValueError("LLM response had no usable text block")


def _parse_briefs(raw_text: str) -> Optional[List[PaperDeskBrief]]:
    try:
        parsed = json.loads(raw_text)
    except (json.JSONDecodeError, TypeError):
        return None

    if not isinstance(parsed, dict):
        return None

    now = datetime.now(timezone.utc)
    briefs: List[PaperDeskBrief] = []
    for agent in REQUIRED_AGENTS:
        section = parsed.get(agent)
        if not isinstance(section, dict):
            return None
        try:
            briefs.append(
                PaperDeskBrief(
                    agent=agent,
                    stance=section["stance"],
                    thesis=section["thesis"],
                    confidence=section["confidence"],
                    evidence=section.get("evidence", []),
                    invalidation=section["invalidation"],
                    source_quality="model_inference",
                    allocation_guardrails=section["allocation_guardrails"],
                    generated_at=now,
                )
            )
        except Exception:
            # Missing fields (KeyError) or Pydantic ValidationError both fall back.
            return None

    return briefs
