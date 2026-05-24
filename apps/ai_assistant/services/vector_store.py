from __future__ import annotations

import os
import pickle
import hashlib
import json
from typing import List, Tuple, Optional, Dict, Set
import numpy as np

try:
    import faiss
    from sentence_transformers import SentenceTransformer
    VECTOR_STORE_AVAILABLE = True
except ImportError:
    VECTOR_STORE_AVAILABLE = False
    faiss = None
    SentenceTransformer = None

from django.conf import settings
from django.core.cache import cache

from apps.ai_assistant.models import AiKnowledgeEntry


class VectorStoreService:
    """
    Service for managing vector embeddings and similarity search
    for the AI knowledge base using FAISS and sentence-transformers.
    Optimized for incremental updates and caching.
    """

    def __init__(self):
        if not VECTOR_STORE_AVAILABLE:
            raise ImportError(
                "Vector store dependencies not installed. "
                "Please install sentence-transformers, faiss-cpu, and numpy."
            )

        self.model_name = getattr(settings, 'AI_VECTOR_MODEL', 'all-MiniLM-L6-v2')
        self.index_path = getattr(settings, 'AI_VECTOR_INDEX_PATH',
                                 os.path.join(settings.BASE_DIR, 'apps', 'ai_assistant', 'vector_store'))
        self.dimension = 384  # Default for all-MiniLM-L6-v2
        self._index_version = "1.0"  # For cache invalidation

        # Ensure directory exists
        os.makedirs(self.index_path, exist_ok=True)

        # Initialize model and index
        self.model = SentenceTransformer(self.model_name)
        self.index = None
        self.id_mapping = []  # Maps FAISS index positions to knowledge entry IDs
        self._id_to_index: Dict[str, int] = {}  # Reverse mapping for quick lookup
        self._dirty = False  # Track if index needs saving

        # Try to load existing index
        self._load_index()

    def _get_index_files(self) -> Tuple[str, str]:
        """Get paths for index and mapping files."""
        index_file = os.path.join(self.index_path, "knowledge.index")
        mapping_file = os.path.join(self.index_path, "id_mapping.pkl")
        return index_file, mapping_file

    def _load_index(self) -> bool:
        """Load existing FAISS index and ID mapping if available."""
        try:
            index_file, mapping_file = self._get_index_files()

            if os.path.exists(index_file) and os.path.exists(mapping_file):
                self.index = faiss.read_index(index_file)
                with open(mapping_file, 'rb') as f:
                    self.id_mapping = pickle.load(f)

                # Build reverse mapping for quick lookup
                self._id_to_index = {id_str: idx for idx, id_str in enumerate(self.id_mapping)}

                # Check if we need to rebuild based on version or model changes
                version_file = os.path.join(self.index_path, "version.json")
                if os.path.exists(version_file):
                    with open(version_file, 'r') as f:
                        version_data = json.load(f)
                        if (version_data.get("model") != self.model_name or
                            version_data.get("version") != self._index_version):
                            # Model or version changed, need to rebuild
                            return False
                else:
                    # No version file, assume we need to rebuild
                    return False

                return True
        except Exception as e:
            # If loading fails, we'll rebuild the index
            pass
        return False

    def _save_index(self):
        """Save FAISS index and ID mapping to disk."""
        try:
            index_file, mapping_file = self._get_index_files()

            if self.index is not None and self._dirty:
                faiss.write_index(self.index, index_file)
                with open(mapping_file, 'wb') as f:
                    pickle.dump(self.id_mapping, f)

                # Save version information
                version_file = os.path.join(self.index_path, "version.json")
                version_data = {
                    "model": self.model_name,
                    "version": self._index_version,
                    "updated_at": str(np.datetime64('now'))
                }
                with open(version_file, 'w') as f:
                    json.dump(version_data, f)

                self._dirty = False
        except Exception as e:
            # Log error but don't crash
            pass

    def rebuild_index(self):
        """Rebuild the vector index from all active knowledge entries."""
        # Get all active knowledge entries
        entries = AiKnowledgeEntry.objects.filter(
            status=AiKnowledgeEntry.Status.ACTIVE
        ).only('id', 'slug', 'title', 'answer_pt', 'answer_en', 'questions_pt', 'questions_en')

        if not entries.exists():
            # Create empty index
            self.index = faiss.IndexFlatIP(self.dimension)  # Inner product for cosine similarity
            self.id_mapping = []
            self._id_to_index = {}
            self._save_index()
            return

        # Prepare texts for encoding (combine title, answer, and questions)
        texts = []
        entry_ids = []

        for entry in entries:
            # Combine multiple fields for better semantic representation
            text_parts = [
                entry.title or "",
                entry.answer_pt or "",
                entry.answer_en or "",
                " ".join(entry.questions_pt or []),
                " ".join(entry.questions_en or [])
            ]
            combined_text = " ".join(filter(None, text_parts)).strip()

            if combined_text:
                texts.append(combined_text)
                entry_ids.append(str(entry.id))

        if not texts:
            # Create empty index
            self.index = faiss.IndexFlatIP(self.dimension)
            self.id_mapping = []
            self._id_to_index = {}
            self._save_index()
            return

        # Encode all texts
        embeddings = self.model.encode(texts, normalize_embeddings=True)

        # Create new index (using Inner Product for cosine similarity with normalized vectors)
        self.index = faiss.IndexFlatIP(self.dimension)
        self.index.add(embeddings.astype('float32'))
        self.id_mapping = entry_ids
        self._id_to_index = {id_str: idx for idx, id_str in enumerate(self.id_mapping)}

        # Save to disk
        self._save_index()

    def search(self, query: str, k: int = 5) -> List[Tuple[str, float]]:
        """
        Search for similar knowledge entries using vector similarity.

        Returns:
            List of tuples (entry_id, similarity_score) sorted by score descending
        """
        if self.index is None or self.index.ntotal == 0:
            return []

        # Encode query
        query_embedding = self.model.encode([query], normalize_embeddings=True)

        # Search index
        scores, indices = self.index.search(
            query_embedding.astype('float32'),
            k
        )

        # Convert results
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < len(self.id_mapping):  # Valid index
                entry_id = self.id_mapping[idx]
                # Convert from inner product to cosine similarity (already normalized)
                similarity = float(score)
                results.append((entry_id, similarity))

        return results

    def add_entry(self, entry: AiKnowledgeEntry):
        """Add a single knowledge entry to the index incrementally."""
        if self.index is None:
            self.rebuild_index()
            return

        # Prepare text for encoding
        text_parts = [
            entry.title or "",
            entry.answer_pt or "",
            entry.answer_en or "",
            " ".join(entry.questions_pt or []),
            " ".join(entry.questions_en or [])
        ]
        combined_text = " ".join(filter(None, text_parts)).strip()

        if not combined_text:
            return

        # Encode the single entry
        embedding = self.model.encode([combined_text], normalize_embeddings=True)

        # Add to index
        self.index.add(embedding.astype('float32'))
        self.id_mapping.append(str(entry.id))
        self._id_to_index[str(entry.id)] = self.index.ntotal - 1

        # Mark as dirty for saving
        self._dirty = True

        # Save periodically or when threshold reached
        if len(self.id_mapping) % 50 == 0:  # Save every 50 additions
            self._save_index()

    def update_entry(self, entry: AiKnowledgeEntry):
        """Update a knowledge entry in the index (remove and re-add)."""
        self.remove_entry(str(entry.id))
        self.add_entry(entry)

    def remove_entry(self, entry_id: str):
        """Remove a knowledge entry from the index."""
        if self.index is None or entry_id not in self._id_to_index:
            return

        # Get the index to remove
        remove_idx = self._id_to_index[entry_id]

        # Remove from ID mapping
        del self.id_mapping[remove_idx]
        del self._id_to_index[entry_id]

        # Rebuild reverse mapping
        self._id_to_index = {id_str: idx for idx, id_str in enumerate(self.id_mapping)}

        # For FAISS, we need to rebuild the index when removing entries
        # (FAISS doesn't support efficient removal from IndexFlatIP)
        # However, we can mark as dirty and rebuild when convenient
        self._dirty = True

        # Rebuild if too many deletions have occurred
        if len(self.id_mapping) < self.index.ntotal * 0.7:  # Rebuild if 30%+ deleted
            self.rebuild_index()
        elif len(self.id_mapping) % 50 == 0:  # Or save periodically
            self._save_index()


# Global service instance (lazy initialization)
_vector_store_service = None


def get_vector_store_service() -> Optional[VectorStoreService]:
    """Get or create the global vector store service instance."""
    global _vector_store_service

    if not VECTOR_STORE_AVAILABLE:
        return None

    if _vector_store_service is None:
        try:
            _vector_store_service = VectorStoreService()
        except Exception:
            # If initialization fails, return None to disable vector search
            return None

    return _vector_store_service