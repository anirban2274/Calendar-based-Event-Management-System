"""
Authentication backend for Django REST Framework using signed tokens.
"""

from rest_framework import authentication, exceptions
from .tokens import verify_access_token


class SignedTokenAuthentication(authentication.BaseAuthentication):
    """
    Authenticate requests bearing a signed token in the Authorization header.
    Format:
        Authorization: Bearer <token>
        or
        Authorization: Token <token>
    """

    keyword_names = ("bearer", "token")

    def authenticate(self, request):
        auth_header = authentication.get_authorization_header(request).split()

        if not auth_header:
            return None

        keyword = auth_header[0].decode("utf-8").lower()
        if keyword not in self.keyword_names:
            return None

        if len(auth_header) == 1:
            raise exceptions.AuthenticationFailed("Invalid token header. No credentials provided.")
        elif len(auth_header) > 2:
            raise exceptions.AuthenticationFailed("Invalid token header. Token string should not contain spaces.")

        token = auth_header[1].decode("utf-8")
        user = verify_access_token(token)

        if not user:
            raise exceptions.AuthenticationFailed("Invalid or expired authentication token.")

        if not user.is_active:
            raise exceptions.AuthenticationFailed("User account is disabled.")

        return (user, token)

    def authenticate_header(self, request):
        return 'Bearer realm="api"'
