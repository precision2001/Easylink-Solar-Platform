"""Starts the AI platform locally (in memory, demo jobs seeded) for simulated calls."""

from __future__ import annotations

import os
import socket
import subprocess
import time
from pathlib import Path

import httpx
import pytest

ROOT = Path(__file__).resolve().parents[2]


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="session")
def platform_url() -> str:
    port = _free_port()
    env = {**os.environ, "AI_MODE": "local", "PORT": str(port)}
    proc = subprocess.Popen(["npx", "tsx", "src/http/local.ts"], cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    url = f"http://127.0.0.1:{port}"
    for _ in range(120):
        try:
            if httpx.get(f"{url}/health", timeout=1).status_code == 200:
                break
        except httpx.HTTPError:
            pass
        if proc.poll() is not None:
            raise RuntimeError(proc.stdout.read().decode() if proc.stdout else "platform exited")
        time.sleep(0.5)
    else:
        proc.kill()
        raise RuntimeError("platform did not start")
    yield url
    proc.terminate()
    proc.wait(timeout=10)


@pytest.fixture
def outbox(platform_url: str):
    def read(to: str) -> list[dict]:
        return [m for m in httpx.get(f"{platform_url}/local/outbox").json() if m.get("to") == to]

    return read
