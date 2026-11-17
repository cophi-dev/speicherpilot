"""HTTP-Helfer für energy-charts (ohne Solver-Abhängigkeiten, CI-testbar)."""
from __future__ import annotations

import json
import random
import time
import urllib.error
import urllib.request

USER_AGENT = "SpeicherPilot-NationalFleet/1.0 (+https://github.com/cophi-dev/speicherpilot)"
_BACKOFF_S = (15.0, 30.0, 60.0, 120.0, 240.0)


def _parse_retry_after(exc: urllib.error.HTTPError) -> float | None:
    raw = exc.headers.get("Retry-After")
    if not raw:
        return None
    try:
        return max(0.0, float(raw.strip()))
    except ValueError:
        return None


def _backoff_sleep_s(attempt: int, exc: Exception | None) -> float:
    """Wartezeit vor dem nächsten Versuch (mit Jitter)."""
    if isinstance(exc, urllib.error.HTTPError) and exc.code in (429, 503):
        from_header = _parse_retry_after(exc)
        if from_header is not None:
            return from_header + random.uniform(0.0, 2.0)
    base = _BACKOFF_S[min(attempt, len(_BACKOFF_S) - 1)]
    return base + random.uniform(0.0, min(base * 0.15, 8.0))


def urlopen_json(url: str, attempts: int = 5) -> dict:
    last: Exception | None = None
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as exc:  # urllib.HTTPError etc.
            last = exc
            if attempt + 1 < attempts:
                time.sleep(_backoff_sleep_s(attempt, exc))
            else:
                raise
    raise last  # pragma: no cover