import json
import threading
import unittest
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer

from roadwatch import RoadMonitor, create_handler


class RoadMonitorTests(unittest.TestCase):
    def test_add_and_filter_reports(self):
        monitor = RoadMonitor()
        report = monitor.add_report(
            road="A1", location="Junction 4", condition="hazard", severity="high"
        )
        self.assertEqual(report.road, "A1")
        self.assertEqual([report], monitor.reports("a1"))

    def test_rejects_invalid_condition(self):
        with self.assertRaises(ValueError):
            RoadMonitor().add_report(
                road="A1", location="Junction 4", condition="unknown", severity="low"
            )


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), create_handler(RoadMonitor()))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.thread.join()
        cls.server.server_close()

    def request(self, method, path, body=None):
        connection = HTTPConnection(*self.server.server_address)
        headers = {"Content-Type": "application/json"} if body else {}
        connection.request(method, path, body=json.dumps(body) if body else None, headers=headers)
        response = connection.getresponse()
        payload = json.loads(response.read())
        connection.close()
        return response.status, payload

    def test_create_and_list_report(self):
        status, created = self.request(
            "POST",
            "/api/reports",
            {"road": "B2", "location": "Bridge", "condition": "blocked", "severity": "critical"},
        )
        self.assertEqual(status, 201)
        self.assertEqual(self.request("GET", "/api/reports")[1][0]["report_id"], created["report_id"])


if __name__ == "__main__":
    unittest.main()
