"""Management command for AI cache operations."""

from django.core.management.base import BaseCommand, CommandError

from apps.ai_assistant.services.cache import cache_manager


class Command(BaseCommand):
    """Manage AI cache: stats, clear, etc."""

    help = "Manage AI gateway cache (Redis with memory fallback)"

    def add_arguments(self, parser) -> None:
        """Add command arguments."""
        parser.add_argument(
            "action",
            type=str,
            choices=["stats", "clear", "reset"],
            help="Cache action to perform",
        )
        parser.add_argument(
            "--format",
            type=str,
            choices=["table", "json"],
            default="table",
            help="Output format (default: table)",
        )

    def handle(self, *args, **options) -> None:
        """Execute cache management command."""
        action = options["action"]
        output_format = options["format"]

        try:
            if action == "stats":
                self._show_stats(output_format)
            elif action == "clear":
                self._clear_cache()
            elif action == "reset":
                self._reset_cache()
        except Exception as e:
            raise CommandError(f"Cache management error: {e}")

    def _show_stats(self, output_format: str) -> None:
        """Display cache statistics."""
        stats = cache_manager.get_stats()

        if output_format == "json":
            import json

            self.stdout.write(json.dumps(stats, indent=2))
            return

        self.stdout.write(self.style.SUCCESS("\n=== AI Gateway Cache Statistics ===\n"))

        self.stdout.write(f"Backend: {self.style.WARNING(stats.get('backend', 'unknown'))}")
        self.stdout.write(f"Redis Available: {self.style.WARNING(str(stats.get('redis_available', False)))}")

        if "memory_stats" in stats:
            mem_stats = stats["memory_stats"]
            self.stdout.write(f"\n--- Memory Backend ---")
            self.stdout.write(f"Size: {mem_stats.get('size', 0)}/{mem_stats.get('max_size', 0)}")
            self.stdout.write(f"Hits: {mem_stats.get('hits', 0)}")
            self.stdout.write(f"Misses: {mem_stats.get('misses', 0)}")
            self.stdout.write(f"Hit Rate: {mem_stats.get('hit_rate', '0%')}")

        if stats.get("redis_errors", 0) > 0:
            self.stdout.write(f"\n{self.style.WARNING('Redis Errors:')} {stats['redis_errors']}")

        if stats.get("fallback_activations", 0) > 0:
            self.stdout.write(f"{self.style.WARNING('Fallback Activations:')} {stats['fallback_activations']}")

        self.stdout.write("\n")

    def _clear_cache(self) -> None:
        """Clear cache."""
        success = cache_manager.clear()
        if success:
            self.stdout.write(self.style.SUCCESS("✓ Cache cleared successfully"))
        else:
            self.stdout.write(self.style.ERROR("✗ Failed to clear cache"))

    def _reset_cache(self) -> None:
        """Reset cache manager."""
        try:
            from apps.ai_assistant.services.cache import AiCacheManager

            AiCacheManager.reset()
            self.stdout.write(self.style.SUCCESS("✓ Cache manager reset successfully"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Failed to reset: {e}"))
