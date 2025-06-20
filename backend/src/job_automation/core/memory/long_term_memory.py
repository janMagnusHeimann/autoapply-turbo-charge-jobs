"""Long-term memory implementation for persistent agent knowledge."""

from typing import Dict, List, Any, Optional
from datetime import datetime
import hashlib
import json


class LongTermMemory:
    """Manages long-term memory for persistent agent knowledge."""
    
    def __init__(self, storage_backend=None):
        self.storage_backend = storage_backend
        self.knowledge_base: Dict[str, Any] = {}
        self.experiences: List[Dict[str, Any]] = []
        self.patterns: Dict[str, Any] = {}
    
    def add_knowledge(self, category: str, key: str, value: Any, metadata: Optional[Dict[str, Any]] = None):
        """Add knowledge to the knowledge base."""
        if category not in self.knowledge_base:
            self.knowledge_base[category] = {}
        
        self.knowledge_base[category][key] = {
            "value": value,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {}
        }
        
        if self.storage_backend:
            self._persist_knowledge()
    
    def get_knowledge(self, category: str, key: Optional[str] = None) -> Any:
        """Retrieve knowledge from the knowledge base."""
        if category not in self.knowledge_base:
            return None
        
        if key is None:
            return self.knowledge_base[category]
        
        knowledge_item = self.knowledge_base[category].get(key)
        return knowledge_item["value"] if knowledge_item else None
    
    def add_experience(self, experience_type: str, data: Dict[str, Any], outcome: str):
        """Add an experience for pattern learning."""
        experience = {
            "id": self._generate_id(f"{experience_type}_{datetime.now().isoformat()}"),
            "type": experience_type,
            "data": data,
            "outcome": outcome,
            "timestamp": datetime.now().isoformat()
        }
        
        self.experiences.append(experience)
        self._update_patterns(experience)
        
        if self.storage_backend:
            self._persist_experiences()
    
    def get_experiences(self, experience_type: Optional[str] = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Retrieve experiences, optionally filtered by type."""
        filtered_experiences = self.experiences
        
        if experience_type:
            filtered_experiences = [exp for exp in self.experiences if exp["type"] == experience_type]
        
        return filtered_experiences[-limit:] if limit else filtered_experiences
    
    def get_patterns(self, pattern_type: Optional[str] = None) -> Dict[str, Any]:
        """Get learned patterns."""
        if pattern_type:
            return self.patterns.get(pattern_type, {})
        return self.patterns
    
    def _update_patterns(self, experience: Dict[str, Any]):
        """Update patterns based on new experience."""
        exp_type = experience["type"]
        outcome = experience["outcome"]
        
        if exp_type not in self.patterns:
            self.patterns[exp_type] = {"success_patterns": [], "failure_patterns": []}
        
        pattern_key = "success_patterns" if outcome == "success" else "failure_patterns"
        
        # Simple pattern extraction (can be enhanced with ML)
        pattern = {
            "data_hash": self._generate_id(str(experience["data"])),
            "outcome": outcome,
            "frequency": 1,
            "last_seen": experience["timestamp"]
        }
        
        # Check if pattern already exists and update frequency
        existing_pattern = None
        for p in self.patterns[exp_type][pattern_key]:
            if p["data_hash"] == pattern["data_hash"]:
                existing_pattern = p
                break
        
        if existing_pattern:
            existing_pattern["frequency"] += 1
            existing_pattern["last_seen"] = pattern["last_seen"]
        else:
            self.patterns[exp_type][pattern_key].append(pattern)
    
    def _generate_id(self, text: str) -> str:
        """Generate a unique ID for content."""
        return hashlib.md5(text.encode()).hexdigest()[:8]
    
    def _persist_knowledge(self):
        """Persist knowledge to storage backend."""
        if self.storage_backend:
            self.storage_backend.save("knowledge_base", self.knowledge_base)
    
    def _persist_experiences(self):
        """Persist experiences to storage backend."""
        if self.storage_backend:
            self.storage_backend.save("experiences", self.experiences)
            self.storage_backend.save("patterns", self.patterns)
    
    def load_from_storage(self):
        """Load memory from storage backend."""
        if self.storage_backend:
            self.knowledge_base = self.storage_backend.load("knowledge_base") or {}
            self.experiences = self.storage_backend.load("experiences") or []
            self.patterns = self.storage_backend.load("patterns") or {}
    
    def clear_memory(self):
        """Clear all long-term memory."""
        self.knowledge_base.clear()
        self.experiences.clear()
        self.patterns.clear()
        
        if self.storage_backend:
            self.storage_backend.clear_all()