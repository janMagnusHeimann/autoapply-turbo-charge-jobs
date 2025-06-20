"""Unified memory manager for AI agents."""

from typing import Dict, List, Any, Optional
from .short_term_memory import ShortTermMemory
from .long_term_memory import LongTermMemory


class MemoryManager:
    """Coordinates short-term and long-term memory for AI agents."""
    
    def __init__(self, storage_backend=None, short_term_max_size: int = 100):
        self.short_term = ShortTermMemory(max_size=short_term_max_size)
        self.long_term = LongTermMemory(storage_backend=storage_backend)
        
        # Load existing long-term memory
        self.long_term.load_from_storage()
    
    def add_interaction(self, user_input: str, agent_response: str, metadata: Optional[Dict[str, Any]] = None):
        """Add interaction to short-term memory."""
        self.short_term.add_interaction(user_input, agent_response, metadata)
    
    def add_knowledge(self, category: str, key: str, value: Any, metadata: Optional[Dict[str, Any]] = None):
        """Add knowledge to long-term memory."""
        self.long_term.add_knowledge(category, key, value, metadata)
    
    def add_experience(self, experience_type: str, data: Dict[str, Any], outcome: str):
        """Add experience to long-term memory for learning."""
        self.long_term.add_experience(experience_type, data, outcome)
    
    def get_context(self, key: str) -> Any:
        """Get context from short-term memory."""
        return self.short_term.get_context(key)
    
    def set_context(self, key: str, value: Any):
        """Set context in short-term memory."""
        self.short_term.set_context(key, value)
    
    def get_knowledge(self, category: str, key: Optional[str] = None) -> Any:
        """Get knowledge from long-term memory."""
        return self.long_term.get_knowledge(category, key)
    
    def get_recent_interactions(self, count: int = 5) -> List[Dict[str, Any]]:
        """Get recent interactions from short-term memory."""
        return self.short_term.get_recent_interactions(count)
    
    def get_experiences(self, experience_type: Optional[str] = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Get experiences from long-term memory."""
        return self.long_term.get_experiences(experience_type, limit)
    
    def get_patterns(self, pattern_type: Optional[str] = None) -> Dict[str, Any]:
        """Get learned patterns from long-term memory."""
        return self.long_term.get_patterns(pattern_type)
    
    def consolidate_memory(self):
        """Transfer important short-term memories to long-term storage."""
        recent_interactions = self.short_term.get_recent_interactions(10)
        
        for interaction in recent_interactions:
            # Determine if interaction should be preserved long-term
            if self._should_preserve(interaction):
                self.long_term.add_knowledge(
                    "important_interactions",
                    interaction["timestamp"],
                    interaction,
                    {"consolidated": True}
                )
    
    def _should_preserve(self, interaction: Dict[str, Any]) -> bool:
        """Determine if an interaction should be preserved in long-term memory."""
        # Simple heuristics - can be enhanced with ML
        user_input = interaction.get("user_input", "").lower()
        agent_response = interaction.get("agent_response", "").lower()
        
        # Preserve interactions with important keywords
        important_keywords = ["remember", "important", "save", "learn", "error", "success"]
        
        for keyword in important_keywords:
            if keyword in user_input or keyword in agent_response:
                return True
        
        # Preserve long interactions (might contain valuable information)
        if len(user_input) > 100 or len(agent_response) > 200:
            return True
        
        return False
    
    def clear_short_term(self):
        """Clear short-term memory."""
        self.short_term.clear_memory()
    
    def clear_all_memory(self):
        """Clear all memory (use with caution)."""
        self.short_term.clear_memory()
        self.long_term.clear_memory()
    
    def get_memory_stats(self) -> Dict[str, Any]:
        """Get statistics about memory usage."""
        return {
            "short_term_interactions": len(self.short_term.memory),
            "short_term_context_keys": len(self.short_term.context),
            "long_term_knowledge_categories": len(self.long_term.knowledge_base),
            "long_term_experiences": len(self.long_term.experiences),
            "learned_patterns": len(self.long_term.patterns)
        }