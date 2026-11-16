"""
RoadWatch AI Service Views
Exposes prediction inspection, human-in-the-loop review, and governance endpoints.
"""
from datetime import datetime
from rest_framework.views import APIView
from rest_framework import status
from apps.core.db import (
    ai_jobs_col, ai_predictions_col, complaints_col, parse_object_id, serialize_doc
)
from apps.core.utils import api_success, api_error, record_audit_log
from apps.core.permissions import IsAuthenticatedMongo, IsAuthority, IsSuperAdmin


class AIJobDetailView(APIView):
    permission_classes = [IsAuthenticatedMongo]

    def get(self, request, job_id):
        job = ai_jobs_col().find_one({"job_id": job_id})
        if not job:
            return api_error("AI Job not found.", "NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)
        return api_success(job)


class ComplaintPredictionsView(APIView):
    permission_classes = [IsAuthenticatedMongo]

    def get(self, request, complaint_id):
        preds = list(ai_predictions_col().find({"complaint_id": str(complaint_id)}).sort("created_at", -1))
        return api_success(preds)


class PredictionReviewView(APIView):
    """Allows authorized authority officers to accept, correct, or dismiss AI predictions."""
    permission_classes = [IsAuthority]

    def post(self, request, prediction_id):
        pred_obj_id = parse_object_id(prediction_id)
        prediction = ai_predictions_col().find_one({"_id": pred_obj_id}) if pred_obj_id else None

        if not prediction:
            # Also try matching by job_id
            prediction = ai_predictions_col().find_one({"job_id": prediction_id})

        if not prediction:
            return api_error("Prediction not found.", "NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)

        data = request.data or {}
        decision = data.get("decision", "ACCEPTED").upper()  # ACCEPTED, MODIFIED, DISMISSED
        corrected_category = data.get("corrected_category")
        corrected_severity = data.get("corrected_severity")
        comments = data.get("comments", "")

        update_data = {
            "human_review.status": decision,
            "human_review.reviewed_by": request.user.id,
            "human_review.reviewed_at": datetime.utcnow(),
            "human_review.corrected_category": corrected_category,
            "human_review.corrected_severity": corrected_severity,
            "human_review.comments": comments,
        }

        ai_predictions_col().update_one({"_id": prediction["_id"]}, {"$set": update_data})

        # If modified, optionally update complaint authority_assessment
        complaint_id = prediction.get("complaint_id")
        if complaint_id and decision in ("ACCEPTED", "MODIFIED"):
            new_severity = corrected_severity or prediction.get("severity_estimate", {}).get("level", "MEDIUM")
            complaints_col().update_one(
                {"_id": parse_object_id(complaint_id)},
                {
                    "$set": {
                        "authority_assessment": {
                            "severity": new_severity,
                            "category": corrected_category or prediction.get("predictions", [{}])[0].get("class"),
                            "reviewed_by": request.user.id,
                            "reviewed_at": datetime.utcnow().isoformat(),
                        }
                    }
                }
            )

        record_audit_log(
            request.user.id,
            "AI_PREDICTION_REVIEWED",
            "ai_predictions",
            str(prediction["_id"]),
            {"decision": decision, "corrected_category": corrected_category, "corrected_severity": corrected_severity}
        )

        updated_pred = ai_predictions_col().find_one({"_id": prediction["_id"]})
        return api_success(updated_pred, message="AI prediction review recorded.")


class AIGovernanceView(APIView):
    """Returns AI model governance stats, class distribution, and human-in-the-loop agreement rate."""
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        total_preds = ai_predictions_col().count_documents({})
        reviewed_preds = ai_predictions_col().count_documents({"human_review.status": {"$ne": "PENDING_REVIEW"}})
        accepted_preds = ai_predictions_col().count_documents({"human_review.status": "ACCEPTED"})
        modified_preds = ai_predictions_col().count_documents({"human_review.status": "MODIFIED"})
        dismissed_preds = ai_predictions_col().count_documents({"human_review.status": "DISMISSED"})

        agreement_rate = round((accepted_preds / max(1, reviewed_preds)) * 100, 1)

        # Class counts
        class_pipeline = [
            {"$unwind": "$predictions"},
            {"$group": {"_id": "$predictions.class", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        class_stats = list(ai_predictions_col().aggregate(class_pipeline))

        return api_success({
            "model_name": "RoadWatch-YOLOv8-CivilDamages",
            "active_version": "2026.11.1-prod",
            "total_inferences": total_preds,
            "reviewed_count": reviewed_preds,
            "accepted_count": accepted_preds,
            "modified_count": modified_preds,
            "dismissed_count": dismissed_preds,
            "human_agreement_rate_pct": agreement_rate,
            "detected_classes_distribution": class_stats,
        })
