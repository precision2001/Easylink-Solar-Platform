"""A stand-in for Claude that plays a fixed script, so whole calls can be simulated offline.

It reads the conversation like the real model would and either says something or
calls one of the agent's tools. Everything else (the agent, its tools, the session,
the platform over HTTP) is the real code.
"""

from __future__ import annotations

import json
import re
import uuid
from collections.abc import Callable
from typing import Any

from livekit.agents import llm
from livekit.agents.llm.llm import ChatChunk, ChoiceDelta, FunctionToolCall
from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS

Decision = tuple[str, str] | tuple[str, str, dict[str, Any]]


class ScriptedLLM(llm.LLM):
    def __init__(self, brain: Callable[[llm.ChatContext], Decision]) -> None:
        super().__init__()
        self.brain = brain
        self.calls: list[str] = []

    def chat(self, *, chat_ctx: llm.ChatContext, tools: list[Any] | None = None, conn_options: Any = DEFAULT_API_CONNECT_OPTIONS, **_: Any) -> llm.LLMStream:
        return _Stream(self, chat_ctx=chat_ctx, tools=tools or [], conn_options=conn_options)


class _Stream(llm.LLMStream):
    async def _run(self) -> None:
        d = self._llm.brain(self._chat_ctx)  # type: ignore[attr-defined]
        rid = uuid.uuid4().hex[:8]
        if d[0] == "say":
            self._event_ch.send_nowait(ChatChunk(id=rid, delta=ChoiceDelta(role="assistant", content=d[1])))
        else:
            _, name, args = d  # type: ignore[misc]
            self._llm.calls.append(name)  # type: ignore[attr-defined]
            self._event_ch.send_nowait(ChatChunk(id=rid, delta=ChoiceDelta(role="assistant", tool_calls=[FunctionToolCall(name=name, arguments=json.dumps(args), call_id=f"call_{rid}")])))


# ---------- reading the conversation ----------
def last(ctx: llm.ChatContext) -> Any:
    return ctx.items[-1]


def user_text(item: Any) -> str:
    return " ".join(c for c in getattr(item, "content", []) if isinstance(c, str)).lower()


def outputs(ctx: llm.ChatContext) -> list[Any]:
    return [i for i in ctx.items if i.type == "function_call_output"]


def latest_job(ctx: llm.ChatContext) -> dict[str, Any] | None:
    """The most recent job the tools returned (from get_job, verify_code or do_step)."""
    for o in reversed(outputs(ctx)):
        try:
            data = json.loads(o.output)
        except (ValueError, TypeError):
            continue
        if isinstance(data, dict):
            if "documents" in data:
                return data
            if isinstance(data.get("job"), dict):
                return data["job"]
            if data.get("jobs"):
                return data["jobs"][0]
    return None


def digits(text: str) -> str:
    return "".join(re.findall(r"\d", text))


def receptionist(ctx: llm.ChatContext) -> Decision:
    """How the script behaves: tool for each request; after a tool, report what came back."""
    item = last(ctx)
    if item.type == "function_call_output":
        return ("say", ("Sorry, " if item.is_error else "Done: ") + str(item.output)[:160])
    if item.type != "message" or item.role != "user":
        return ("say", "Hi, you've reached EasyLink Solar, this is EasyLink AI. How can I help?")
    t = user_text(item)
    if "bye" in t:
        return ("tool", "end_call", {})
    if "text me a code" in t or "send the code" in t:
        return ("tool", "send_verification_code", {})
    if t.startswith("the code is"):
        return ("tool", "verify_code", {"code": " ".join(digits(t))})
    if "what's left" in t or "status" in t:
        return ("tool", "get_job", {})
    if "sign the stc" in t:
        job = latest_job(ctx) or {}
        doc = next((d for d in job.get("documents", []) if "STC" in d.get("title", "") and d.get("status") != "signed"), None)
        return ("tool", "do_step", {"step": "request_code", "signature_id": doc["signatureId"] if doc else "unknown"})
    if t.startswith("signing code"):
        job = latest_job(ctx) or {}
        doc = next((d for d in job.get("documents", []) if "STC" in d.get("title", "") and d.get("status") != "signed"), None)
        return ("tool", "do_step", {"step": "sign", "signature_id": doc["signatureId"] if doc else "unknown", "code": digits(t)})
    if "link to pay" in t:
        return ("tool", "text_link", {"what": "pay"})
    if "pay by card" in t:
        return ("tool", "do_step", {"step": "pay_invoice"})
    if "speak to a person" in t:
        return ("tool", "transfer_to_person", {"summary": item.content[0], "reason": "asked for a person"})
    if "call me back" in t:
        return ("tool", "leave_message", {"message": item.content[0]})
    return ("say", "Could you tell me a bit more?")
