from django.urls import path
from apps.analytics.views import (
    AnalyticsOverviewView, AnalyticsRoadsView, AnalyticsWardsView,
    AnalyticsContractorsView, AnalyticsTrendsView, AuditLogsListView,
    AdminOrganizationsView, AdminOrganizationVerifyView, AdminSettingsView
)

urlpatterns = [
    path("analytics/overview/", AnalyticsOverviewView.as_view(), name="analytics-overview"),
    path("analytics/roads/", AnalyticsRoadsView.as_view(), name="analytics-roads"),
    path("analytics/wards/", AnalyticsWardsView.as_view(), name="analytics-wards"),
    path("analytics/contractors/", AnalyticsContractorsView.as_view(), name="analytics-contractors"),
    path("analytics/trends/", AnalyticsTrendsView.as_view(), name="analytics-trends"),
    path("admin/audit-logs/", AuditLogsListView.as_view(), name="admin-audit-logs"),
    path("admin/organizations/", AdminOrganizationsView.as_view(), name="admin-organizations"),
    path("admin/organizations/<str:org_id>/verify/", AdminOrganizationVerifyView.as_view(), name="admin-org-verify"),
    path("admin/settings/<str:key>/", AdminSettingsView.as_view(), name="admin-settings"),
]
