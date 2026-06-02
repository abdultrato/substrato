"""Management command for rate limit operations."""

from django.core.management.base import BaseCommand, CommandError

from apps.ai_assistant.services.rate_limiter import rate_limiter


class Command(BaseCommand):
    """Manage AI rate limiting."""

    help = "Manage AI rate limits: stats, reset, etc."

    def add_arguments(self, parser) -> None:
        """Add command arguments."""
        parser.add_argument(
            "action",
            type=str,
            choices=["stats", "reset"],
            help="Rate limit action",
        )
        parser.add_argument(
            "--key",
            type=str,
            help="Specific rate limit key to operate on",
        )

    def handle(self, *args, **options) -> None:
        """Execute rate limit command."""
        action = options["action"]
        key = options.get("key")

        try:
            if action == "stats":
                if not key:
                    raise CommandError("--key required for stats action")
                self._show_stats(key)
            elif action == "reset":
                if not key:
                    raise CommandError("--key required for reset action")
                self._reset_limit(key)
        except Exception as e:
            raise CommandError(f"Rate limit error: {e}")

    def _show_stats(self, key: str) -> None:
        """Show rate limit stats."""
        usage = rate_limiter.get_usage(key)
        self.stdout.write(self.style.SUCCESS(f"\n=== Rate Limit Stats for: {key} ===\n"))

        if "error" in usage:
            self.stdout.write(self.style.ERROR(f"Error: {usage['error']}"))
            return

        for k, v in usage.items():
            self.stdout.write(f"{k}: {v}")
        self.stdout.write("")

    def _reset_limit(self, key: str) -> None:
        """Reset rate limit for key."""
        if rate_limiter.reset(key):
            self.stdout.write(self.style.SUCCESS(f"✓ Rate limit reset for: {key}"))
        else:
            self.stdout.write(self.style.ERROR(f"✗ Failed to reset rate limit for: {key}"))
