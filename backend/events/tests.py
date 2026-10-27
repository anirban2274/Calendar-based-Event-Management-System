from datetime import timedelta
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Event
from .tokens import generate_token_pair

User = get_user_model()


class EventlyTests(APITestCase):
    def setUp(self):
        # Create standard test users
        self.user1 = User.objects.create_user(
            username="alice",
            email="alice@example.com",
            password="AlicePassword123!",
        )
        self.user2 = User.objects.create_user(
            username="bob",
            email="bob@example.com",
            password="BobPassword123!",
        )
        self.admin = User.objects.create_superuser(
            username="superadmin",
            email="admin@example.com",
            password="SuperPassword123!",
        )

        self.tokens1 = generate_token_pair(self.user1)
        self.tokens2 = generate_token_pair(self.user2)
        self.tokens_admin = generate_token_pair(self.admin)

        self.now = timezone.now()
        # Seed events for user 1
        self.event_user1 = Event.objects.create(
            title="Alice's Event",
            description="Alice planning session",
            start_datetime=self.now + timedelta(days=1),
            end_datetime=self.now + timedelta(days=1, hours=2),
            location="Room 101",
            category="personal",
            organizer=self.user1,
        )
        # Seed events for user 2
        self.event_user2 = Event.objects.create(
            title="Bob's Event",
            description="Bob study group",
            start_datetime=self.now + timedelta(days=2),
            end_datetime=self.now + timedelta(days=2, hours=1),
            location="Library",
            category="college",
            organizer=self.user2,
        )

    def auth_headers(self, token):
        return {"HTTP_AUTHORIZATION": f"Bearer {token}"}

    # ==========================================
    # 1. Health Check
    # ==========================================
    def test_health_check(self):
        response = self.client.get(reverse("health_check"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("status"), "ok")
        self.assertEqual(response.data.get("database"), "connected")

    # ==========================================
    # 2. Authentication: Register
    # ==========================================
    def test_register_success(self):
        url = reverse("auth_register")
        payload = {
            "username": "charlie",
            "email": "charlie@example.com",
            "password": "CharliePassword123!",
            "confirm_password": "CharliePassword123!",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("tokens", response.data)
        self.assertIn("access_token", response.data["tokens"])
        self.assertEqual(response.data["user"]["username"], "charlie")

    def test_register_mismatched_password(self):
        url = reverse("auth_register")
        payload = {
            "username": "charlie2",
            "email": "charlie2@example.com",
            "password": "Password123!",
            "confirm_password": "Password456!",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("confirm_password", response.data)

    def test_register_duplicate_username(self):
        url = reverse("auth_register")
        payload = {
            "username": "alice",
            "email": "alice_unique@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ==========================================
    # 3. Authentication: Login & Refresh
    # ==========================================
    def test_login_success_username(self):
        url = reverse("auth_login")
        response = self.client.post(
            url,
            {"username_or_email": "alice", "password": "AlicePassword123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access_token", response.data["tokens"])

    def test_login_success_email(self):
        url = reverse("auth_login")
        response = self.client.post(
            url,
            {"username_or_email": "alice@example.com", "password": "AlicePassword123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access_token", response.data["tokens"])

    def test_login_invalid_password(self):
        url = reverse("auth_login")
        response = self.client.post(
            url,
            {"username_or_email": "alice", "password": "WrongPassword!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_token_refresh(self):
        url = reverse("auth_refresh")
        refresh_token = self.tokens1["refresh_token"]
        response = self.client.post(url, {"refresh_token": refresh_token}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access_token", response.data)

    def test_token_refresh_invalid(self):
        url = reverse("auth_refresh")
        response = self.client.post(url, {"refresh_token": "invalid.fake.token"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ==========================================
    # 4. Profile & Password Change
    # ==========================================
    def test_user_profile(self):
        url = reverse("auth_me")
        response = self.client.get(url, **self.auth_headers(self.tokens1["access_token"]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "alice")
        self.assertEqual(response.data["email"], "alice@example.com")

    def test_change_password(self):
        url = reverse("auth_change_password")
        payload = {
            "old_password": "AlicePassword123!",
            "new_password": "NewAlicePassword456!",
            "confirm_password": "NewAlicePassword456!",
        }
        response = self.client.post(
            url, payload, format="json", **self.auth_headers(self.tokens1["access_token"])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("tokens", response.data)

        # Confirm new password works
        login_resp = self.client.post(
            reverse("auth_login"),
            {"username_or_email": "alice", "password": "NewAlicePassword456!"},
            format="json",
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)

    # ==========================================
    # 5. Event CRUD & User Ownership Isolation
    # ==========================================
    def test_unauthenticated_cannot_access_events(self):
        url = "/api/events/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_only_sees_own_events(self):
        url = "/api/events/"
        # Alice requests events
        response_alice = self.client.get(url, **self.auth_headers(self.tokens1["access_token"]))
        self.assertEqual(response_alice.status_code, status.HTTP_200_OK)
        results_alice = (
            response_alice.data["results"]
            if "results" in response_alice.data
            else response_alice.data
        )
        titles_alice = [e["title"] for e in results_alice]
        self.assertIn("Alice's Event", titles_alice)
        self.assertNotIn("Bob's Event", titles_alice)

        # Bob requests events
        response_bob = self.client.get(url, **self.auth_headers(self.tokens2["access_token"]))
        self.assertEqual(response_bob.status_code, status.HTTP_200_OK)
        results_bob = (
            response_bob.data["results"]
            if "results" in response_bob.data
            else response_bob.data
        )
        titles_bob = [e["title"] for e in results_bob]
        self.assertIn("Bob's Event", titles_bob)
        self.assertNotIn("Alice's Event", titles_bob)

    def test_user_cannot_access_other_users_event_detail(self):
        # Bob tries to access Alice's event directly by ID
        url = f"/api/events/{self.event_user1.id}/"
        response = self.client.get(url, **self.auth_headers(self.tokens2["access_token"]))
        # Should return 404 (because filtered out of queryset) preventing IDOR
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_cannot_update_other_users_event(self):
        url = f"/api/events/{self.event_user1.id}/"
        response = self.client.patch(
            url,
            {"title": "Hacked Title"},
            format="json",
            **self.auth_headers(self.tokens2["access_token"]),
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.event_user1.refresh_from_db()
        self.assertEqual(self.event_user1.title, "Alice's Event")

    def test_user_cannot_delete_other_users_event(self):
        url = f"/api/events/{self.event_user1.id}/"
        response = self.client.delete(url, **self.auth_headers(self.tokens2["access_token"]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Event.objects.filter(id=self.event_user1.id).exists())

    def test_create_event_derives_organizer_from_request_user(self):
        url = "/api/events/"
        payload = {
            "title": "New Team Sync",
            "description": "Weekly team sync",
            "start_datetime": (self.now + timedelta(days=3)).isoformat(),
            "end_datetime": (self.now + timedelta(days=3, hours=1)).isoformat(),
            "location": "Room 404",
            "category": "personal",
        }
        response = self.client.post(
            url,
            payload,
            format="json",
            **self.auth_headers(self.tokens1["access_token"]),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        event_id = response.data["id"]
        created_event = Event.objects.get(id=event_id)
        # Organizer must be Alice, derived from auth token
        self.assertEqual(created_event.organizer, self.user1)

    def test_event_validation_end_must_be_after_start(self):
        url = "/api/events/"
        payload = {
            "title": "Invalid Datetime Event",
            "start_datetime": (self.now + timedelta(hours=2)).isoformat(),
            "end_datetime": (self.now + timedelta(hours=1)).isoformat(),  # before start!
            "category": "personal",
        }
        response = self.client.post(
            url,
            payload,
            format="json",
            **self.auth_headers(self.tokens1["access_token"]),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("end_datetime", response.data)

    # ==========================================
    # 6. Dashboard Statistics
    # ==========================================
    def test_dashboard_stats(self):
        url = "/api/events/dashboard-stats/"
        response = self.client.get(url, **self.auth_headers(self.tokens1["access_token"]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_events"], 1)
        self.assertEqual(response.data["upcoming_count"], 1)
        self.assertEqual(response.data["past_count"], 0)
        self.assertIn("categories", response.data)
        self.assertEqual(response.data["categories"].get("personal"), 1)

    # ==========================================
    # 7. Admin Endpoints & Restrictions
    # ==========================================
    def test_regular_user_cannot_access_admin_overview(self):
        url = reverse("admin_overview")
        response = self.client.get(url, **self.auth_headers(self.tokens1["access_token"]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_user_can_access_admin_overview(self):
        url = reverse("admin_overview")
        response = self.client.get(url, **self.auth_headers(self.tokens_admin["access_token"]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["total_users"], 3)
        self.assertGreaterEqual(response.data["total_events"], 2)

    def test_admin_toggle_user_active(self):
        url = reverse("admin_toggle_active", kwargs={"pk": self.user2.pk})
        response = self.client.post(url, **self.auth_headers(self.tokens_admin["access_token"]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user2.refresh_from_db()
        self.assertFalse(self.user2.is_active)
