"""Registry for managing available tools."""

from typing import Dict, List, Optional, Type
from .base_tool import BaseTool


class ToolRegistry:
    """Registry for managing and discovering available tools."""
    
    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
        self._tool_classes: Dict[str, Type[BaseTool]] = {}
    
    def register_tool(self, tool_class: Type[BaseTool]) -> None:
        """Register a tool class."""
        tool_instance = tool_class()
        tool_name = tool_instance.name
        
        self._tools[tool_name] = tool_instance
        self._tool_classes[tool_name] = tool_class
    
    def register_tool_instance(self, tool: BaseTool) -> None:
        """Register a tool instance."""
        self._tools[tool.name] = tool
        self._tool_classes[tool.name] = tool.__class__
    
    def get_tool(self, name: str) -> Optional[BaseTool]:
        """Get a tool by name."""
        return self._tools.get(name)
    
    def get_all_tools(self) -> Dict[str, BaseTool]:
        """Get all registered tools."""
        return self._tools.copy()
    
    def list_tool_names(self) -> List[str]:
        """Get list of all tool names."""
        return list(self._tools.keys())
    
    def get_tools_by_category(self, category: str) -> List[BaseTool]:
        """Get tools by category (based on class module)."""
        tools = []
        for tool in self._tools.values():
            if hasattr(tool, 'category') and tool.category == category:
                tools.append(tool)
        return tools
    
    def search_tools(self, query: str) -> List[BaseTool]:
        """Search tools by name or description."""
        query_lower = query.lower()
        matching_tools = []
        
        for tool in self._tools.values():
            if (query_lower in tool.name.lower() or 
                query_lower in tool.description.lower()):
                matching_tools.append(tool)
        
        return matching_tools
    
    def get_tool_info(self, name: str) -> Optional[Dict]:
        """Get comprehensive info about a tool."""
        tool = self.get_tool(name)
        return tool.get_tool_info() if tool else None
    
    def get_all_tools_info(self) -> List[Dict]:
        """Get info for all registered tools."""
        return [tool.get_tool_info() for tool in self._tools.values()]
    
    def unregister_tool(self, name: str) -> bool:
        """Unregister a tool."""
        if name in self._tools:
            del self._tools[name]
            del self._tool_classes[name]
            return True
        return False
    
    def clear_registry(self) -> None:
        """Clear all registered tools."""
        self._tools.clear()
        self._tool_classes.clear()
    
    def validate_tool_availability(self, tool_names: List[str]) -> Dict[str, bool]:
        """Check if specified tools are available."""
        return {name: name in self._tools for name in tool_names}