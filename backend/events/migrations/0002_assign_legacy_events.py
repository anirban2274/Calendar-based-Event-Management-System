from django.db import migrations


def assign_legacy_events(apps, schema_editor):
    Event = apps.get_model("events", "Event")
    User = apps.get_model("auth", "User")

    ownerless_events = Event.objects.filter(organizer__isnull=True)
    if not ownerless_events.exists():
        return

    # Find the first superuser or existing user to adopt legacy ownerless events
    fallback_user = (
        User.objects.filter(is_superuser=True).first()
        or User.objects.filter(is_staff=True).first()
        or User.objects.first()
    )

    if not fallback_user:
        # Create a default system administrator account if none exists
        fallback_user = User.objects.create(
            username="admin",
            email="admin@evently.local",
            is_staff=True,
            is_superuser=True,
        )
        fallback_user.set_password("AdminSecurePassword123!")
        fallback_user.save()

    ownerless_events.update(organizer=fallback_user)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("events", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(assign_legacy_events, noop_reverse),
    ]
