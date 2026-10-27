import json
import urllib.parse
import urllib.request
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import connection, transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Event
from .pagination import StandardResultsSetPagination
from .serializers import (
    ChangePasswordSerializer,
    EventSerializer,
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .tokens import (
    generate_access_token,
    generate_token_pair,
    verify_refresh_token,
)

User = get_user_model()


class HealthCheckView(APIView):
    """Lightweight health check endpoint for deployment monitoring."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        db_ok = False
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                row = cursor.fetchone()
                if row and row[0] == 1:
                    db_ok = True
        except Exception as exc:
            return Response(
                {"status": "degraded", "database": "disconnected", "error": str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "status": "ok",
                "database": "connected" if db_ok else "unknown",
                "timestamp": timezone.now().isoformat(),
            },
            status=status.HTTP_200_OK,
        )


class RegisterView(APIView):
    """Register a new user account and return an authentication token pair."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        tokens = generate_token_pair(user)
        user_data = UserSerializer(user).data

        return Response(
            {
                "user": user_data,
                "tokens": tokens,
                "message": "Account created successfully.",
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """Authenticate with username/email and password, returning tokens and profile."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        tokens = generate_token_pair(user)
        user_data = UserSerializer(user).data

        return Response(
            {
                "user": user_data,
                "tokens": tokens,
                "message": "Login successful.",
            },
            status=status.HTTP_200_OK,
        )


class RefreshTokenView(APIView):
    """Exchange a valid refresh token for a newly issued access token."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh_token")
        if not refresh_token:
            return Response(
                {"detail": "refresh_token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = verify_refresh_token(refresh_token)
        if not user:
            return Response(
                {"detail": "Refresh token is invalid or expired. Please log in again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        new_access_token = generate_access_token(user)
        return Response(
            {
                "access_token": new_access_token,
                "token_type": "Bearer",
                "expires_in": getattr(settings, "ACCESS_TOKEN_LIFETIME", 3600),
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """Acknowledge user logout. Client discards local tokens."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        return Response(
            {"message": "Logged out successfully."},
            status=status.HTTP_200_OK,
        )


class UserProfileView(APIView):
    """Retrieve or update the authenticated user's profile."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    """Change the authenticated user's password."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save()

        # Issue new tokens since credentials changed
        tokens = generate_token_pair(user)
        return Response(
            {
                "message": "Password changed successfully.",
                "tokens": tokens,
            },
            status=status.HTTP_200_OK,
        )


class GoogleAuthView(APIView):
    """
    Authenticate or register via Google Identity Services (OAuth / OpenID Connect).
    Validates the id_token directly with Google's verification endpoint.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        id_token = request.data.get("id_token") or request.data.get("credential")
        if not id_token:
            return Response(
                {"detail": "Google id_token or credential is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        google_client_id = getattr(settings, "GOOGLE_CLIENT_ID", "").strip()
        if not google_client_id:
            return Response(
                {
                    "detail": "Google authentication is not configured on this server. "
                    "Set GOOGLE_CLIENT_ID in the backend environment."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify Google ID token via Google's tokeninfo API
        try:
            url = f"https://oauth2.googleapis.com/tokeninfo?id_token={urllib.parse.quote(id_token)}"
            req = urllib.request.Request(url, headers={"User-Agent": "Evently-Auth/1.0"})
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status != 200:
                    return Response(
                        {"detail": "Failed to verify Google token with provider."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                payload = json.loads(response.read().decode("utf-8"))
        except Exception as exc:
            return Response(
                {"detail": f"Google token verification failed: {str(exc)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate issuer and audience
        aud = payload.get("aud")
        if aud != google_client_id:
            return Response(
                {"detail": "Google token audience mismatch."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = payload.get("email")
        email_verified = payload.get("email_verified")
        if not email or str(email_verified).lower() not in ("true", "1"):
            return Response(
                {"detail": "Google account email is not verified."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        name = payload.get("name", "")
        first_name = payload.get("given_name", "")
        last_name = payload.get("family_name", "")
        google_sub = payload.get("sub", "")

        with transaction.atomic():
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                # Generate unique username from email
                base_username = email.split("@")[0]
                username = base_username
                idx = 1
                while User.objects.filter(username__iexact=username).exists():
                    username = f"{base_username}{idx}"
                    idx += 1

                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                )
                user.set_unusable_password()
                user.save()
            else:
                if not user.is_active:
                    return Response(
                        {"detail": "This account is disabled."},
                        status=status.HTTP_403_FORBIDDEN,
                    )

        tokens = generate_token_pair(user)
        user_data = UserSerializer(user).data

        return Response(
            {
                "user": user_data,
                "tokens": tokens,
                "message": "Authenticated with Google successfully.",
            },
            status=status.HTTP_200_OK,
        )


class EventViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for Calendar Events.
    Strictly isolated per authenticated user: each user only sees and modifies their own events.
    """

    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "title",
        "description",
        "location",
        "category",
    ]

    ordering_fields = [
        "title",
        "start_datetime",
        "end_datetime",
        "created_at",
    ]

    ordering = ["start_datetime"]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Event.objects.none()

        # Staff can inspect all events if query param ?all=true is passed
        if user.is_staff and self.request.query_params.get("all") == "true":
            qs = Event.objects.select_related("organizer").all()
        else:
            qs = Event.objects.select_related("organizer").filter(organizer=user)

        params = self.request.query_params

        category = params.get("category")
        if category:
            qs = qs.filter(category=category)

        date_from = params.get("from")
        if date_from:
            qs = qs.filter(start_datetime__date__gte=date_from)

        date_to = params.get("to")
        if date_to:
            qs = qs.filter(start_datetime__date__lte=date_to)

        month = params.get("month")
        year = params.get("year")
        if month and year:
            try:
                qs = qs.filter(start_datetime__year=int(year), start_datetime__month=int(month))
            except ValueError:
                pass

        event_type = params.get("type")
        now = timezone.now()
        if event_type == "upcoming":
            qs = qs.filter(end_datetime__gte=now)
        elif event_type == "past":
            qs = qs.filter(end_datetime__lt=now)

        return qs

    def perform_create(self, serializer):
        # Automatically set organizer from authenticated request user
        serializer.save(organizer=self.request.user)

    @action(detail=False, methods=["get"], url_path="dashboard-stats")
    def dashboard_stats(self, request):
        """
        Calculate genuine aggregated metrics for the authenticated user from the database.
        """
        user = request.user
        user_events = Event.objects.filter(organizer=user)
        now = timezone.now()

        total_events = user_events.count()
        upcoming_count = user_events.filter(end_datetime__gte=now).count()
        past_count = user_events.filter(end_datetime__lt=now).count()

        # Current week range (Monday to Sunday)
        start_of_week = now.date() - timedelta(days=now.weekday())
        end_of_week = start_of_week + timedelta(days=7)
        this_week_count = user_events.filter(
            start_datetime__date__gte=start_of_week,
            start_datetime__date__lt=end_of_week,
        ).count()

        # Current month range
        this_month_count = user_events.filter(
            start_datetime__year=now.year,
            start_datetime__month=now.month,
        ).count()

        # Category breakdown
        category_counts = (
            user_events.values("category")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        categories_dict = {item["category"]: item["count"] for item in category_counts}

        # Next 5 upcoming events preview
        next_events = (
            user_events.filter(end_datetime__gte=now)
            .order_by("start_datetime")[:5]
        )
        preview_data = EventSerializer(next_events, many=True).data

        return Response(
            {
                "total_events": total_events,
                "upcoming_count": upcoming_count,
                "past_count": past_count,
                "this_week_count": this_week_count,
                "this_month_count": this_month_count,
                "categories": categories_dict,
                "upcoming_preview": preview_data,
            },
            status=status.HTTP_200_OK,
        )


class AdminOverviewView(APIView):
    """Administrative overview for staff users."""

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        total_events = Event.objects.count()

        recent_users = (
            User.objects.values("id", "username", "email", "date_joined", "is_staff", "is_active")
            .order_by("-date_joined")[:10]
        )

        recent_events = (
            Event.objects.select_related("organizer")
            .values("id", "title", "category", "organizer__username", "start_datetime", "created_at")
            .order_by("-created_at")[:10]
        )

        return Response(
            {
                "total_users": total_users,
                "active_users": active_users,
                "total_events": total_events,
                "recent_users": list(recent_users),
                "recent_events": list(recent_events),
            },
            status=status.HTTP_200_OK,
        )


class AdminUsersView(APIView):
    """Administrative user management listing."""

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        users = (
            User.objects.annotate(event_count=Count("events"))
            .values(
                "id",
                "username",
                "email",
                "is_staff",
                "is_superuser",
                "is_active",
                "date_joined",
                "event_count",
            )
            .order_by("-date_joined")
        )
        return Response(list(users), status=status.HTTP_200_OK)


class AdminToggleUserActiveView(APIView):
    """Toggle user active state (cannot deactivate superusers or self)."""

    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        target_user = User.objects.filter(pk=pk).first()
        if not target_user:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if target_user.pk == request.user.pk:
            return Response(
                {"detail": "You cannot deactivate your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if target_user.is_superuser:
            return Response(
                {"detail": "Cannot change active status of superusers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_user.is_active = not target_user.is_active
        target_user.save()

        return Response(
            {
                "id": target_user.id,
                "username": target_user.username,
                "is_active": target_user.is_active,
                "message": f"User {'activated' if target_user.is_active else 'deactivated'} successfully.",
            },
            status=status.HTTP_200_OK,
        )
