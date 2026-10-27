from django.db import models
from django.conf import settings
class Event(models.Model):
    CATEGORY_CHOICES = [
        ("personal", "Personal"),
        ("college", "College & Clubs"),
        ("holiday", "Holidays & Occasions"),
        ("deadline", "Deadlines & Tasks"),
        ("social", "Social"),
        ("other", "Other"),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    location = models.CharField(max_length=200, blank=True)
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default="other",
    )

    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ["start_datetime"]


