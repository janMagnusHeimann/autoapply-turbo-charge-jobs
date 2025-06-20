"""Base class for all agent tools."""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from dataclasses import dataclass


@dataclass
class ToolParameter:
    """Definition of a tool parameter."""
    name: str
    type: str
    description: str
    required: bool = True
    default: Any = None


@dataclass
class ToolResult:
    """Result of tool execution."""
    success: bool
    data: Any = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class BaseTool(ABC):
    """Base class for all agent tools."""
    
    def __init__(self):
        self.name = self.__class__.__name__
        self.description = self.__doc__ or "No description provided"
        self.parameters = self._define_parameters()
    
    @abstractmethod
    def _define_parameters(self) -> List[ToolParameter]:
        """Define the parameters this tool accepts."""
        pass
    
    @abstractmethod
    def execute(self, **kwargs) -> ToolResult:
        """Execute the tool with given parameters."""
        pass
    
    def validate_parameters(self, **kwargs) -> bool:
        """Validate that all required parameters are provided."""
        for param in self.parameters:
            if param.required and param.name not in kwargs:
                return False
        return True
    
    def get_parameter_schema(self) -> Dict[str, Any]:
        """Get JSON schema for tool parameters."""
        schema = {
            "type": "object",
            "properties": {},
            "required": []
        }
        
        for param in self.parameters:
            schema["properties"][param.name] = {
                "type": param.type,
                "description": param.description
            }
            
            if param.default is not None:
                schema["properties"][param.name]["default"] = param.default
            
            if param.required:
                schema["required"].append(param.name)
        
        return schema
    
    def get_tool_info(self) -> Dict[str, Any]:
        """Get comprehensive tool information."""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": [
                {
                    "name": p.name,
                    "type": p.type,
                    "description": p.description,
                    "required": p.required,
                    "default": p.default
                }
                for p in self.parameters
            ],
            "schema": self.get_parameter_schema()
        }