from django.contrib import admin
from django.urls import include, path
from events.views import HealthCheckView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", HealthCheckView.as_view(), name="health_check"),
    path("api/auth/", include("events.auth_urls")),
    path("api/admin/", include("events.admin_urls")),
    path("api/events/", include("events.urls")),
    path("api-auth/", include("rest_framework.urls")),
]
