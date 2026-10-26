"""Simulated phone calls: the real agent, tools and session, talking to the real
platform (local, demo jobs), with a scripted model standing in for Claude."""

from __future__ import annotations

import json
import re

import httpx
import pytest
from livekit.agents import AgentSession

from easylink_voice.agent import EasyLinkAgent
from easylink_voice.platform import Platform
from easylink_voice.records import call_prefix, summarise, transcript_from_history

from .scripted_llm import ScriptedLLM, receptionist

def tool_events(result) -> list[tuple[str, str]]:
    """[(kind, detail)] for each tool call and output in a turn."""
    out = []
    for ev in result.events:
        if ev.type == "function_call":
            out.append(("call", ev.item.name))
        elif ev.type == "function_call_output":
            out.append(("error" if ev.item.is_error else "ok", str(ev.item.output)))
    return out


def code_from(outbox, to: str, pattern: str) -> str:
    texts = [m["body"] for m in outbox(to) if m["channel"] == "sms" and re.search(pattern, m["body"])]
    assert texts, f"no text to {to} matching {pattern!r}"
    return re.search(r"(\d{6})", texts[-1]).group(1)


async def call(platform_url: str, room: str, caller: str):
    p = Platform(platform_url, "voice-local", call_id=room)
    who = await p.start(caller)
    agent = EasyLinkAgent(p, known=who["known"], kind=who["kind"])
    session = AgentSession(llm=ScriptedLLM(receptionist))
    return p, agent, session


async def test_customer_verifies_then_signs_stc_form_and_gets_payment_link(platform_url, outbox):
    p, agent, session = await call(platform_url, "pstn-test-daniel", "0400 000 301")
    async with session:
        await session.start(agent)

        # Nothing about the job before the code.
        r = await session.run(user_input="What's the status of my job?")
        assert tool_events(r)[-1][0] == "error" and "Verify the caller first" in tool_events(r)[-1][1]

        r = await session.run(user_input="Sure, text me a code")
        assert tool_events(r) == [("call", "send_verification_code"), ("ok", "Code sent by text to the number ending 301. Ask them to read it out.")]

        code = code_from(outbox, "+61400000301", "phone code")
        r = await session.run(user_input=f"The code is {' '.join(code)}")
        assert tool_events(r)[1][0] == "ok"
        assert agent.verified and agent.first_name == "Daniel"

        r = await session.run(user_input="What's left on my job?")
        job = json.loads(tool_events(r)[1][1])
        assert job["address"] == "7 Gum Tree Ct, Castle Hill NSW 2154"
        stc = next(d for d in job["documents"] if "STC" in d["title"])
        assert stc["status"] != "signed"

        r = await session.run(user_input="I'd like to sign the STC form please")
        assert tool_events(r)[0] == ("call", "do_step") and tool_events(r)[1][0] == "ok"

        signing = code_from(outbox, "+61400000301", "signing code")
        r = await session.run(user_input=f"Signing code {signing}")
        out = json.loads(tool_events(r)[1][1])
        assert out["done"] == "sign"
        assert next(d for d in out["job"]["documents"] if d["signatureId"] == stc["signatureId"])["status"] == "signed"

        # Card payments never happen by voice: refused, and a link goes out instead.
        r = await session.run(user_input="Can I pay by card now?")
        assert tool_events(r)[-1][0] == "error"
        r = await session.run(user_input="Then text me the link to pay")
        assert tool_events(r) == [("call", "text_link"), ("ok", "Link sent by text.")]
        assert "/customers/project" in outbox("+61400000301")[-1]["body"]

        r = await session.run(user_input="Thanks, bye")
        assert agent.ended

    # The stored transcript keeps what was said, never the codes.
    turns = transcript_from_history(session.history.to_dict(), agent.secrets)
    raw = json.dumps(turns)
    assert code not in raw and signing not in raw
    assert any(t.get("who") == "caller" and "stc form" in t["text"].lower() for t in turns)
    assert "sign" in summarise(turns, [])

    # The call goes into the job's history.
    done = await p.end(durationSec=184, summary=summarise(turns, []), jobId=agent.current_job, recordingKey=f"{call_prefix()}/pstn-test-daniel.ogg")
    assert done == {"saved": True}
    await p.aclose()


async def test_unknown_caller_gets_help_and_can_leave_a_message(platform_url, outbox):
    p, agent, session = await call(platform_url, "pstn-test-unknown", "+61 499 111 222")
    assert agent.known is False
    async with session:
        await session.start(agent)
        r = await session.run(user_input="Can you text me a code?")
        assert tool_events(r)[-1][0] == "error"
        r = await session.run(user_input="Could someone call me back about a 10 kW system after 3pm?")
        assert tool_events(r) == [("call", "leave_message"), ("ok", "Message noted. The team will call back on this number.")]
    await p.end(messages=agent.messages_left)
    staff = [m for m in httpx.get(f"{platform_url}/local/outbox").json() if m["channel"] == "email" and "+61499111222" in m.get("subject", "")]
    assert staff and "10 kW" in staff[-1]["body"]
    await p.aclose()


async def test_wrong_code_is_refused(platform_url, outbox):
    p, agent, session = await call(platform_url, "pstn-test-wrong", "+61400000301")
    async with session:
        await session.start(agent)
        await session.run(user_input="Please send the code")
        real = code_from(outbox, "+61400000301", "phone code")
        wrong = "000000" if real != "000000" else "111111"
        r = await session.run(user_input=f"The code is {wrong}")
        assert tool_events(r)[-1][0] == "error" and "doesn't match" in tool_events(r)[-1][1]
        assert agent.verified is False
    await p.aclose()


def test_call_folder_uses_sydney_date():
    from datetime import datetime, timezone

    # 22 Oct 2026, 2pm UTC is 23 Oct, 1am in Sydney.
    assert call_prefix(datetime(2026, 10, 22, 14, 0, tzinfo=timezone.utc)) == "calls/2026-10-23"


async def test_asking_for_a_person_with_nobody_free_books_a_callback(platform_url, outbox):
    p, agent, session = await call(platform_url, "pstn-test-person", "0412 555 000")
    agent.poll_seconds = 0.01
    async with session:
        await session.start(agent)
        r = await session.run(user_input="Can I speak to a person about a battery?")
        events = tool_events(r)
        assert events[0] == ("call", "transfer_to_person")
        assert events[1][0] == "ok" and "call back" in events[1][1]
        assert agent.handed_to is None
    await p.aclose()
