import time

from django.utils.deprecation import MiddlewareMixin

from frontend.api.utils.metrics import log_slow_request


class PerformanceMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request._start_time = time.perf_counter()

    def process_response(self, request, response):
        if hasattr(request, "_start_time"):
            duration = time.perf_counter() - request._start_time
            log_slow_request(request.path, duration)
        return response
