"""In-memory vector store implementation."""

from typing import List, Dict, Any, Optional
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import threading

from .base_vector_store import BaseVectorStore, VectorDocument, SearchResult


class MemoryVectorStore(BaseVectorStore):
    """In-memory vector store using cosine similarity for search."""
    
    def __init__(self):
        self._documents: Dict[str, VectorDocument] = {}
        self._embeddings_matrix: Optional[np.ndarray] = None
        self._doc_ids: List[str] = []
        self._lock = threading.Lock()
        self._dirty = False  # Track if embeddings matrix needs rebuilding
    
    def add_document(self, document: VectorDocument) -> None:
        """Add a document to the vector store."""
        with self._lock:
            self._documents[document.id] = document
            self._dirty = True
    
    def add_documents(self, documents: List[VectorDocument]) -> None:
        """Add multiple documents to the vector store."""
        with self._lock:
            for document in documents:
                self._documents[document.id] = document
            self._dirty = True
    
    def _rebuild_embeddings_matrix(self) -> None:
        """Rebuild the embeddings matrix for efficient search."""
        if not self._documents:
            self._embeddings_matrix = None
            self._doc_ids = []
            return
        
        self._doc_ids = list(self._documents.keys())
        embeddings = [self._documents[doc_id].embedding for doc_id in self._doc_ids]
        self._embeddings_matrix = np.vstack(embeddings)
        self._dirty = False
    
    def search(self, query_embedding: np.ndarray, k: int = 10,
              filter_metadata: Optional[Dict[str, Any]] = None) -> List[SearchResult]:
        """Search for similar documents."""
        with self._lock:
            if self._dirty:
                self._rebuild_embeddings_matrix()
            
            if self._embeddings_matrix is None or len(self._documents) == 0:
                return []
            
            # Calculate similarities
            query_embedding = query_embedding.reshape(1, -1)
            similarities = cosine_similarity(query_embedding, self._embeddings_matrix)[0]
            
            # Get top k indices
            top_indices = np.argsort(similarities)[::-1]
            
            results = []
            for idx in top_indices:
                if len(results) >= k:
                    break
                
                doc_id = self._doc_ids[idx]
                document = self._documents[doc_id]
                
                # Apply metadata filter if provided
                if filter_metadata:
                    if not self._matches_filter(document.metadata, filter_metadata):
                        continue
                
                score = float(similarities[idx])
                results.append(SearchResult(document, score))
            
            return results
    
    def _matches_filter(self, metadata: Dict[str, Any], filter_metadata: Dict[str, Any]) -> bool:
        """Check if document metadata matches the filter."""
        for key, value in filter_metadata.items():
            if key not in metadata or metadata[key] != value:
                return False
        return True
    
    def get_document(self, doc_id: str) -> Optional[VectorDocument]:
        """Retrieve a document by ID."""
        with self._lock:
            return self._documents.get(doc_id)
    
    def delete_document(self, doc_id: str) -> bool:
        """Delete a document by ID."""
        with self._lock:
            if doc_id in self._documents:
                del self._documents[doc_id]
                self._dirty = True
                return True
            return False
    
    def update_document(self, document: VectorDocument) -> bool:
        """Update an existing document."""
        with self._lock:
            if document.id in self._documents:
                self._documents[document.id] = document
                self._dirty = True
                return True
            return False
    
    def count_documents(self) -> int:
        """Get the total number of documents."""
        with self._lock:
            return len(self._documents)
    
    def clear(self) -> None:
        """Clear all documents from the store."""
        with self._lock:
            self._documents.clear()
            self._embeddings_matrix = None
            self._doc_ids = []
            self._dirty = False
    
    def get_all_documents(self) -> List[VectorDocument]:
        """Get all documents in the store."""
        with self._lock:
            return list(self._documents.values())
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get statistics about the vector store."""
        with self._lock:
            if not self._documents:
                return {
                    "total_documents": 0,
                    "embedding_dimension": 0,
                    "memory_usage_mb": 0
                }
            
            # Calculate memory usage (approximate)
            total_embeddings_size = 0
            embedding_dim = 0
            
            for doc in self._documents.values():
                embedding_dim = len(doc.embedding)
                total_embeddings_size += doc.embedding.nbytes
            
            # Add approximate size of content and metadata
            content_size = sum(len(doc.content.encode('utf-8')) for doc in self._documents.values())
            metadata_size = sum(len(str(doc.metadata).encode('utf-8')) for doc in self._documents.values())
            
            total_size_mb = (total_embeddings_size + content_size + metadata_size) / (1024 * 1024)
            
            return {
                "total_documents": len(self._documents),
                "embedding_dimension": embedding_dim,
                "memory_usage_mb": round(total_size_mb, 2),
                "embeddings_matrix_built": not self._dirty and self._embeddings_matrix is not None
            }
    
    def export_documents(self) -> List[Dict[str, Any]]:
        """Export all documents to dictionary format."""
        with self._lock:
            return [doc.to_dict() for doc in self._documents.values()]
    
    def import_documents(self, documents_data: List[Dict[str, Any]]) -> None:
        """Import documents from dictionary format."""
        documents = [VectorDocument.from_dict(data) for data in documents_data]
        self.add_documents(documents)