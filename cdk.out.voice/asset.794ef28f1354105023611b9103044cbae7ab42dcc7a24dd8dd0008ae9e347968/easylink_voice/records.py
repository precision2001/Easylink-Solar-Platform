"""Call recordings and transcripts, kept in the existing recordings bucket.

Layout (matches what LiveKit already writes):
    calls/YYYY-MM-DD/<room>.ogg              the recording (LiveKit egress)
    calls/YYYY-MM-DD/<room>.transcript.json  who said what, tools used, timings (this agent)
"""

from __future__ import annotations

import asyncio
import json
import re
from datetime import datetime, timezone
from typing import Any
from zoneinfo import ZoneInfo

SYDNEY = ZoneInfo("Australia/Sydney")


def call_prefix(now: datetime | None = None) -> str:
    """Folder for a call, by its Sydney date (calls/2026-10-22)."""
    now = now or datetime.now(timezone.utc)
    return f"calls/{now.astimezone(SYDNEY).date().isoformat()}"


def transcript_from_history(history: dict[str, Any], secrets: set[str] | frozenset[str] = frozenset()) -> list[dict[str, Any]]:
    """ChatContext.to_dict() → a flat, readable list of turns and tool calls.

    Codes read out on the call (phone and signing codes) are masked wherever they
    appear: in what the caller said, in tool arguments and in tool results.
    """
    hide = _masker(secrets)
    out: list[dict[str, Any]] = []
    for item in history.get("items", []):
        t = item.get("type")
        if t == "message":
            text = " ".join(c for c in item.get("content", []) if isinstance(c, str)).strip()
            if text and item.get("role") in ("user", "assistant"):
                out.append({"who": "caller" if item["role"] == "user" else "agent", "text": hide(text), "interrupted": bool(item.get("interrupted"))})
        elif t == "function_call":
            out.append({"who": "agent", "tool": item.get("name"), "args": hide(_redact(item.get("arguments", "")))})
        elif t == "function_call_output":
            out.append({"who": "system", "tool_result": hide(str(item.get("output", "")))[:600], "error": bool(item.get("is_error"))})
    return out


def _masker(secrets: set[str] | frozenset[str]):
    """Each secret's digits, however they were spoken or spaced ("4 8-1 2 0 9")."""
    pats = [re.compile(r"(?<!\d)" + r"[\s,.-]*".join(map(re.escape, d)) + r"(?!\d)") for d in {"".join(ch for ch in s if ch.isdigit()) for s in secrets} if len(d) >= 4]

    def hide(text: str) -> str:
        for p in pats:
            text = p.sub("••••••", text)
        return text

    return hide


def _redact(args: str) -> str:
    """Codes read out on the call don't belong in a stored transcript."""
    try:
        a = json.loads(args or "{}")
    except ValueError:
        return args
    for k in ("code", "devCode"):
        if k in a and a[k]:
            a[k] = "••••••"
    return json.dumps(a, ensure_ascii=False)


def summarise(turns: list[dict[str, Any]], messages: list[str]) -> str:
    """A one-paragraph note for job history: steps done and messages left (no model call needed)."""
    steps = []
    for t in turns:
        if t.get("tool") == "do_step":
            try:
                steps.append(json.loads(t["args"]).get("step", "step"))
            except ValueError:
                steps.append("step")
    parts = []
    if steps:
        parts.append("Done on the call: " + ", ".join(s.replace("_", " ") for s in steps) + ".")
    if messages:
        parts.append("Messages for the team: " + " | ".join(messages))
    if not parts:
        parts.append(f"{len([t for t in turns if t.get('who') == 'caller'])} caller turns; no steps taken.")
    return " ".join(parts)[:1000]


async def save_json(bucket: str, key: str, body: dict[str, Any], region: str) -> None:
    import boto3  # the task role grants s3:PutObject on calls/*

    def put() -> None:
        boto3.client("s3", region_name=region).put_object(
            Bucket=bucket, Key=key, Body=json.dumps(body, ensure_ascii=False, indent=1).encode(),
            ContentType="application/json", ServerSideEncryption="AES256",
        )

    await asyncio.to_thread(put)
