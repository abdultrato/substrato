from __future__ import annotations

from django.core.management.base import BaseCommand
from django.apps import apps

class Command(BaseCommand):
    help = 'Rebuild the AI assistant vector index for knowledge base search'

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('Starting AI vector index rebuild...')
        )

        try:
            # Import here to avoid issues if dependencies aren't installed
            from apps.ai_assistant.services.vector_store import get_vector_store_service

            vector_store = get_vector_store_service()
            if vector_store is None:
                self.stdout.write(
                    self.style.ERROR(
                        'Vector store service not available. '
                        'Please ensure sentence-transformers, faiss-cpu, and numpy are installed.'
                    )
                )
                return

            # Rebuild the index
            vector_store.rebuild_index()

            self.stdout.write(
                self.style.SUCCESS('Successfully rebuilt AI vector index')
            )

        except ImportError as e:
            self.stdout.write(
                self.style.ERROR(
                    f'Failed to import vector store dependencies: {str(e)}. '
                    'Please install sentence-transformers, faiss-cpu, and numpy.'
                )
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(
                    f'Failed to rebuild vector index: {str(e)}'
                )
            )