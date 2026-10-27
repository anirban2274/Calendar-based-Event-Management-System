"""
Cryptographically secure token management for Evently using Django's HMAC-SHA256 signing.
Provides signed, tamper-proof access tokens and refresh tokens without requiring external C extensions.
"""

import time
import uuid
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner

User = get_user_model()

# Default token lifetimes in seconds:
# Access token: 60 minutes (3600s)
# Refresh token: 7 days (604800s)
ACCESS_TOKEN_LIFETIME = getattr(settings, "ACCESS_TOKEN_LIFETIME", 3600)
REFRESH_TOKEN_LIFETIME = getattr(settings, "REFRESH_TOKEN_LIFETIME", 604800)

ACCESS_SIGNER = TimestampSigner(salt="evently-access-token-salt")
REFRESH_SIGNER = TimestampSigner(salt="evently-refresh-token-salt")


def generate_access_token(user):
    """Generate a signed access token for the given user."""
    payload = f"{user.pk}:{int(time.time())}:{uuid.uuid4().hex[:8]}"
    return ACCESS_SIGNER.sign(payload)


def generate_refresh_token(user):
    """Generate a signed refresh token for the given user."""
    payload = f"{user.pk}:{int(time.time())}:{uuid.uuid4().hex}"
    return REFRESH_SIGNER.sign(payload)


def generate_token_pair(user):
    """Generate both access and refresh tokens for the given user."""
    return {
        "access_token": generate_access_token(user),
        "refresh_token": generate_refresh_token(user),
        "token_type": "Bearer",
        "expires_in": ACCESS_TOKEN_LIFETIME,
    }


def verify_access_token(token):
    """
    Verify and decode an access token.
    Returns the associated User instance if valid and active, otherwise None.
    """
    try:
        unsigned = ACCESS_SIGNER.unsign(token, max_age=ACCESS_TOKEN_LIFETIME)
        user_id = unsigned.split(":")[0]
        user = User.objects.filter(pk=user_id, is_active=True).first()
        return user
    except (BadSignature, SignatureExpired, ValueError, IndexError):
        return None


def verify_refresh_token(token):
    """
    Verify and decode a refresh token.
    Returns the associated User instance if valid and active, otherwise None.
    """
    try:
        unsigned = REFRESH_SIGNER.unsign(token, max_age=REFRESH_TOKEN_LIFETIME)
        user_id = unsigned.split(":")[0]
        user = User.objects.filter(pk=user_id, is_active=True).first()
        return user
    except (BadSignature, SignatureExpired, ValueError, IndexError):
        return None
