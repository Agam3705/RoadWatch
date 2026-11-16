"""
RoadWatch Authentication Module
JWT Authentication, password hashing with bcrypt, token verification, and user resolution.
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import jwt
import bcrypt
from bson import ObjectId
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from apps.core.db import users_col, memberships_col, parse_object_id


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def check_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def generate_tokens(user_id: str, email: str, role: str) -> Dict[str, str]:
    now = datetime.utcnow()
    exp_access = now + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    exp_refresh = now + timedelta(days=30)

    access_payload = {
        "user_id": str(user_id),
        "email": email,
        "role": role,
        "type": "access",
        "exp": exp_access,
        "iat": now,
    }

    refresh_payload = {
        "user_id": str(user_id),
        "type": "refresh",
        "exp": exp_refresh,
        "iat": now,
    }

    access_token = jwt.encode(access_payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    refresh_token = jwt.encode(refresh_payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": settings.JWT_EXPIRATION_HOURS * 3600,
    }


def decode_token(token: str, token_type: str = "access") -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != token_type:
            raise AuthenticationFailed(f"Invalid token type. Expected '{token_type}'.")
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthenticationFailed("Token has expired.")
    except jwt.InvalidTokenError:
        raise AuthenticationFailed("Invalid or malformed token.")


class MongoUser:
    """Lightweight user model representing an authenticated user in MongoDB."""

    def __init__(self, doc: Dict[str, Any], memberships: Optional[List[Dict[str, Any]]] = None):
        self.id = str(doc.get("_id") or doc.get("id"))
        self.email = doc.get("email", "")
        self.name = doc.get("name", "")
        self.phone = doc.get("phone", "")
        self.account_status = doc.get("account_status", "ACTIVE")
        self.is_email_verified = doc.get("is_email_verified", True)
        self.role = doc.get("role", "CITIZEN")

        self.memberships = memberships or []
        self.roles = {self.role}
        self.jurisdiction_ids = set()
        self.organization_ids = set()

        for m in self.memberships:
            if m.get("status") == "ACTIVE":
                r = m.get("role")
                if r:
                    self.roles.add(r)
                org_id = m.get("organization_id")
                if org_id:
                    self.organization_ids.add(str(org_id))
                for j_id in m.get("jurisdiction_ids", []):
                    self.jurisdiction_ids.add(str(j_id))

    @property
    def is_authenticated(self) -> bool:
        return True

    @property
    def is_super_admin(self) -> bool:
        return "SUPER_ADMIN" in self.roles or self.role == "SUPER_ADMIN"

    @property
    def is_authority(self) -> bool:
        return bool(self.roles.intersection({"AUTHORITY_OFFICER", "AUTHORITY_SUPERVISOR", "SUPER_ADMIN"}))

    @property
    def is_contractor(self) -> bool:
        return bool(self.roles.intersection({"CONTRACTOR_MANAGER", "CONTRACTOR_FIELD"}))

    def has_role(self, *role_names: str) -> bool:
        if self.is_super_admin:
            return True
        return bool(self.roles.intersection(set(role_names)))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "phone": self.phone,
            "role": self.role,
            "roles": list(self.roles),
            "account_status": self.account_status,
            "is_email_verified": self.is_email_verified,
            "organization_ids": list(self.organization_ids),
            "jurisdiction_ids": list(self.jurisdiction_ids),
        }


class MongoDBJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return None

        token = parts[1]
        payload = decode_token(token, token_type="access")
        user_id = payload.get("user_id")

        if not user_id:
            raise AuthenticationFailed("Invalid token payload: missing user_id.")

        u_id = parse_object_id(user_id)
        user_doc = users_col().find_one({"_id": u_id})

        if not user_doc:
            raise AuthenticationFailed("User not found or deleted.")

        if user_doc.get("account_status") != "ACTIVE":
            raise AuthenticationFailed("User account is suspended or inactive.")

        # Fetch active memberships
        memberships = list(memberships_col().find({"user_id": str(user_id), "status": "ACTIVE"}))

        user = MongoUser(user_doc, memberships)
        return (user, token)
