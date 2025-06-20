"""Base interface for vector stores."""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple
import numpy as np


class VectorDocument:
    """Represents a document with its vector embedding."""
    
    def __init__(self, id: str, content: str, embedding: np.ndarray, metadata: Optional[Dict[str, Any]] = None):
        self.id = id
        self.content = content
        self.embedding = embedding
        self.metadata = metadata or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "id": self.id,
            "content": self.content,
            "embedding": self.embedding.tolist(),
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "VectorDocument":
        """Create from dictionary representation."""
        return cls(
            id=data["id"],
            content=data["content"],
            embedding=np.array(data["embedding"]),
            metadata=data.get("metadata", {})
        )


class SearchResult:
    """Represents a search result with similarity score."""
    
    def __init__(self, document: VectorDocument, score: float):
        self.document = document
        self.score = score
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "document": self.document.to_dict(),
            "score": self.score
        }


class BaseVectorStore(ABC):
    """Abstract base class for vector stores."""
    
    @abstractmethod
    def add_document(self, document: VectorDocument) -> None:
        """Add a document to the vector store."""
        pass
    
    @abstractmethod
    def add_documents(self, documents: List[VectorDocument]) -> None:
        """Add multiple documents to the vector store."""
        pass
    
    @abstractmethod
    def search(self, query_embedding: np.ndarray, k: int = 10, 
              filter_metadata: Optional[Dict[str, Any]] = None) -> List[SearchResult]:
        """Search for similar documents."""
        pass
    
    @abstractmethod
    def get_document(self, doc_id: str) -> Optional[VectorDocument]:
        """Retrieve a document by ID."""
        pass
    
    @abstractmethod
    def delete_document(self, doc_id: str) -> bool:
        """Delete a document by ID."""
        pass
    
    @abstractmethod
    def update_document(self, document: VectorDocument) -> bool:
        """Update an existing document."""
        pass
    
    @abstractmethod
    def count_documents(self) -> int:
        """Get the total number of documents."""
        pass
    
    @abstractmethod
    def clear(self) -> None:
        """Clear all documents from the store."""
        pass
    
    def similarity_search(self, query_embedding: np.ndarray, k: int = 10,
                         threshold: float = 0.0) -> List[SearchResult]:
        """Search for documents with similarity above threshold."""
        results = self.search(query_embedding, k)
        return [result for result in results if result.score >= threshold]
    
    def get_all_documents(self) -> List[VectorDocument]:
        """Get all documents in the store."""
        # Default implementation - should be overridden for efficiency
        raise NotImplementedError("get_all_documents not implemented")
    
    def batch_delete(self, doc_ids: List[str]) -> int:
        """Delete multiple documents by ID. Returns number of deleted documents."""
        deleted_count = 0
        for doc_id in doc_ids:
            if self.delete_document(doc_id):
                deleted_count += 1
        return deleted_count