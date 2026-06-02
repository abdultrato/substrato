"""Vector store management for RAG."""

from __future__ import annotations

import json
import logging
import os
import pickle
from pathlib import Path
from typing import Any, Optional

import numpy as np

logger = logging.getLogger(__name__)

try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False
    logger.warning("FAISS not available, vector store disabled")


class VectorStore:
    """Manages vector embeddings using FAISS."""

    def __init__(self, dimension: int = 384, index_name: str = "default") -> None:
        self.dimension = dimension
        self.index_name = index_name
        self.index: Optional[Any] = None
        self.metadata: list[dict[str, Any]] = []
        self._initialized = False

        if FAISS_AVAILABLE:
            self._init_index()

    def _init_index(self) -> None:
        """Initialize FAISS index."""
        try:
            self.index = faiss.IndexFlatL2(self.dimension)
            self._initialized = True
            logger.info(f"Vector store initialized: {self.index_name} ({self.dimension}D)")
        except Exception as e:
            logger.error(f"Failed to initialize FAISS index: {e}")
            self._initialized = False

    def add_vectors(
        self,
        vectors: list[list[float]],
        metadata: list[dict[str, Any]],
    ) -> bool:
        """Add vectors and metadata to store."""
        if not self._initialized or not FAISS_AVAILABLE:
            logger.warning("Vector store not initialized, skipping add")
            return False

        try:
            # Convert to numpy array with correct dtype
            vectors_array = np.array(vectors, dtype=np.float32)

            if vectors_array.shape[1] != self.dimension:
                logger.error(
                    f"Vector dimension mismatch: {vectors_array.shape[1]} != {self.dimension}"
                )
                return False

            self.index.add(vectors_array)
            self.metadata.extend(metadata)

            logger.debug(f"Added {len(vectors)} vectors to {self.index_name}")
            return True

        except Exception as e:
            logger.error(f"Error adding vectors: {e}")
            return False

    def search(
        self,
        query_vector: list[float],
        top_k: int = 5,
    ) -> list[dict[str, Any]]:
        """Search for similar vectors."""
        if not self._initialized or not FAISS_AVAILABLE:
            logger.warning("Vector store not initialized, returning empty results")
            return []

        try:
            query_array = np.array([query_vector], dtype=np.float32)

            if query_array.shape[1] != self.dimension:
                logger.error(f"Query vector dimension mismatch: {query_array.shape[1]}")
                return []

            distances, indices = self.index.search(query_array, min(top_k, len(self.metadata)))

            results = []
            for distance, index in zip(distances[0], indices):
                if 0 <= index < len(self.metadata):
                    result = self.metadata[int(index)].copy()
                    result["similarity_score"] = float(1.0 / (1.0 + distance))
                    results.append(result)

            return results

        except Exception as e:
            logger.error(f"Error searching vectors: {e}")
            return []

    def clear(self) -> bool:
        """Clear all vectors."""
        try:
            if self._initialized:
                self.index.reset()
                self.metadata.clear()
                logger.info(f"Vector store cleared: {self.index_name}")
                return True
        except Exception as e:
            logger.error(f"Error clearing vector store: {e}")
        return False

    def get_size(self) -> int:
        """Get number of vectors in store."""
        if self._initialized and self.index:
            return self.index.ntotal
        return 0

    def save(self, filepath: str) -> bool:
        """Save index and metadata to disk."""
        if not self._initialized:
            logger.warning("Cannot save uninitialized vector store")
            return False

        try:
            os.makedirs(os.path.dirname(filepath), exist_ok=True)

            # Save index
            index_path = f"{filepath}.index"
            faiss.write_index(self.index, index_path)

            # Save metadata
            metadata_path = f"{filepath}.metadata"
            with open(metadata_path, "wb") as f:
                pickle.dump(self.metadata, f)

            logger.info(f"Vector store saved to {filepath}")
            return True

        except Exception as e:
            logger.error(f"Error saving vector store: {e}")
            return False

    def load(self, filepath: str) -> bool:
        """Load index and metadata from disk."""
        try:
            # Load index
            index_path = f"{filepath}.index"
            if not os.path.exists(index_path):
                logger.warning(f"Index file not found: {index_path}")
                return False

            self.index = faiss.read_index(index_path)

            # Load metadata
            metadata_path = f"{filepath}.metadata"
            if os.path.exists(metadata_path):
                with open(metadata_path, "rb") as f:
                    self.metadata = pickle.load(f)

            self._initialized = True
            logger.info(f"Vector store loaded from {filepath}")
            return True

        except Exception as e:
            logger.error(f"Error loading vector store: {e}")
            return False

    def get_stats(self) -> dict[str, Any]:
        """Get vector store statistics."""
        return {
            "index_name": self.index_name,
            "dimension": self.dimension,
            "size": self.get_size(),
            "initialized": self._initialized,
            "faiss_available": FAISS_AVAILABLE,
        }


class VectorStoreManager:
    """Manages multiple vector stores."""

    def __init__(self, storage_dir: str = "vector_stores") -> None:
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self._stores: dict[str, VectorStore] = {}

    def get_or_create_store(
        self,
        name: str,
        dimension: int = 384,
    ) -> VectorStore:
        """Get or create a vector store."""
        if name not in self._stores:
            store = VectorStore(dimension=dimension, index_name=name)
            self._stores[name] = store
            logger.debug(f"Created vector store: {name}")

        return self._stores[name]

    def delete_store(self, name: str) -> bool:
        """Delete a vector store."""
        if name in self._stores:
            del self._stores[name]
            logger.debug(f"Deleted vector store: {name}")
            return True
        return False

    def save_all(self) -> bool:
        """Save all vector stores to disk."""
        try:
            for name, store in self._stores.items():
                filepath = str(self.storage_dir / name)
                store.save(filepath)
            logger.info(f"Saved {len(self._stores)} vector stores")
            return True
        except Exception as e:
            logger.error(f"Error saving vector stores: {e}")
            return False

    def load_all(self) -> bool:
        """Load all vector stores from disk."""
        try:
            if not self.storage_dir.exists():
                logger.warning(f"Storage directory not found: {self.storage_dir}")
                return False

            loaded_count = 0
            for index_file in self.storage_dir.glob("*.index"):
                name = index_file.stem
                store = VectorStore(index_name=name)
                filepath = str(self.storage_dir / name)
                if store.load(filepath):
                    self._stores[name] = store
                    loaded_count += 1

            logger.info(f"Loaded {loaded_count} vector stores from disk")
            return True

        except Exception as e:
            logger.error(f"Error loading vector stores: {e}")
            return False

    def get_stats(self) -> dict[str, Any]:
        """Get statistics for all stores."""
        return {
            name: store.get_stats() for name, store in self._stores.items()
        }


# Global manager instance
vector_store_manager = VectorStoreManager()
