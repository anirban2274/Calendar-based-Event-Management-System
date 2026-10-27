from django.urls import path

from .views import (
    AdminOverviewView,
    AdminToggleUserActiveView,
    AdminUsersView,
)

urlpatterns = [
    path("overview/", AdminOverviewView.as_view(), name="admin_overview"),
    path("users/", AdminUsersView.as_view(), name="admin_users"),
    path("users/<int:pk>/toggle-active/", AdminToggleUserActiveView.as_view(), name="admin_toggle_active"),
]
