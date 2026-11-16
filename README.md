# RoadWatch

RoadWatch is a small, dependency-free road monitoring service. It accepts road
condition reports and provides a dashboard and JSON API for viewing them.

## Run

Requires Python 3.10 or newer:

```bash
python3 roadwatch.py
```

Open <http://127.0.0.1:8080/> to view the dashboard. Reports are kept in
memory for the lifetime of the process.

Create a report:

```bash
curl -X POST http://127.0.0.1:8080/api/reports \
  -H 'Content-Type: application/json' \
  -d '{"road":"A1","location":"Junction 4","condition":"slow","severity":"medium","description":"Queueing traffic"}'
```

Valid conditions are `clear`, `slow`, `blocked`, and `hazard`. Valid
severities are `low`, `medium`, `high`, and `critical`. Use
`GET /api/reports?road=A1` to filter reports by road.

## Test

```bash
python3 -m unittest -v
```