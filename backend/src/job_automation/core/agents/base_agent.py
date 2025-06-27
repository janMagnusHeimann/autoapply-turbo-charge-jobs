"""
Base Agent Framework implementing OODA (Observe-Orient-Decide-Act) loop
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class AgentState(BaseModel):
    """OODA Loop State Management"""
    observation: Dict[str, Any] = {}
    orientation: Dict[str, Any] = {}
    decision: Optional[Dict[str, Any]] = None
    action: Optional[Dict[str, Any]] = None
    memory: List[Dict[str, Any]] = []

class AgentAction(BaseModel):
    """Structured action format"""
    action_type: str
    parameters: Dict[str, Any]
    confidence: float
    reasoning: str

class BaseAgent(ABC):
    """
    Base agent implementing OODA (Observe-Orient-Decide-Act) loop
    inspired by browser-use architecture
    """
    
    def __init__(
        self,
        name: str,
        llm_client: Any,
        use_vision: bool = False,
        max_retries: int = 3,
        memory_limit: int = 50
    ):
        self.name = name
        self.llm_client = llm_client
        self.use_vision = use_vision
        self.max_retries = max_retries
        self.memory_limit = memory_limit
        self.state = AgentState()
    
    async def execute(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Main execution loop following OODA pattern"""
        try:
            logger.info(f"🤖 {self.name} starting task: {task.get('action', 'unknown')}")
            
            # Observe
            observation = await self.observe(task)
            self.state.observation = observation
            
            # Orient
            orientation = await self.orient(observation)
            self.state.orientation = orientation
            
            # Decide
            decision = await self.decide(orientation)
            self.state.decision = decision
            
            # Act
            result = await self.act(decision)
            
            # Update memory
            await self.update_memory(result)
            
            logger.info(f"✅ {self.name} completed task successfully")
            return result
            
        except Exception as e:
            logger.error(f"❌ {self.name} failed: {e}")
            return await self.handle_error(e)
    
    @abstractmethod
    async def observe(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Gather information about current state"""
        pass
    
    @abstractmethod
    async def orient(self, observation: Dict[str, Any]) -> Dict[str, Any]:
        """Process and contextualize observations"""
        pass
    
    @abstractmethod
    async def decide(self, orientation: Dict[str, Any]) -> Dict[str, Any]:
        """Make decision based on oriented information"""
        pass
    
    @abstractmethod
    async def act(self, decision: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the decided action"""
        pass
    
    async def update_memory(self, result: Dict[str, Any]):
        """Update agent memory with consolidation"""
        self.state.memory.append({
            "timestamp": datetime.utcnow(),
            "action": self.state.decision,
            "result": result
        })
        
        # Memory consolidation when limit reached
        if len(self.state.memory) > self.memory_limit:
            await self.consolidate_memory()
    
    async def consolidate_memory(self):
        """Consolidate memory to prevent context overflow"""
        # Keep only recent memory
        self.state.memory = self.state.memory[-10:]
    
    def get_structured_prompt(self, template: str, **kwargs) -> str:
        """Generate structured prompts for LLM"""
        return template.format(**kwargs)
    
    async def handle_error(self, error: Exception) -> Dict[str, Any]:
        """Graceful error handling with retry logic"""
        return {
            "status": "error", 
            "message": str(error),
            "agent": self.name
        } 