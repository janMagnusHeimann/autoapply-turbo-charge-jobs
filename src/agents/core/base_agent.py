"""
Base Agent Implementation following OODA (Observe-Orient-Decide-Act) loop pattern.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Union, Callable
from dataclasses import dataclass, field
from datetime import datetime
import json
import asyncio
import logging
from enum import Enum

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class AgentState(Enum):
    """Agent execution states."""
    IDLE = "idle"
    OBSERVING = "observing"
    ORIENTING = "orienting" 
    DECIDING = "deciding"
    ACTING = "acting"
    ERROR = "error"
    COMPLETED = "completed"


class ActionType(Enum):
    """Standard action types for agents."""
    NAVIGATE = "navigate"
    EXTRACT_DATA = "extract_data"
    CLICK_ELEMENT = "click_element"
    SCROLL = "scroll"
    WAIT = "wait"
    ANALYZE_CONTENT = "analyze_content"
    TAKE_SCREENSHOT = "take_screenshot"
    CUSTOM = "custom"


@dataclass
class AgentAction:
    """Represents an action the agent can take."""
    action_type: ActionType
    parameters: Dict[str, Any] = field(default_factory=dict)
    confidence: float = 1.0
    reasoning: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "action_type": self.action_type.value,
            "parameters": self.parameters,
            "confidence": self.confidence,
            "reasoning": self.reasoning,
            "timestamp": self.timestamp.isoformat()
        }


@dataclass
class AgentObservation:
    """Represents what the agent observes."""
    content: Dict[str, Any]
    observation_type: str
    confidence: float = 1.0
    timestamp: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentMemory:
    """Agent's memory context."""
    short_term: List[Dict[str, Any]] = field(default_factory=list)
    working_memory: Dict[str, Any] = field(default_factory=dict)
    conversation_history: List[Dict[str, Any]] = field(default_factory=list)
    learned_patterns: Dict[str, Any] = field(default_factory=dict)
    
    def add_to_short_term(self, item: Dict[str, Any]) -> None:
        """Add item to short-term memory with size limit."""
        self.short_term.append(item)
        if len(self.short_term) > 50:  # Keep last 50 items
            self.short_term = self.short_term[-50:]
    
    def update_working_memory(self, key: str, value: Any) -> None:
        """Update working memory."""
        self.working_memory[key] = value
    
    def add_conversation_turn(self, role: str, content: str) -> None:
        """Add conversation turn to history."""
        self.conversation_history.append({
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Keep conversation history manageable
        if len(self.conversation_history) > 100:
            self.conversation_history = self.conversation_history[-100:]


class BaseAgent(ABC):
    """
    Abstract base class for all agents implementing the OODA loop pattern.
    
    OODA Loop:
    - Observe: Gather information from environment
    - Orient: Analyze and understand the situation
    - Decide: Choose the best course of action
    - Act: Execute the chosen action
    """
    
    def __init__(
        self,
        name: str,
        llm_client: Any,
        browser_controller: Optional[Any] = None,
        config: Optional[Dict[str, Any]] = None,
        tools: Optional[List[Callable]] = None
    ):
        self.name = name
        self.llm_client = llm_client
        self.browser_controller = browser_controller
        self.config = config or {}
        self.tools = tools or []
        
        # Agent state
        self.state = AgentState.IDLE
        self.memory = AgentMemory()
        self.current_task = None
        self.retry_count = 0
        self.max_retries = self.config.get('max_retries', 3)
        
        # Performance tracking
        self.start_time = None
        self.actions_taken = []
        self.errors_encountered = []
        
        self.logger = logging.getLogger(f"{__name__}.{name}")
    
    async def execute_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main execution method implementing the OODA loop.
        
        Args:
            task: Task description and parameters
            
        Returns:
            Task execution result
        """
        self.current_task = task
        self.start_time = datetime.utcnow()
        self.state = AgentState.OBSERVING
        
        try:
            self.logger.info(f"Starting task execution: {task.get('description', 'Unknown task')}")
            
            # OODA Loop execution
            while self.state not in [AgentState.COMPLETED, AgentState.ERROR]:
                if self.state == AgentState.OBSERVING:
                    observation = await self._observe()
                    self.state = AgentState.ORIENTING
                    
                elif self.state == AgentState.ORIENTING:
                    context = await self._orient(observation)
                    self.state = AgentState.DECIDING
                    
                elif self.state == AgentState.DECIDING:
                    action = await self._decide(context)
                    self.state = AgentState.ACTING
                    
                elif self.state == AgentState.ACTING:
                    result = await self._act(action)
                    
                    # Determine next state based on result
                    if self._is_task_complete(result):
                        self.state = AgentState.COMPLETED
                    else:
                        self.state = AgentState.OBSERVING
            
            # Compile final result
            execution_time = (datetime.utcnow() - self.start_time).total_seconds()
            
            return {
                "success": self.state == AgentState.COMPLETED,
                "result": self._compile_result(),
                "execution_time": execution_time,
                "actions_taken": len(self.actions_taken),
                "errors": len(self.errors_encountered)
            }
            
        except Exception as e:
            self.logger.error(f"Task execution failed: {str(e)}")
            self.state = AgentState.ERROR
            self.errors_encountered.append({
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            })
            
            if self.retry_count < self.max_retries:
                self.retry_count += 1
                self.logger.info(f"Retrying task (attempt {self.retry_count}/{self.max_retries})")
                await asyncio.sleep(2 ** self.retry_count)  # Exponential backoff
                return await self.execute_task(task)
            
            return {
                "success": False,
                "error": str(e),
                "execution_time": (datetime.utcnow() - self.start_time).total_seconds(),
                "retry_count": self.retry_count
            }
    
    @abstractmethod
    async def _observe(self) -> AgentObservation:
        """
        OBSERVE: Gather information from the environment.
        Must be implemented by concrete agents.
        """
        pass
    
    @abstractmethod
    async def _orient(self, observation: AgentObservation) -> Dict[str, Any]:
        """
        ORIENT: Analyze and understand the current situation.
        Must be implemented by concrete agents.
        """
        pass
    
    @abstractmethod
    async def _decide(self, context: Dict[str, Any]) -> AgentAction:
        """
        DECIDE: Choose the best course of action.
        Must be implemented by concrete agents.
        """
        pass
    
    async def _act(self, action: AgentAction) -> Dict[str, Any]:
        """
        ACT: Execute the chosen action.
        Default implementation handles common actions.
        """
        self.actions_taken.append(action)
        self.memory.add_to_short_term({
            "type": "action",
            "action": action.to_dict()
        })
        
        try:
            if action.action_type == ActionType.NAVIGATE:
                return await self._handle_navigate(action)
            elif action.action_type == ActionType.EXTRACT_DATA:
                return await self._handle_extract_data(action)
            elif action.action_type == ActionType.TAKE_SCREENSHOT:
                return await self._handle_screenshot(action)
            elif action.action_type == ActionType.WAIT:
                await asyncio.sleep(action.parameters.get('duration', 1))
                return {"success": True, "waited": action.parameters.get('duration', 1)}
            else:
                # Delegate to subclass for custom actions
                return await self._handle_custom_action(action)
                
        except Exception as e:
            self.logger.error(f"Action execution failed: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _handle_navigate(self, action: AgentAction) -> Dict[str, Any]:
        """Handle navigation actions."""
        if not self.browser_controller:
            raise ValueError("Browser controller required for navigation")
        
        url = action.parameters.get('url')
        if not url:
            raise ValueError("URL required for navigation")
        
        result = await self.browser_controller.navigate(url)
        return {"success": True, "navigated_to": url, "result": result}
    
    async def _handle_extract_data(self, action: AgentAction) -> Dict[str, Any]:
        """Handle data extraction actions."""
        if not self.browser_controller:
            raise ValueError("Browser controller required for data extraction")
        
        selector = action.parameters.get('selector')
        extraction_type = action.parameters.get('extraction_type', 'text')
        
        result = await self.browser_controller.extract_data(selector, extraction_type)
        return {"success": True, "data": result}
    
    async def _handle_screenshot(self, action: AgentAction) -> Dict[str, Any]:
        """Handle screenshot actions."""
        if not self.browser_controller:
            raise ValueError("Browser controller required for screenshots")
        
        screenshot_path = await self.browser_controller.capture_screenshot()
        return {"success": True, "screenshot_path": screenshot_path}
    
    @abstractmethod
    async def _handle_custom_action(self, action: AgentAction) -> Dict[str, Any]:
        """Handle custom actions specific to the agent implementation."""
        pass
    
    @abstractmethod
    def _is_task_complete(self, action_result: Dict[str, Any]) -> bool:
        """Determine if the current task is complete based on the last action result."""
        pass
    
    @abstractmethod
    def _compile_result(self) -> Dict[str, Any]:
        """Compile final task result."""
        pass
    
    async def _call_llm(self, messages: List[Dict[str, str]], **kwargs) -> str:
        """Helper to call LLM with retry logic."""
        model = kwargs.pop("model", self.config.get("default_llm_model", "gpt-4o"))
        retries = self.config.get('llm_retries', 2)
        
        for attempt in range(retries):
            try:
                response = await self.llm_client.chat.completions.create(
                    model=model,
                    messages=messages,
                    **kwargs
                )
                return response.choices[0].message.content.strip()
            
            except Exception as e:
                self.logger.error(f"LLM call failed: {e}")
                if attempt == retries - 1:
                    raise  # Re-raise the exception after the last attempt
                await asyncio.sleep(1 * (attempt + 1)) # Simple backoff

    def get_status(self) -> Dict[str, Any]:
        """Get current agent status."""
        return {
            "name": self.name,
            "state": self.state.value,
            "current_task": self.current_task,
            "actions_taken": len(self.actions_taken),
            "errors_encountered": len(self.errors_encountered),
            "retry_count": self.retry_count,
            "uptime": (datetime.utcnow() - self.start_time).total_seconds() if self.start_time else 0
        }
    
    def reset(self) -> None:
        """Reset agent to initial state."""
        self.state = AgentState.IDLE
        self.current_task = None
        self.retry_count = 0
        self.start_time = None
        self.actions_taken = []
        self.errors_encountered = []
        # Preserve learned patterns but clear working memory
        self.memory.working_memory = {}
        self.memory.short_term = []