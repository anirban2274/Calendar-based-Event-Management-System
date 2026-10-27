from django.contrib import admin
from .models import Event


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "organizer",
        "category",
        "start_datetime",
        "end_datetime",
        "location",
        "created_at",
    ]
    list_filter = [
        "category",
        "start_datetime",
        "created_at",
        "organizer",
    ]
    search_fields = [
        "title",
        "description",
        "location",
        "organizer__username",
        "organizer__email",
    ]
    date_hierarchy = "start_datetime"
    ordering = ["-start_datetime"]
    readonly_fields = ["created_at", "updated_at"]
    fieldsets = (
        (
            None,
            {
                "fields": ("title", "description", "category", "organizer"),
            },
        ),
        (
            "Schedule & Location",
            {
                "fields": ("start_datetime", "end_datetime", "location"),
            },
        ),
        (
            "Timestamps",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )
