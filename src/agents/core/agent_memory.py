"""
Agent Memory Management System
Handles short-term, working, and long-term memory for agents.
"""

from typing import Any, Dict, List, Optional, Set
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import json
import pickle
import hashlib
from pathlib import Path
import logging
from enum import Enum

logger = logging.getLogger(__name__)


class MemoryType(Enum):
    """Types of memory storage."""
    SHORT_TERM = "short_term"
    WORKING = "working"
    LONG_TERM = "long_term"
    CONVERSATION = "conversation"
    PATTERNS = "patterns"


@dataclass
class MemoryItem:
    """Individual memory item with metadata."""
    content: Any
    item_type: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    importance: float = 0.5  # 0.0 to 1.0
    access_count: int = 0
    last_accessed: Optional[datetime] = None
    tags: Set[str] = field(default_factory=set)
    source_agent: Optional[str] = None
    confidence: float = 1.0
    
    def __post_init__(self):
        if self.last_accessed is None:
            self.last_accessed = self.timestamp
    
    def access(self) -> None:
        """Mark item as accessed."""
        self.access_count += 1
        self.last_accessed = datetime.utcnow()
    
    def add_tag(self, tag: str) -> None:
        """Add a tag to the memory item."""
        self.tags.add(tag)
    
    def get_age_hours(self) -> float:
        """Get age of memory item in hours."""
        return (datetime.utcnow() - self.timestamp).total_seconds() / 3600
    
    def calculate_relevance_score(self, query_tags: Set[str] = None) -> float:
        """Calculate relevance score for retrieval."""
        score = self.importance
        
        # Boost for recent access
        hours_since_access = (datetime.utcnow() - self.last_accessed).total_seconds() / 3600
        recency_bonus = max(0, 1.0 - hours_since_access / 24.0)  # Decay over 24 hours
        score += recency_bonus * 0.2
        
        # Boost for frequent access
        access_bonus = min(0.3, self.access_count * 0.05)
        score += access_bonus
        
        # Tag matching bonus
        if query_tags and self.tags:
            tag_overlap = len(query_tags.intersection(self.tags))
            if tag_overlap > 0:
                score += tag_overlap / len(query_tags) * 0.3
        
        return min(1.0, score)


