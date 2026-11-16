#!/usr/bin/env python3
"""A small, dependency-free road condition monitoring service."""

from __future__ import annotations

import argparse
import json
import threading
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import parse_qs, urlparse
from uuid import uuid4


CONDITIONS = {"clear", "slow", "blocked", "hazard"}
SEVERITIES = {"low", "medium", "high", "critical"}


@dataclass(frozen=True)
class RoadReport:
    road: str
    location: str
    condition: str
    severity: str
    description: str
    reported_at: str
    report_id: str

    def as_dict(self) -> dict[str, str]:
        return asdict(self)


class RoadMonitor:
    """Thread-safe in-memory store for the latest road observations."""

    def __init__(self) -> None:
        self._reports: list[RoadReport] = []
        self._lock = threading.Lock()

    def add_report(
        self,
        *,
        road: str,
        location: str,
        condition: str,
        severity: str,
        description: str = "",
    ) -> RoadReport:
        road = road.strip()
        location = location.strip()
        condition = condition.strip().lower()
        severity = severity.strip().lower()
        description = description.strip()
        if not road or not location:
            raise ValueError("road and location are required")
        if condition not in CONDITIONS:
            raise ValueError(f"condition must be one of: {', '.join(sorted(CONDITIONS))}")
        if severity not in SEVERITIES:
            raise ValueError(f"severity must be one of: {', '.join(sorted(SEVERITIES))}")

        report = RoadReport(
            road=road,
            location=location,
            condition=condition,
            severity=severity,
            description=description,
            reported_at=datetime.now(timezone.utc).isoformat(),
            report_id=str(uuid4()),
        )
        with self._lock:
            self._reports.append(report)
        return report

    def reports(self, road: str | None = None) -> list[RoadReport]:
        with self._lock:
            reports = list(self._reports)
        if road:
            reports = [report for report in reports if report.road.casefold() == road.casefold()]
        return list(reversed(reports))


DASHBOARD = """<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>RoadWatch</title>
<style>
body { font: 16px system-ui, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; }
table { border-collapse: collapse; width: 100%; } th, td { padding: .6rem; border-bottom: 1px solid #ddd; text-align: left; }
.critical, .high { color: #b42318; font-weight: 600; } .empty { color: #667085; }
</style>
<h1>RoadWatch</h1><p>Current road condition reports</p>
<table><thead><tr><th>Road</th><th>Location</th><th>Condition</th><th>Severity</th><th>Reported</th></tr></thead>
<tbody id="reports"><tr><td class="empty" colspan="5">Loading…</td></tr></tbody></table>
<script>
fetch('/api/reports').then(r => r.json()).then(reports => {
  const body = document.getElementById('reports');
  body.replaceChildren();
  if (!reports.length) {
    const row = body.insertRow(); const cell = row.insertCell();
    cell.colSpan = 5; cell.className = 'empty'; cell.textContent = 'No reports yet.';
    return;
  }
  reports.forEach(report => {
    const row = body.insertRow();
    [report.road, report.location, report.condition, report.severity,
     new Date(report.reported_at).toLocaleString()].forEach(value => {
      const cell = row.insertCell(); cell.textContent = value;
    });
    row.className = report.severity;
  });
}).catch(() => document.getElementById('reports').textContent = 'Unable to load reports.');
</script>
"""


def create_handler(monitor: RoadMonitor) -> type[BaseHTTPRequestHandler]:
    class Handler(BaseHTTPRequestHandler):
        def _send(self, status: int, body: Any, content_type: str = "application/json") -> None:
            encoded = body.encode() if isinstance(body, str) else json.dumps(body).encode()
            self.send_response(status)
            self.send_header("Content-Type", f"{content_type}; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)

        def do_GET(self) -> None:
            parsed = urlparse(self.path)
            if parsed.path == "/":
                self._send(200, DASHBOARD, "text/html")
            elif parsed.path == "/health":
                self._send(200, {"status": "ok"})
            elif parsed.path == "/api/reports":
                road = parse_qs(parsed.query).get("road", [None])[0]
                self._send(200, [report.as_dict() for report in monitor.reports(road)])
            else:
                self._send(404, {"error": "not found"})

        def do_POST(self) -> None:
            if urlparse(self.path).path != "/api/reports":
                self._send(404, {"error": "not found"})
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                payload = json.loads(self.rfile.read(length))
                report = monitor.add_report(**payload)
            except (ValueError, TypeError, json.JSONDecodeError) as error:
                self._send(400, {"error": str(error)})
                return
            self._send(201, report.as_dict())

        def log_message(self, format: str, *args: Any) -> None:
            return

    return Handler


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the RoadWatch monitoring service")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.host, args.port), create_handler(RoadMonitor()))
    print(f"RoadWatch listening on http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
