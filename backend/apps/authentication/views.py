"""
RoadWatch Authentication Views
Citizen registration, authentication, token refresh, and user profile management.
"""
from datetime import datetime
from bson import ObjectId
import httpx
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework import status

from apps.core.db import users_col, memberships_col, parse_object_id, serialize_doc
from apps.core.utils import api_success, api_error, record_audit_log
from apps.core.permissions import IsAuthenticatedMongo
from apps.authentication.jwt_auth import (
    hash_password, check_password, generate_tokens, decode_token, MongoUser
)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data or {}
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""
        name = (data.get("name") or "").strip()
        phone = (data.get("phone") or "").strip()
        role = data.get("role", "CITIZEN").upper()

        if not email or "@" not in email:
            return api_error("A valid email address is required.", "INVALID_EMAIL")
        if len(password) < 6:
            return api_error("Password must be at least 6 characters long.", "WEAK_PASSWORD")
        if not name:
            return api_error("Full name is required.", "MISSING_NAME")

        col = users_col()
        if col.find_one({"email": email}):
            return api_error("An account with this email already exists.", "EMAIL_EXISTS")

        # By default citizens are active; authority and contractor roles default to citizen
        # unless an approved membership is granted by an administrator.
        assigned_role = "CITIZEN"
        if role == "SUPER_ADMIN" and col.count_documents({}) == 0:
            # First user on clean system can be super admin
            assigned_role = "SUPER_ADMIN"

        user_doc = {
            "email": email,
            "password_hash": hash_password(password),
            "name": name,
            "phone": phone,
            "role": assigned_role,
            "account_status": "ACTIVE",
            "is_email_verified": True,
            "preferences": {
                "notifications": {"email": True, "in_app": True},
                "language": "en",
            },
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        res = col.insert_one(user_doc)
        user_id = str(res.inserted_id)

        tokens = generate_tokens(user_id, email, assigned_role)
        record_audit_log(user_id, "USER_REGISTERED", "users", user_id, {"email": email, "role": assigned_role})

        return api_success(
            {
                "user": {
                    "id": user_id,
                    "email": email,
                    "name": name,
                    "phone": phone,
                    "role": assigned_role,
                    "roles": [assigned_role],
                },
                "tokens": tokens,
            },
            message="Account successfully registered.",
            status_code=status.HTTP_201_CREATED
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data or {}
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        if not email or not password:
            return api_error("Email and password are required.", "CREDENTIALS_REQUIRED")

        col = users_col()
        user_doc = col.find_one({"email": email})

        if not user_doc or not check_password(password, user_doc.get("password_hash", "")):
            return api_error("Invalid email or password.", "INVALID_CREDENTIALS", status_code=status.HTTP_401_UNAUTHORIZED)

        if user_doc.get("account_status") != "ACTIVE":
            return api_error("Your account has been suspended or deactivated.", "ACCOUNT_INACTIVE", status_code=status.HTTP_403_FORBIDDEN)

        user_id = str(user_doc["_id"])
        memberships = list(memberships_col().find({"user_id": user_id, "status": "ACTIVE"}))
        user = MongoUser(user_doc, memberships)

        tokens = generate_tokens(user_id, email, user.role)
        record_audit_log(user_id, "USER_LOGIN", "users", user_id)

        return api_success(
            {
                "user": user.to_dict(),
                "tokens": tokens,
            },
            message="Login successful."
        )


class TokenRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data or {}
        refresh_token = data.get("refresh_token")
        if not refresh_token:
            return api_error("Refresh token is required.", "REFRESH_TOKEN_REQUIRED")

        try:
            payload = decode_token(refresh_token, token_type="refresh")
            user_id = payload.get("user_id")
            user_doc = users_col().find_one({"_id": parse_object_id(user_id)})
            if not user_doc or user_doc.get("account_status") != "ACTIVE":
                return api_error("User inactive or not found.", "INVALID_TOKEN", status_code=status.HTTP_401_UNAUTHORIZED)

            tokens = generate_tokens(str(user_doc["_id"]), user_doc["email"], user_doc.get("role", "CITIZEN"))
            return api_success(tokens, message="Token refreshed successfully.")
        except Exception as e:
            return api_error(str(e), "INVALID_TOKEN", status_code=status.HTTP_401_UNAUTHORIZED)


class LogoutView(APIView):
    permission_classes = [IsAuthenticatedMongo]

    def post(self, request):
        record_audit_log(request.user.id, "USER_LOGOUT", "users", request.user.id)
        return api_success(message="Logged out successfully.")


class UserProfileView(APIView):
    permission_classes = [IsAuthenticatedMongo]

    def get(self, request):
        return api_success(request.user.to_dict())

    def patch(self, request):
        data = request.data or {}
        update_fields = {}
        for f in ["name", "phone", "preferences"]:
            if f in data:
                update_fields[f] = data[f]

        if update_fields:
            update_fields["updated_at"] = datetime.utcnow()
            users_col().update_one({"_id": parse_object_id(request.user.id)}, {"$set": update_fields})
            record_audit_log(request.user.id, "USER_PROFILE_UPDATED", "users", request.user.id, update_fields)

        updated_doc = users_col().find_one({"_id": parse_object_id(request.user.id)})
        memberships = list(memberships_col().find({"user_id": request.user.id, "status": "ACTIVE"}))
        user = MongoUser(updated_doc, memberships)
        return api_success(user.to_dict(), message="Profile updated successfully.")


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return api_error("Email is required.", "MISSING_EMAIL")
        users_col().update_one({"email": email}, {"$set": {"is_email_verified": True}})
        return api_success(message="Email address verified successfully.")


class PasswordResetView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        new_password = request.data.get("new_password")

        if not email:
            return api_error("Email is required.", "MISSING_EMAIL")

        user_doc = users_col().find_one({"email": email})
        if not user_doc:
            # Prevent email enumeration
            return api_success(message="If the account exists, password reset instructions have been issued.")

        if new_password:
            if len(new_password) < 6:
                return api_error("New password must be at least 6 characters.", "WEAK_PASSWORD")
            users_col().update_one(
                {"_id": user_doc["_id"]},
                {"$set": {"password_hash": hash_password(new_password), "updated_at": datetime.utcnow()}}
            )
            record_audit_log(str(user_doc["_id"]), "PASSWORD_RESET", "users", str(user_doc["_id"]))
            return api_success(message="Password reset successfully.")

        return api_success(message="Password reset requested. Check your email for further instructions.")


class GoogleLoginView(APIView):
    """
    Handles Google OAuth2 login via Google ID token or access token.
    Accepts payload: { "id_token": "..." } or { "credential": "..." } or { "access_token": "..." }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data or {}
        id_token = data.get("id_token") or data.get("credential")
        access_token = data.get("access_token")

        if not id_token and not access_token:
            return api_error("Missing Google authentication token (credential or access_token).", "MISSING_TOKEN")

        google_user = None

        try:
            if id_token:
                # Validate with Google tokeninfo endpoint
                url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
                with httpx.Client(timeout=10.0) as client:
                    resp = client.get(url)
                    if resp.status_code == 200:
                        info = resp.json()
                        expected_aud = getattr(settings, "GOOGLE_CLIENT_ID", "")
                        if expected_aud and info.get("aud") != expected_aud:
                            return api_error("Token audience does not match configured Google Client ID.", "INVALID_AUDIENCE", status_code=status.HTTP_401_UNAUTHORIZED)
                        google_user = {
                            "email": (info.get("email") or "").strip().lower(),
                            "name": info.get("name") or info.get("given_name", ""),
                            "sub": info.get("sub"),
                            "picture": info.get("picture", ""),
                            "email_verified": info.get("email_verified", True) in (True, "true"),
                        }
                    else:
                        return api_error("Invalid or expired Google token.", "INVALID_GOOGLE_TOKEN", status_code=status.HTTP_401_UNAUTHORIZED)
            elif access_token:
                # Validate with Google userinfo endpoint
                url = "https://www.googleapis.com/oauth2/v3/userinfo"
                headers = {"Authorization": f"Bearer {access_token}"}
                with httpx.Client(timeout=10.0) as client:
                    resp = client.get(url, headers=headers)
                    if resp.status_code == 200:
                        info = resp.json()
                        google_user = {
                            "email": (info.get("email") or "").strip().lower(),
                            "name": info.get("name", ""),
                            "sub": info.get("sub"),
                            "picture": info.get("picture", ""),
                            "email_verified": info.get("email_verified", True) in (True, "true"),
                        }
                    else:
                        return api_error("Invalid Google access token.", "INVALID_GOOGLE_TOKEN", status_code=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return api_error(f"Error communicating with Google OAuth servers: {str(e)}", "GOOGLE_AUTH_ERROR")

        if not google_user or not google_user.get("email"):
            return api_error("Unable to retrieve email from Google profile.", "NO_EMAIL")

        email = google_user["email"]
        col = users_col()
        user_doc = col.find_one({"email": email})
        now = datetime.utcnow()

        if user_doc:
            user_id = str(user_doc["_id"])
            if user_doc.get("account_status") != "ACTIVE":
                return api_error("Your account has been deactivated.", "ACCOUNT_INACTIVE", status_code=status.HTTP_403_FORBIDDEN)
            col.update_one(
                {"_id": user_doc["_id"]},
                {"$set": {
                    "google_id": google_user.get("sub"),
                    "avatar_url": google_user.get("picture") or user_doc.get("avatar_url"),
                    "is_email_verified": True,
                    "updated_at": now,
                }}
            )
            user_doc = col.find_one({"_id": user_doc["_id"]})
        else:
            # First user on empty DB can be super admin, otherwise citizen
            assigned_role = "SUPER_ADMIN" if col.count_documents({}) == 0 else "CITIZEN"
            new_doc = {
                "email": email,
                "name": google_user.get("name") or email.split("@")[0],
                "phone": "",
                "role": assigned_role,
                "google_id": google_user.get("sub"),
                "avatar_url": google_user.get("picture", ""),
                "account_status": "ACTIVE",
                "is_email_verified": True,
                "preferences": {
                    "notifications": {"email": True, "in_app": True},
                    "language": "en",
                },
                "created_at": now,
                "updated_at": now,
            }
            res = col.insert_one(new_doc)
            user_id = str(res.inserted_id)
            user_doc = col.find_one({"_id": res.inserted_id})
            record_audit_log(user_id, "USER_REGISTERED_GOOGLE", "users", user_id, {"email": email, "role": assigned_role})

        memberships = list(memberships_col().find({"user_id": user_id, "status": "ACTIVE"}))
        user = MongoUser(user_doc, memberships)
        tokens = generate_tokens(user_id, email, user.role)

        record_audit_log(user_id, "USER_GOOGLE_LOGIN", "users", user_id)

        return api_success(
            {
                "user": user.to_dict(),
                "tokens": tokens,
            },
            message="Google authentication successful."
        )