class AgentMemoryManager:
    """
    Comprehensive memory management system for agents.
    Handles different types of memory with intelligent retention and retrieval.
    """
    
    def __init__(
        self,
        agent_name: str,
        short_term_capacity: int = 100,
        working_memory_capacity: int = 50,
        persistence_dir: Optional[Path] = None
    ):
        self.agent_name = agent_name
        self.short_term_capacity = short_term_capacity
        self.working_memory_capacity = working_memory_capacity
        
        # Memory stores
        self.short_term_memory: List[MemoryItem] = []
        self.working_memory: Dict[str, MemoryItem] = {}
        self.conversation_history: List[MemoryItem] = []
        self.learned_patterns: Dict[str, MemoryItem] = {}
        
        # Persistence
        self.persistence_dir = persistence_dir
        if persistence_dir:
            persistence_dir.mkdir(parents=True, exist_ok=True)
            self._load_persistent_memory()
        
        # Statistics
        self.stats = {
            "items_added": 0,
            "items_retrieved": 0,
            "cache_hits": 0,
            "cache_misses": 0
        }
    
    def add_observation(
        self,
        content: Any,
        observation_type: str,
        importance: float = 0.5,
        tags: Optional[List[str]] = None,
        confidence: float = 1.0
    ) -> str:
        """Add an observation to short-term memory."""
        memory_item = MemoryItem(
            content=content,
            item_type=f"observation:{observation_type}",
            importance=importance,
            tags=set(tags or []),
            source_agent=self.agent_name,
            confidence=confidence
        )
        
        self.short_term_memory.append(memory_item)
        self._manage_short_term_capacity()
        self.stats["items_added"] += 1
        
        return self._generate_item_id(memory_item)
    
    def add_action_result(
        self,
        action: Dict[str, Any],
        result: Dict[str, Any],
        importance: float = 0.3,
        tags: Optional[List[str]] = None
    ) -> str:
        """Add action and its result to memory."""
        content = {
            "action": action,
            "result": result,
            "success": result.get("success", False)
        }
        
        memory_item = MemoryItem(
            content=content,
            item_type="action_result",
            importance=importance,
            tags=set(tags or []),
            source_agent=self.agent_name
        )
        
        self.short_term_memory.append(memory_item)
        self._manage_short_term_capacity()
        self.stats["items_added"] += 1
        
        return self._generate_item_id(memory_item)
    
    def update_working_memory(
        self,
        key: str,
        content: Any,
        importance: float = 0.7,
        tags: Optional[List[str]] = None
    ) -> None:
        """Update working memory with current task state."""
        memory_item = MemoryItem(
            content=content,
            item_type="working_state",
            importance=importance,
            tags=set(tags or []),
            source_agent=self.agent_name
        )
        
        self.working_memory[key] = memory_item
        self._manage_working_memory_capacity()
    
    def get_working_memory(self, key: str) -> Optional[Any]:
        """Get item from working memory."""
        if key in self.working_memory:
            item = self.working_memory[key]
            item.access()
            self.stats["cache_hits"] += 1
            return item.content
        
        self.stats["cache_misses"] += 1
        return None
    
    def add_conversation_turn(
        self,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Add conversation turn to history."""
        memory_item = MemoryItem(
            content={
                "role": role,
                "content": content,
                "metadata": metadata or {}
            },
            item_type="conversation",
            importance=0.4,
            tags={"conversation"},
            source_agent=self.agent_name
        )
        
        self.conversation_history.append(memory_item)
        
        # Keep conversation history manageable
        if len(self.conversation_history) > 200:
            self.conversation_history = self.conversation_history[-150:]
    
    def learn_pattern(
        self,
        pattern_name: str,
        pattern_data: Dict[str, Any],
        importance: float = 0.8,
        confidence: float = 1.0
    ) -> None:
        """Learn a new pattern for future use."""
        if pattern_name in self.learned_patterns:
            # Update existing pattern
            existing = self.learned_patterns[pattern_name]
            existing.content.update(pattern_data)
            existing.importance = max(existing.importance, importance)
            existing.confidence = (existing.confidence + confidence) / 2
            existing.access()
        else:
            # Create new pattern
            memory_item = MemoryItem(
                content=pattern_data,
                item_type="learned_pattern",
                importance=importance,
                tags={"pattern", pattern_name},
                source_agent=self.agent_name,
                confidence=confidence
            )
            self.learned_patterns[pattern_name] = memory_item
        
        # Persist important patterns
        if self.persistence_dir and importance > 0.7:
            self._save_pattern(pattern_name)
    
    def retrieve_similar_experiences(
        self,
        query: str,
        experience_type: Optional[str] = None,
        limit: int = 5,
        min_relevance: float = 0.3
    ) -> List[Dict[str, Any]]:
        """Retrieve similar past experiences."""
        query_tags = set(query.lower().split())
        candidates = []
        
        # Search short-term memory
        for item in self.short_term_memory:
            if experience_type and not item.item_type.startswith(experience_type):
                continue
            
            relevance = item.calculate_relevance_score(query_tags)
            if relevance >= min_relevance:
                candidates.append((relevance, item))
        
        # Sort by relevance and return top results
        candidates.sort(key=lambda x: x[0], reverse=True)
        results = []
        
        for relevance, item in candidates[:limit]:
            item.access()
            results.append({
                "content": item.content,
                "type": item.item_type,
                "relevance": relevance,
                "timestamp": item.timestamp,
                "confidence": item.confidence
            })
        
        self.stats["items_retrieved"] += len(results)
        return results
    
    def get_conversation_context(self, last_n_turns: int = 10) -> List[Dict[str, Any]]:
        """Get recent conversation context."""
        recent_turns = self.conversation_history[-last_n_turns:]
        context = []
        
        for item in recent_turns:
            item.access()
            context.append(item.content)
        
        return context
    
    def get_relevant_patterns(
        self,
        context: str,
        min_confidence: float = 0.5
    ) -> Dict[str, Any]:
        """Get learned patterns relevant to current context."""
        context_tags = set(context.lower().split())
        relevant_patterns = {}
        
        for pattern_name, pattern_item in self.learned_patterns.items():
            if pattern_item.confidence < min_confidence:
                continue
            
            relevance = pattern_item.calculate_relevance_score(context_tags)
            if relevance > 0.3:
                pattern_item.access()
                relevant_patterns[pattern_name] = {
                    "data": pattern_item.content,
                    "confidence": pattern_item.confidence,
                    "relevance": relevance
                }
        
        return relevant_patterns
    
    def consolidate_memory(self) -> Dict[str, int]:
        """Consolidate memory by promoting important short-term memories."""
        promoted_count = 0
        consolidated_patterns = 0
        
        # Find high-importance or frequently accessed items
        for item in self.short_term_memory[:]:
            if item.importance > 0.8 or item.access_count > 5:
                # Promote to learned patterns if it represents a pattern
                if item.item_type in ["observation:career_page", "action_result"]:
                    pattern_name = f"auto_pattern_{hashlib.md5(str(item.content).encode()).hexdigest()[:8]}"
                    self.learn_pattern(pattern_name, {
                        "original_content": item.content,
                        "type": item.item_type,
                        "learned_from": "consolidation"
                    }, importance=item.importance)
                    consolidated_patterns += 1
                promoted_count += 1
        
        return {
            "promoted_items": promoted_count,
            "consolidated_patterns": consolidated_patterns,
            "total_short_term": len(self.short_term_memory),
            "total_patterns": len(self.learned_patterns)
        }
    
    def cleanup_old_memories(self, max_age_hours: int = 168) -> int:  # 1 week default
        """Clean up old, low-importance memories."""
        cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)
        removed_count = 0
        
        # Clean short-term memory
        original_length = len(self.short_term_memory)
        self.short_term_memory = [
            item for item in self.short_term_memory
            if item.timestamp > cutoff_time or item.importance > 0.7
        ]
        removed_count = original_length - len(self.short_term_memory)
        
        return removed_count
    
    def get_memory_stats(self) -> Dict[str, Any]:
        """Get comprehensive memory statistics."""
        total_items = (
            len(self.short_term_memory) +
            len(self.working_memory) +
            len(self.conversation_history) +
            len(self.learned_patterns)
        )
        
        return {
            "total_items": total_items,
            "short_term_items": len(self.short_term_memory),
            "working_memory_items": len(self.working_memory),
            "conversation_turns": len(self.conversation_history),
            "learned_patterns": len(self.learned_patterns),
            "memory_utilization": {
                "short_term": len(self.short_term_memory) / self.short_term_capacity,
                "working": len(self.working_memory) / self.working_memory_capacity
            },
            "access_stats": self.stats.copy()
        }
    
    def _manage_short_term_capacity(self) -> None:
        """Manage short-term memory capacity using LRU with importance weighting."""
        if len(self.short_term_memory) <= self.short_term_capacity:
            return
        
        # Sort by combined score (recency + importance)
        def score_item(item: MemoryItem) -> float:
            age_penalty = item.get_age_hours() / 24.0  # Normalize to days
            return item.importance - age_penalty * 0.5
        
        self.short_term_memory.sort(key=score_item, reverse=True)
        self.short_term_memory = self.short_term_memory[:self.short_term_capacity]
    
    def _manage_working_memory_capacity(self) -> None:
        """Manage working memory capacity."""
        if len(self.working_memory) <= self.working_memory_capacity:
            return
        
        # Remove least important and least recently accessed items
        items_with_keys = [
            (key, item, item.calculate_relevance_score())
            for key, item in self.working_memory.items()
        ]
        
        items_with_keys.sort(key=lambda x: x[2], reverse=True)
        
        # Keep top items
        to_keep = items_with_keys[:self.working_memory_capacity]
        self.working_memory = {key: item for key, item, _ in to_keep}
    
    def _generate_item_id(self, item: MemoryItem) -> str:
        """Generate unique ID for memory item."""
        content_hash = hashlib.md5(str(item.content).encode()).hexdigest()
        return f"{self.agent_name}_{item.timestamp.strftime('%Y%m%d_%H%M%S')}_{content_hash[:8]}"
    
    def _save_pattern(self, pattern_name: str) -> None:
        """Save pattern to persistent storage."""
        if not self.persistence_dir:
            return
        
        try:
            pattern_file = self.persistence_dir / f"{pattern_name}.pkl"
            with open(pattern_file, 'wb') as f:
                pickle.dump(self.learned_patterns[pattern_name], f)
        except Exception as e:
            logger.error(f"Failed to save pattern {pattern_name}: {e}")
    
    def _load_persistent_memory(self) -> None:
        """Load persistent memory from storage."""
        if not self.persistence_dir.exists():
            return
        
        try:
            for pattern_file in self.persistence_dir.glob("*.pkl"):
                pattern_name = pattern_file.stem
                with open(pattern_file, 'rb') as f:
                    pattern_item = pickle.load(f)
                    self.learned_patterns[pattern_name] = pattern_item
                    
            logger.info(f"Loaded {len(self.learned_patterns)} persistent patterns")
        except Exception as e:
            logger.error(f"Failed to load persistent memory: {e}")