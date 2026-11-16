"""
RoadWatch Geospatial Views
Provides MongoDB 2dsphere spatial queries: nearby radius search, viewport bounding boxes,
clustering, heatmaps, road network geometries, and jurisdiction boundaries.
"""
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework import status

from apps.core.db import (
    complaints_col, roads_col, jurisdictions_col,
    maintenance_tasks_col, parse_object_id, serialize_doc
)
from apps.core.utils import api_success, api_error


class GeoNearbyComplaintsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            lng = float(request.query_params.get("lng", 0))
            lat = float(request.query_params.get("lat", 0))
            radius = float(request.query_params.get("radius", 1500))  # Default 1.5 km
        except (TypeError, ValueError):
            return api_error("Valid lng, lat and radius query parameters required.", "INVALID_COORDINATES")

        query = {
            "location": {
                "$nearSphere": {
                    "$geometry": {
                        "type": "Point",
                        "coordinates": [lng, lat],
                    },
                    "$maxDistance": radius,
                }
            }
        }

        # Apply category or status filters if present
        cat = request.query_params.get("category")
        if cat:
            query["category"] = cat.upper()

        status_param = request.query_params.get("status")
        if status_param:
            query["status"] = status_param.upper()

        cursor = complaints_col().find(query).limit(100)
        items = [serialize_doc(doc) for doc in cursor]
        return api_success({"items": items, "count": len(items), "center": [lng, lat], "radius_meters": radius})


class GeoViewportComplaintsView(APIView):
    """Retrieves complaints within the current map viewport bounding box."""
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            min_lng = float(request.query_params.get("min_lng"))
            min_lat = float(request.query_params.get("min_lat"))
            max_lng = float(request.query_params.get("max_lng"))
            max_lat = float(request.query_params.get("max_lat"))
        except (TypeError, ValueError):
            return api_error("Bounding box coordinates (min_lng, min_lat, max_lng, max_lat) required.", "INVALID_BBOX")

        query = {
            "location": {
                "$geoWithin": {
                    "$box": [
                        [min_lng, min_lat],
                        [max_lng, max_lat]
                    ]
                }
            }
        }

        cat = request.query_params.get("category")
        if cat:
            query["category"] = cat.upper()

        status_param = request.query_params.get("status")
        if status_param:
            query["status"] = status_param.upper()

        cursor = complaints_col().find(query).limit(200)
        items = [serialize_doc(doc) for doc in cursor]
        return api_success({"items": items, "count": len(items)})


class GeoClustersView(APIView):
    """Groups issues into geographical clusters for low-zoom map presentation."""
    permission_classes = [AllowAny]

    def get(self, request):
        pipeline = [
            {
                "$project": {
                    "category": 1,
                    "status": 1,
                    "severity": "$citizen_severity",
                    "lng": {"$arrayElemAt": ["$location.coordinates", 0]},
                    "lat": {"$arrayElemAt": ["$location.coordinates", 1]},
                }
            },
            {
                "$project": {
                    "category": 1,
                    "status": 1,
                    "severity": 1,
                    # Grid rounding for clustering (~500m - 1km cells)
                    "grid_lng": {"$round": ["$lng", 2]},
                    "grid_lat": {"$round": ["$lat", 2]},
                }
            },
            {
                "$group": {
                    "_id": {"lng": "$grid_lng", "lat": "$grid_lat"},
                    "count": {"$sum": 1},
                    "categories": {"$push": "$category"},
                    "unresolved_count": {
                        "$sum": {"$cond": [{"$in": ["$status", ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "ASSIGNED", "IN_PROGRESS", "REOPENED"]]}, 1, 0]}
                    }
                }
            },
            {
                "$project": {
                    "coordinates": ["$_id.lng", "$_id.lat"],
                    "count": 1,
                    "unresolved_count": 1,
                }
            }
        ]
        clusters = list(complaints_col().aggregate(pipeline))
        return api_success(serialize_doc(clusters))


class GeoHeatmapView(APIView):
    """Returns weighted point data for rendering leaflet heatmaps."""
    permission_classes = [AllowAny]

    def get(self, request):
        cursor = complaints_col().find(
            {"location": {"$exists": True}},
            {"location": 1, "citizen_severity": 1, "status": 1}
        ).limit(500)

        heatmap_points = []
        for doc in cursor:
            coords = doc.get("location", {}).get("coordinates", [])
            if len(coords) >= 2:
                sev = doc.get("citizen_severity", "MEDIUM")
                weight = 1.0 if sev == "CRITICAL" else 0.75 if sev == "HIGH" else 0.5 if sev == "MEDIUM" else 0.25
                if doc.get("status") == "RESOLVED":
                    weight *= 0.2  # Dim resolved issues
                heatmap_points.append([coords[1], coords[0], round(weight, 2)])  # [lat, lng, weight]

        return api_success(heatmap_points)


class GeoRoadsListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        query = {}
        jurisdiction_id = request.query_params.get("jurisdiction_id")
        if jurisdiction_id:
            query["jurisdiction_id"] = jurisdiction_id

        roads = list(roads_col().find(query).limit(100))
        return api_success(roads)


class GeoJurisdictionsListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        jurisdictions = list(jurisdictions_col().find({}).limit(50))
        return api_success(jurisdictions)


class GeoRoadHistoryView(APIView):
    """Comprehensive defect, work order, and repair history for a specific road."""
    permission_classes = [AllowAny]

    def get(self, request, road_id):
        obj_id = parse_object_id(road_id)
        road = roads_col().find_one({"_id": obj_id}) if obj_id else None
        if not road:
            return api_error("Road not found.", "NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)

        complaints = list(complaints_col().find({"road_id": str(road["_id"])}).sort("created_at", -1))
        complaint_ids = [str(c["_id"]) for c in complaints]

        tasks = list(maintenance_tasks_col().find({"complaint_id": {"$in": complaint_ids}}).sort("created_at", -1))

        # Calculate recurring defect statistics
        resolved_count = sum(1 for c in complaints if c.get("status") == "RESOLVED")
        open_count = sum(1 for c in complaints if c.get("status") not in ("RESOLVED", "REJECTED", "CLOSED"))

        return api_success({
            "road": serialize_doc(road),
            "complaints_history": serialize_doc(complaints),
            "maintenance_tasks": serialize_doc(tasks),
            "metrics": {
                "total_reported_defects": len(complaints),
                "open_defects": open_count,
                "resolved_defects": resolved_count,
                "recurrence_indicator": "HIGH" if len(complaints) >= 5 else "MODERATE" if len(complaints) >= 2 else "LOW",
            }
        })
