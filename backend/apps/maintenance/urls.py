from django.urls import path
from apps.maintenance.views import (
    MaintenanceTaskListCreateView, TaskAssignContractorView,
    ContractorTasksListView, ContractorTaskDetailView,
    ContractorTaskAcceptView, ContractorTaskDeclineView,
    ContractorTaskProgressView, ContractorSubmitEvidenceView,
    VerificationPendingListView, VerificationApproveView,
    VerificationRejectView, CitizenVerificationFeedbackView
)

urlpatterns = [
    # Authority Work Order endpoints
    path("maintenance/tasks/", MaintenanceTaskListCreateView.as_view(), name="maintenance-tasks"),
    path("maintenance/tasks/<str:task_id>/assign/", TaskAssignContractorView.as_view(), name="task-assign"),

    # Contractor Task endpoints
    path("contractor/tasks/", ContractorTasksListView.as_view(), name="contractor-tasks"),
    path("contractor/tasks/<str:task_id>/", ContractorTaskDetailView.as_view(), name="contractor-task-detail"),
    path("contractor/tasks/<str:task_id>/accept/", ContractorTaskAcceptView.as_view(), name="task-accept"),
    path("contractor/tasks/<str:task_id>/decline/", ContractorTaskDeclineView.as_view(), name="task-decline"),
    path("contractor/tasks/<str:task_id>/progress/", ContractorTaskProgressView.as_view(), name="task-progress"),
    path("contractor/tasks/<str:task_id>/evidence/", ContractorSubmitEvidenceView.as_view(), name="task-evidence"),

    # Verification endpoints
    path("verification/pending/", VerificationPendingListView.as_view(), name="verification-pending"),
    path("verification/<str:task_id>/approve/", VerificationApproveView.as_view(), name="verification-approve"),
    path("verification/<str:task_id>/reject/", VerificationRejectView.as_view(), name="verification-reject"),
    path("verification/<str:task_id>/citizen-feedback/", CitizenVerificationFeedbackView.as_view(), name="verification-citizen-feedback"),
]
