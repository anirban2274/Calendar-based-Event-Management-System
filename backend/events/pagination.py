from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination for Evently API.
    Supports ?page=1, ?page_size=50, and ?paginate=false to allow unpaginated calendar sync.
    """

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 250

    def paginate_queryset(self, queryset, request, view=None):
        # Allow disabling pagination explicitly when requested by full-calendar clients
        if request.query_params.get("paginate", "").lower() == "false":
            return None
        return super().paginate_queryset(queryset, request, view)
