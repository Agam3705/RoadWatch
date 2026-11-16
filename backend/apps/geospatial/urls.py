from django.urls import path
from apps.geospatial.views import (
    GeoNearbyComplaintsView, GeoViewportComplaintsView, GeoClustersView,
    GeoHeatmapView, GeoRoadsListView, GeoJurisdictionsListView, GeoRoadHistoryView
)

urlpatterns = [
    path("geo/complaints/nearby/", GeoNearbyComplaintsView.as_view(), name="geo-nearby"),
    path("geo/complaints/viewport/", GeoViewportComplaintsView.as_view(), name="geo-viewport"),
    path("geo/complaints/clusters/", GeoClustersView.as_view(), name="geo-clusters"),
    path("geo/complaints/heatmap/", GeoHeatmapView.as_view(), name="geo-heatmap"),
    path("geo/roads/", GeoRoadsListView.as_view(), name="geo-roads"),
    path("geo/jurisdictions/", GeoJurisdictionsListView.as_view(), name="geo-jurisdictions"),
    path("geo/roads/<str:road_id>/history/", GeoRoadHistoryView.as_view(), name="geo-road-history"),
]
