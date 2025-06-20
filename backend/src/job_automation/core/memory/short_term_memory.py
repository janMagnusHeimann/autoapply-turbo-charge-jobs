"""Short-term memory implementation for agent context."""

from typing import Dict, List, Any, Optional
from datetime import datetime
import json


class ShortTermMemory:
    """Manages short-term memory for agent conversations and context."""
    
    def __init__(self, max_size: int = 100):
        self.max_size = max_size
        self.memory: List[Dict[str, Any]] = []
        self.context: Dict[str, Any] = {}
    
    def add_interaction(self, user_input: str, agent_response: str, metadata: Optional[Dict[str, Any]] = None):
        """Add an interaction to short-term memory."""
        interaction = {
            "timestamp": datetime.now().isoformat(),
            "user_input": user_input,
            "agent_response": agent_response,
            "metadata": metadata or {}
        }
        
        self.memory.append(interaction)
        
        # Keep memory within size limit
        if len(self.memory) > self.max_size:
            self.memory.pop(0)
    
    def get_recent_interactions(self, count: int = 5) -> List[Dict[str, Any]]:
        """Get the most recent interactions."""
        return self.memory[-count:] if count <= len(self.memory) else self.memory
    
    def set_context(self, key: str, value: Any):
        """Set a context variable."""
        self.context[key] = value
    
    def get_context(self, key: str) -> Any:
        """Get a context variable."""
        return self.context.get(key)
    
    def clear_context(self):
        """Clear all context variables."""
        self.context.clear()
    
    def clear_memory(self):
        """Clear all memory."""
        self.memory.clear()
        self.context.clear()
    
    def to_dict(self) -> Dict[str, Any]:
        """Export memory to dictionary."""
        return {
            "memory": self.memory,
            "context": self.context,
            "max_size": self.max_size
        }
    
    def from_dict(self, data: Dict[str, Any]):
        """Import memory from dictionary."""
        self.memory = data.get("memory", [])
        self.context = data.get("context", {})
        self.max_size = data.get("max_size", 100)