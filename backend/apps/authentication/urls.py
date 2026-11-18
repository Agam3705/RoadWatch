from django.urls import path
from apps.authentication.views import (
    RegisterView, LoginView, TokenRefreshView, LogoutView,
    UserProfileView, VerifyEmailView, PasswordResetView, GoogleLoginView
)

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/google/", GoogleLoginView.as_view(), name="auth-google"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="auth-token-refresh"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/verify-email/", VerifyEmailView.as_view(), name="auth-verify-email"),
    path("auth/password/reset/", PasswordResetView.as_view(), name="auth-password-reset"),
    path("users/me/", UserProfileView.as_view(), name="user-me"),
]
