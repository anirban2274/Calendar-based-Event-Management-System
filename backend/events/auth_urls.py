from django.urls import path

from .views import (
    ChangePasswordView,
    GoogleAuthView,
    LoginView,
    LogoutView,
    RefreshTokenView,
    RegisterView,
    UserProfileView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth_register"),
    path("login/", LoginView.as_view(), name="auth_login"),
    path("logout/", LogoutView.as_view(), name="auth_logout"),
    path("refresh/", RefreshTokenView.as_view(), name="auth_refresh"),
    path("me/", UserProfileView.as_view(), name="auth_me"),
    path("change-password/", ChangePasswordView.as_view(), name="auth_change_password"),
    path("google/", GoogleAuthView.as_view(), name="auth_google"),
]
