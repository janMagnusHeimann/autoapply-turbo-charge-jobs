"""Embedding generation for text content."""

from typing import List, Optional, Dict, Any
import numpy as np
import hashlib
import json
from abc import ABC, abstractmethod


class BaseEmbeddingGenerator(ABC):
    """Abstract base class for embedding generators."""
    
    @abstractmethod
    def generate_embedding(self, text: str) -> np.ndarray:
        """Generate embedding for a single text."""
        pass
    
    @abstractmethod
    def generate_embeddings(self, texts: List[str]) -> List[np.ndarray]:
        """Generate embeddings for multiple texts."""
        pass
    
    @abstractmethod
    def get_embedding_dimension(self) -> int:
        """Get the dimension of embeddings produced by this generator."""
        pass


class MockEmbeddingGenerator(BaseEmbeddingGenerator):
    """Mock embedding generator for testing and development."""
    
    def __init__(self, dimension: int = 384):
        self.dimension = dimension
        self._cache: Dict[str, np.ndarray] = {}
    
    def generate_embedding(self, text: str) -> np.ndarray:
        """Generate a deterministic mock embedding based on text hash."""
        # Use text hash to generate deterministic embeddings
        text_hash = hashlib.md5(text.encode()).hexdigest()
        
        if text_hash in self._cache:
            return self._cache[text_hash]
        
        # Generate deterministic random embedding
        np.random.seed(int(text_hash[:8], 16) % (2**32))
        embedding = np.random.randn(self.dimension)
        
        # Normalize to unit vector
        embedding = embedding / np.linalg.norm(embedding)
        
        self._cache[text_hash] = embedding
        return embedding
    
    def generate_embeddings(self, texts: List[str]) -> List[np.ndarray]:
        """Generate embeddings for multiple texts."""
        return [self.generate_embedding(text) for text in texts]
    
    def get_embedding_dimension(self) -> int:
        """Get the dimension of embeddings."""
        return self.dimension


class TfIdfEmbeddingGenerator(BaseEmbeddingGenerator):
    """TF-IDF based embedding generator."""
    
    def __init__(self, max_features: int = 1000, min_df: int = 1, max_df: float = 0.95):
        self.max_features = max_features
        self.min_df = min_df
        self.max_df = max_df
        self._vectorizer = None
        self._is_fitted = False
    
    def fit(self, texts: List[str]) -> None:
        """Fit the TF-IDF vectorizer on the provided texts."""
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
        except ImportError:
            raise ImportError("scikit-learn is required for TF-IDF embeddings")
        
        self._vectorizer = TfidfVectorizer(
            max_features=self.max_features,
            min_df=self.min_df,
            max_df=self.max_df,
            stop_words='english',
            lowercase=True
        )
        
        self._vectorizer.fit(texts)
        self._is_fitted = True
    
    def generate_embedding(self, text: str) -> np.ndarray:
        """Generate TF-IDF embedding for a single text."""
        if not self._is_fitted:
            raise ValueError("TF-IDF vectorizer must be fitted before generating embeddings")
        
        embedding = self._vectorizer.transform([text]).toarray()[0]
        return embedding
    
    def generate_embeddings(self, texts: List[str]) -> List[np.ndarray]:
        """Generate TF-IDF embeddings for multiple texts."""
        if not self._is_fitted:
            raise ValueError("TF-IDF vectorizer must be fitted before generating embeddings")
        
        embeddings = self._vectorizer.transform(texts).toarray()
        return [embedding for embedding in embeddings]
    
    def get_embedding_dimension(self) -> int:
        """Get the dimension of TF-IDF embeddings."""
        if not self._is_fitted:
            return self.max_features
        return len(self._vectorizer.get_feature_names_out())


class EmbeddingGenerator:
    """Main embedding generator class that supports multiple backends."""
    
    def __init__(self, backend: str = "mock", **kwargs):
        self.backend = backend
        self.kwargs = kwargs
        self._generator = self._create_generator()
    
    def _create_generator(self) -> BaseEmbeddingGenerator:
        """Create the appropriate embedding generator based on backend."""
        if self.backend == "mock":
            return MockEmbeddingGenerator(**self.kwargs)
        elif self.backend == "tfidf":
            return TfIdfEmbeddingGenerator(**self.kwargs)
        else:
            raise ValueError(f"Unsupported embedding backend: {self.backend}")
    
    def generate_embedding(self, text: str) -> np.ndarray:
        """Generate embedding for a single text."""
        return self._generator.generate_embedding(text)
    
    def generate_embeddings(self, texts: List[str]) -> List[np.ndarray]:
        """Generate embeddings for multiple texts."""
        return self._generator.generate_embeddings(texts)
    
    def get_embedding_dimension(self) -> int:
        """Get the dimension of embeddings."""
        return self._generator.get_embedding_dimension()
    
    def fit(self, texts: List[str]) -> None:
        """Fit the embedding generator (if applicable)."""
        if hasattr(self._generator, 'fit'):
            self._generator.fit(texts)
    
    def is_fitted(self) -> bool:
        """Check if the generator is fitted (if applicable)."""
        if hasattr(self._generator, '_is_fitted'):
            return self._generator._is_fitted
        return True  # Mock generator is always "fitted"
    
    def get_info(self) -> Dict[str, Any]:
        """Get information about the embedding generator."""
        info = {
            "backend": self.backend,
            "dimension": self.get_embedding_dimension(),
            "is_fitted": self.is_fitted()
        }
        
        # Add backend-specific info
        if self.backend == "tfidf" and hasattr(self._generator, '_vectorizer'):
            if self._generator._is_fitted:
                info["vocabulary_size"] = len(self._generator._vectorizer.vocabulary_)
                info["feature_names_sample"] = list(
                    self._generator._vectorizer.get_feature_names_out()[:10]
                )
        
        return info


def create_embedding_generator(backend: str = "mock", **kwargs) -> EmbeddingGenerator:
    """Factory function to create embedding generators."""
    return EmbeddingGenerator(backend=backend, **kwargs)