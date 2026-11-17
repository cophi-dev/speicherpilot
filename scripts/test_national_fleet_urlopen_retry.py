"""Unit-Tests für energy-charts-Retry (ohne highspy)."""
from __future__ import annotations

import importlib.util
import json
import sys
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
HTTP_MOD = ROOT / "scripts/national_fleet_http.py"


def _load_http():
    spec = importlib.util.spec_from_file_location("national_fleet_http", HTTP_MOD)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


class UrlopenRetryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.mod = _load_http()

    def test_retry_after_on_429(self) -> None:
        payload = json.dumps({"ok": True}).encode()
        responses = [
            self.mod.urllib.error.HTTPError(
                "https://example.test",
                429,
                "Too Many Requests",
                hdrs={"Retry-After": "7"},
                fp=None,
            ),
            BytesIO(payload),
        ]

        def fake_urlopen(req, timeout=120):
            item = responses.pop(0)
            if isinstance(item, Exception):
                raise item
            return item

        with patch.object(self.mod.urllib.request, "urlopen", side_effect=fake_urlopen):
            with patch.object(self.mod.time, "sleep") as sleep_mock:
                out = self.mod.urlopen_json("https://example.test/x")
        self.assertEqual(out, {"ok": True})
        sleep_mock.assert_called_once()
        slept = sleep_mock.call_args[0][0]
        self.assertGreaterEqual(slept, 7.0)
        self.assertLess(slept, 10.0)

    def test_exponential_backoff_without_retry_after(self) -> None:
        err = self.mod.urllib.error.HTTPError(
            "https://example.test",
            503,
            "Service Unavailable",
            hdrs={},
            fp=None,
        )

        with patch.object(
            self.mod.urllib.request,
            "urlopen",
            side_effect=err,
        ):
            with patch.object(self.mod.time, "sleep") as sleep_mock:
                with self.assertRaises(self.mod.urllib.error.HTTPError):
                    self.mod.urlopen_json("https://example.test/x", attempts=3)
        self.assertEqual(sleep_mock.call_count, 2)
        first = sleep_mock.call_args_list[0][0][0]
        second = sleep_mock.call_args_list[1][0][0]
        self.assertGreaterEqual(first, 15.0)
        self.assertLess(first, 25.0)
        self.assertGreaterEqual(second, 30.0)
        self.assertLess(second, 40.0)

    def test_sets_user_agent(self) -> None:
        captured: list[object] = []

        def fake_urlopen(req, timeout=120):
            captured.append(req)
            return BytesIO(b'{"a":1}')

        with patch.object(self.mod.urllib.request, "urlopen", side_effect=fake_urlopen):
            self.mod.urlopen_json("https://example.test/y")
        self.assertEqual(len(captured), 1)
        req = captured[0]
        ua = req.get_header("User-Agent") or req.get_header("User-agent")
        self.assertIsNotNone(ua)
        self.assertIn("SpeicherPilot-NationalFleet", ua or "")


if __name__ == "__main__":
    unittest.main()