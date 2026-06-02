"""Management command for knowledge base operations."""

import json

from django.core.management.base import BaseCommand, CommandError

from apps.ai_assistant.vector_store.knowledge_retriever import knowledge_retriever


class Command(BaseCommand):
    """Manage AI knowledge base (vector store)."""

    help = "Manage AI knowledge base: stats, search, clear, etc."

    def add_arguments(self, parser) -> None:
        """Add command arguments."""
        parser.add_argument(
            "action",
            type=str,
            choices=["stats", "search", "clear", "info"],
            help="Knowledge base action",
        )
        parser.add_argument(
            "--query",
            type=str,
            help="Search query",
        )
        parser.add_argument(
            "--top-k",
            type=int,
            default=5,
            help="Number of results (default: 5)",
        )

    def handle(self, *args, **options) -> None:
        """Execute knowledge base command."""
        action = options["action"]

        try:
            if action == "stats":
                self._show_stats()
            elif action == "search":
                query = options.get("query")
                if not query:
                    raise CommandError("--query required for search action")
                self._search(query, options.get("top_k", 5))
            elif action == "clear":
                self._clear()
            elif action == "info":
                self._show_info()
        except Exception as e:
            raise CommandError(f"Knowledge base error: {e}")

    def _show_stats(self) -> None:
        """Show knowledge base statistics."""
        stats = knowledge_retriever.get_stats()
        self.stdout.write(self.style.SUCCESS("\n=== Knowledge Base Statistics ===\n"))

        self.stdout.write(f"Store Name: {stats['store_name']}")
        self.stdout.write(f"Documents: {stats['size']}")
        self.stdout.write(f"Embeddings Available: {stats['embedding_available']}")
        self.stdout.write(f"Embedding Dimension: {stats['embedding_dimension']}D")

        vector_stats = stats.get("vector_store_stats", {})
        self.stdout.write(f"FAISS Available: {vector_stats.get('faiss_available', False)}")
        self.stdout.write("\n")

    def _search(self, query: str, top_k: int) -> None:
        """Search knowledge base."""
        self.stdout.write(f"\nSearching for: {self.style.WARNING(query)}\n")

        results = knowledge_retriever.search(query, top_k=top_k)

        if not results:
            self.stdout.write(self.style.WARNING("No results found"))
            return

        for i, result in enumerate(results, 1):
            score = result.get("similarity_score", 0)
            content = result.get("content", "")[:100]
            self.stdout.write(
                f"{i}. [{self.style.SUCCESS(f'{score:.2f}')}] {content}...\n"
            )

    def _clear(self) -> None:
        """Clear knowledge base."""
        if knowledge_retriever.clear():
            self.stdout.write(
                self.style.SUCCESS("✓ Knowledge base cleared successfully")
            )
        else:
            self.stdout.write(
                self.style.ERROR("✗ Failed to clear knowledge base")
            )

    def _show_info(self) -> None:
        """Show knowledge base info."""
        stats = knowledge_retriever.get_stats()
        self.stdout.write(json.dumps(stats, indent=2))
