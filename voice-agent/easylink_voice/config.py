"""Settings, all from the environment (ECS injects the secrets)."""

from __future__ import annotations

import os
from dataclasses import dataclass, field


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


@dataclass(frozen=True)
class Settings:
    # LiveKit: the agent registers under this name; the SIP dispatch rule sends calls to it.
    agent_name: str = field(default_factory=lambda: _env("AGENT_NAME", "easylink-voice"))
    # EasyLink AI platform (voice API).
    platform_url: str = field(default_factory=lambda: _env("PLATFORM_URL", "http://localhost:8787"))
    voice_key: str = field(default_factory=lambda: _env("VOICE_KEY", "voice-local"))
    # Speech: Deepgram for both ears and voice. Theia is an Australian-accented Aura 2 voice.
    stt_model: str = field(default_factory=lambda: _env("STT_MODEL", "nova-3"))
    stt_language: str = field(default_factory=lambda: _env("STT_LANGUAGE", "en-AU"))
    tts_voice: str = field(default_factory=lambda: _env("TTS_VOICE", "aura-2-theia-en"))
    # Thinking: Claude on Bedrock through the Australian inference profile, so prompts stay onshore.
    llm_model: str = field(default_factory=lambda: _env("LLM_MODEL", "au.anthropic.claude-haiku-4-5-20251001-v1:0"))
    aws_region: str = field(default_factory=lambda: _env("AWS_REGION", "ap-southeast-2"))
    # Recordings and transcripts: the existing bucket, under calls/YYYY-MM-DD/.
    recordings_bucket: str = field(default_factory=lambda: _env("RECORDINGS_BUCKET", "easylink-call-recordings"))
    record_calls: bool = field(default_factory=lambda: _env("RECORD_CALLS", "true").lower() == "true")
    # LiveKit egress writes to S3 with its own key (the existing easylink-call-recording user).
    egress_access_key: str = field(default_factory=lambda: _env("EGRESS_AWS_ACCESS_KEY_ID"))
    egress_secret_key: str = field(default_factory=lambda: _env("EGRESS_AWS_SECRET_ACCESS_KEY"))
    business_name: str = field(default_factory=lambda: _env("BUSINESS_NAME", "EasyLink Solar"))


settings = Settings()
