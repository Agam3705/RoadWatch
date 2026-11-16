"""
RoadWatch Permissions Module
Role-Based Access Control and Jurisdiction Scoping Permissions.
"""
from rest_framework.permissions import BasePermission


class IsAuthenticatedMongo(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and getattr(request.user, "is_authenticated", False))


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and getattr(request.user, "is_authenticated", False)):
            return False
        return request.user.is_super_admin


class IsAuthority(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and getattr(request.user, "is_authenticated", False)):
            return False
        return request.user.is_authority


class IsAuthorityOfficer(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and getattr(request.user, "is_authenticated", False)):
            return False
        return request.user.has_role("AUTHORITY_OFFICER", "AUTHORITY_SUPERVISOR", "SUPER_ADMIN")


class IsAuthoritySupervisor(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and getattr(request.user, "is_authenticated", False)):
            return False
        return request.user.has_role("AUTHORITY_SUPERVISOR", "SUPER_ADMIN")


class IsContractor(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and getattr(request.user, "is_authenticated", False)):
            return False
        return request.user.is_contractor or request.user.is_super_admin


class IsCitizen(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and getattr(request.user, "is_authenticated", False)):
            return False
        return True  # Any authenticated user has citizen capabilities
