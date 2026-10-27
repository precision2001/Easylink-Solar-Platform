"""Entry point: a LiveKit agent server that answers EasyLink's phone calls.

Crazytel → LiveKit SIP (inbound trunk + dispatch rule naming this agent) → a room per call → here.

Run:  python -m easylink_voice.main start      (production; needs LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
      python -m easylink_voice.main dev        (local, hot reload)
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

from livekit import api, rtc
from livekit.agents import AgentServer, AgentSession, JobContext, JobProcess, cli
from livekit.plugins import aws, deepgram, silero

from .agent import EasyLinkAgent
from .config import settings
from .platform import Platform, PlatformError
from .records import call_prefix, save_json, summarise, transcript_from_history

log = logging.getLogger("easylink-voice")

# Words Deepgram should expect on solar calls.
KEYTERMS = ["EasyLink", "STC", "inverter", "kilowatt", "kWh", "Endeavour Energy", "Ausgrid", "Essential Energy", "NMI", "switchboard", "CCEW", "Sigenergy", "Tesla Powerwall"]

def prewarm(proc: JobProcess) -> None:
    proc.userdata["vad"] = silero.VAD.load()


server = AgentServer(setup_fnc=prewarm)


@server.rtc_session(agent_name=settings.agent_name)
async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect()
    caller = await ctx.wait_for_participant(kind=rtc.ParticipantKind.PARTICIPANT_KIND_SIP)
    phone = caller.attributes.get("sip.phoneNumber") or caller.identity
    room = ctx.room.name
    started = time.time()
    prefix = call_prefix()
    log.info("call started", extra={"room": room})

    # 1. Record (the caller hears the notice in the greeting).
    recording_key: str | None = None
    # If the SIP dispatch rule already records the room (room_config.egress), don't record twice.
    try:
        active = await ctx.api.egress.list_egress(api.ListEgressRequest(room_name=room, active=True))
        already = len(active.items) > 0
    except Exception:
        already = False
    if already:
        recording_key = "recorded by the LiveKit dispatch rule"
    elif settings.record_calls and settings.egress_access_key:
        recording_key = f"{prefix}/{room}.ogg"
        try:
            await ctx.api.egress.start_room_composite_egress(api.RoomCompositeEgressRequest(
                room_name=room, audio_only=True,
                file_outputs=[api.EncodedFileOutput(
                    file_type=api.EncodedFileType.OGG, filepath=recording_key,
                    s3=api.S3Upload(access_key=settings.egress_access_key, secret=settings.egress_secret_key,
                                    region=settings.aws_region, bucket=settings.recordings_bucket),
                )],
            ))
        except Exception:  # never drop a call because recording failed
            log.exception("recording did not start")
            recording_key = None

    # 2. Who is calling (number only; details wait for the texted code).
    platform = Platform(settings.platform_url, settings.voice_key, call_id=room)
    try:
        who = await platform.start(phone)
    except PlatformError:
        log.exception("platform unavailable")
        who = {"known": False, "kind": None}
    agent = EasyLinkAgent(platform, known=bool(who.get("known")), kind=who.get("kind"), business=settings.business_name)

    session = AgentSession(
        vad=ctx.proc.userdata["vad"],
        stt=deepgram.STT(model=settings.stt_model, language=settings.stt_language, keyterm=KEYTERMS, smart_format=True, numerals=True),
        llm=aws.LLM(model=settings.llm_model, region=settings.aws_region, temperature=0.3),
        tts=deepgram.TTS(model=settings.tts_voice),
    )

    # 3. When the call ends: transcript to S3, a note on the job.
    async def finish(reason: str = "") -> None:
        turns = transcript_from_history(session.history.to_dict(exclude_timestamp=False), agent.secrets)
        transcript_key = f"{prefix}/{room}.transcript.json"
        try:
            await save_json(settings.recordings_bucket, transcript_key, {
                "room": room, "caller": phone, "startedAt": datetime.fromtimestamp(started, timezone.utc).isoformat(),
                "durationSec": round(time.time() - started), "verified": agent.verified, "role": agent.kind,
                "recording": recording_key, "messages": agent.messages_left, "turns": turns,
            }, settings.aws_region)
        except Exception:
            log.exception("transcript not saved")
            transcript_key = None
        try:
            await platform.end(durationSec=round(time.time() - started), transcriptKey=transcript_key, recordingKey=recording_key,
                               summary=summarise(turns, agent.messages_left), jobId=agent.current_job, messages=agent.messages_left or None,
                               startedAt=datetime.fromtimestamp(started, timezone.utc).isoformat(),
                               turns=[{"who": t.get("who"), "text": t.get("text")} for t in turns if t.get("text")])
        except PlatformError:
            log.exception("call note not saved")
        await platform.aclose()

    ctx.add_shutdown_callback(finish)

    await session.start(agent=agent, room=ctx.room)
    notice = "This call is recorded and may be monitored so we can help you properly. " if recording_key else ""
    if recording_key and not recording_key.startswith("calls/"):
        recording_key = None
    if who.get("known"):
        await session.generate_reply(instructions=f'Say: "Hi, you\'ve reached {settings.business_name}, this is EasyLink AI. {notice}I can see this number is on one of our accounts. To keep your details safe, I\'ll send you a six-digit code." Then call send_verification_code and tell them whether it went by text or email.')
    else:
        await session.generate_reply(instructions=f'Say: "Hi, you\'ve reached {settings.business_name}, this is EasyLink AI. {notice}How can I help today?"')


if __name__ == "__main__":
    cli.run_app(server)
