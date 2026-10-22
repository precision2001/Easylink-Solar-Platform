"""Client for the EasyLink AI platform's voice API (/voice/*).

Every job step goes through the platform, so the same rules apply as in the
portals: who may do what, in which order, and what gets texted or emailed.
"""

from __future__ import annotations

from typing import Any
from urllib.parse import quote

import httpx


class PlatformError(Exception):
    """A refusal the caller should hear in plain words (e.g. "That code doesn't match")."""

    def __init__(self, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status = status


class Platform:
    def __init__(self, base_url: str, voice_key: str, call_id: str, client: httpx.AsyncClient | None = None) -> None:
        self.call_id = call_id
        self._client = client or httpx.AsyncClient(base_url=base_url.rstrip("/"), timeout=15.0)
        self._headers = {"x-voice-key": voice_key}

    async def _req(self, method: str, path: str, body: dict[str, Any] | None = None) -> Any:
        try:
            r = await self._client.request(method, path, json=body, headers=self._headers)
        except httpx.HTTPError as e:
            raise PlatformError("I can't reach the job system right now.", 503) from e
        try:
            data = r.json()
        except ValueError:
            data = {}
        if r.status_code >= 400 or not data.get("success", False):
            raise PlatformError(str(data.get("message") or "Something went wrong."), r.status_code)
        return data.get("data")

    def _c(self, rest: str = "") -> str:
        return f"/voice/calls/{quote(self.call_id, safe='')}{rest}"

    async def start(self, caller: str) -> dict[str, Any]:
        return await self._req("POST", "/voice/calls", {"callId": self.call_id, "from": caller})

    async def send_code(self) -> dict[str, Any]:
        return await self._req("POST", self._c("/code"))

    async def verify(self, code: str) -> dict[str, Any]:
        return await self._req("POST", self._c("/verify"), {"code": code})

    async def job(self, job_id: str) -> dict[str, Any]:
        return await self._req("GET", self._c(f"/jobs/{quote(job_id, safe='')}"))

    async def step(self, job_id: str, action: str, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._req("POST", self._c(f"/jobs/{quote(job_id, safe='')}/steps/{quote(action, safe='')}"), payload)

    async def link(self, job_id: str, what: str) -> dict[str, Any]:
        return await self._req("POST", self._c(f"/jobs/{quote(job_id, safe='')}/link"), {"what": what})

    async def end(self, **info: Any) -> dict[str, Any]:
        body = {k: v for k, v in info.items() if v is not None}
        return await self._req("POST", self._c("/end"), body)

    async def aclose(self) -> None:
        await self._client.aclose()
