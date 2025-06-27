"""
Shared tool registry and utilities for agents.
Provides a centralized way to manage and access tools across different agents.
"""

from typing import Any, Dict, List, Optional, Callable, Union
from dataclasses import dataclass
from abc import ABC, abstractmethod
import asyncio
import logging
from enum import Enum
import json
import inspect

logger = logging.getLogger(__name__)


class ToolCategory(Enum):
    """Categories of tools available to agents."""
    BROWSER = "browser"
    DATA_EXTRACTION = "data_extraction" 
    ANALYSIS = "analysis"
    COMMUNICATION = "communication"
    FILE_SYSTEM = "file_system"
    API = "api"
    UTILITY = "utility"


@dataclass
class ToolDefinition:
    """Definition of a tool that can be used by agents."""
    name: str
    description: str
    category: ToolCategory
    function: Callable
    parameters_schema: Dict[str, Any]
    returns_schema: Optional[Dict[str, Any]] = None
    requires_browser: bool = False
    requires_llm: bool = False
    cost_estimate: float = 0.0  # Estimated cost per call
    async_compatible: bool = True
    
    def __post_init__(self):
        # Auto-detect if function is async
        if not self.async_compatible and asyncio.iscoroutinefunction(self.function):
            self.async_compatible = True


class BaseTool(ABC):
    """Base class for agent tools."""
    
    def __init__(self, name: str, description: str, category: ToolCategory):
        self.name = name
        self.description = description
        self.category = category
        self.usage_count = 0
        self.error_count = 0
        self.total_execution_time = 0.0
    
    @abstractmethod
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """Execute the tool with given parameters."""
        pass
    
    def get_schema(self) -> Dict[str, Any]:
        """Get the tool's parameter schema."""
        return {
            "name": self.name,
            "description": self.description,
            "category": self.category.value,
            "parameters": self._get_parameters_schema()
        }
    
    @abstractmethod
    def _get_parameters_schema(self) -> Dict[str, Any]:
        """Get the parameters schema for the tool."""
        pass
    
    def get_stats(self) -> Dict[str, Any]:
        """Get usage statistics for the tool."""
        avg_execution_time = (
            self.total_execution_time / self.usage_count
            if self.usage_count > 0 else 0
        )
        
        return {
            "name": self.name,
            "usage_count": self.usage_count,
            "error_count": self.error_count,
            "error_rate": self.error_count / max(1, self.usage_count),
            "avg_execution_time": avg_execution_time
        }


class NavigationTool(BaseTool):
    """Tool for web navigation."""
    
    def __init__(self, browser_controller):
        super().__init__(
            name="navigate",
            description="Navigate to a URL",
            category=ToolCategory.BROWSER
        )
        self.browser_controller = browser_controller
    
    async def execute(self, url: str, wait_for_load: bool = True) -> Dict[str, Any]:
        """Navigate to a URL."""
        start_time = asyncio.get_event_loop().time()
        
        try:
            self.usage_count += 1
            result = await self.browser_controller.navigate(url, wait_for_load)
            
            execution_time = asyncio.get_event_loop().time() - start_time
            self.total_execution_time += execution_time
            
            return {
                "success": True,
                "url": url,
                "final_url": result.get("final_url", url),
                "execution_time": execution_time
            }
            
        except Exception as e:
            self.error_count += 1
            logger.error(f"Navigation failed for {url}: {e}")
            return {"success": False, "error": str(e), "url": url}
    
    def _get_parameters_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "URL to navigate to"
                },
                "wait_for_load": {
                    "type": "boolean",
                    "description": "Whether to wait for page load",
                    "default": True
                }
            },
            "required": ["url"]
        }


class DataExtractionTool(BaseTool):
    """Tool for extracting data from web pages."""
    
    def __init__(self, browser_controller):
        super().__init__(
            name="extract_data",
            description="Extract data from current page",
            category=ToolCategory.DATA_EXTRACTION
        )
        self.browser_controller = browser_controller
    
    async def execute(
        self,
        selector: Optional[str] = None,
        extraction_type: str = "text",
        attribute: Optional[str] = None
    ) -> Dict[str, Any]:
        """Extract data from the current page."""
        start_time = asyncio.get_event_loop().time()
        
        try:
            self.usage_count += 1
            
            if extraction_type == "dom":
                result = await self.browser_controller.get_dom_content()
            elif extraction_type == "screenshot":
                result = await self.browser_controller.capture_screenshot()
            elif selector:
                result = await self.browser_controller.extract_elements(
                    selector, extraction_type, attribute
                )
            else:
                result = await self.browser_controller.get_page_content()
            
            execution_time = asyncio.get_event_loop().time() - start_time
            self.total_execution_time += execution_time
            
            return {
                "success": True,
                "data": result,
                "extraction_type": extraction_type,
                "execution_time": execution_time
            }
            
        except Exception as e:
            self.error_count += 1
            logger.error(f"Data extraction failed: {e}")
            return {"success": False, "error": str(e)}
    
    def _get_parameters_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "selector": {
                    "type": "string",
                    "description": "CSS selector for elements to extract"
                },
                "extraction_type": {
                    "type": "string",
                    "enum": ["text", "html", "attribute", "dom", "screenshot"],
                    "description": "Type of data to extract",
                    "default": "text"
                },
                "attribute": {
                    "type": "string",
                    "description": "Attribute name when extraction_type is 'attribute'"
                }
            }
        }


class ContentAnalysisTool(BaseTool):
    """Tool for analyzing content using LLM."""
    
    def __init__(self, llm_client):
        super().__init__(
            name="analyze_content",
            description="Analyze content using AI",
            category=ToolCategory.ANALYSIS
        )
        self.llm_client = llm_client
    
    async def execute(
        self,
        content: str,
        analysis_type: str = "general",
        specific_questions: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Analyze content using LLM."""
        start_time = asyncio.get_event_loop().time()
        
        try:
            self.usage_count += 1
            
            # Build analysis prompt based on type
            if analysis_type == "job_extraction":
                prompt = self._build_job_extraction_prompt(content, specific_questions)
            elif analysis_type == "career_page_detection":
                prompt = self._build_career_page_prompt(content)
            elif analysis_type == "navigation_decision":
                prompt = self._build_navigation_prompt(content, specific_questions)
            else:
                prompt = self._build_general_analysis_prompt(content, specific_questions)
            
            # Call LLM
            response = await self.llm_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="gpt-4o-mini",  # Use cheaper model for analysis
                temperature=0.1
            )
            
            result = response.choices[0].message.content
            
            execution_time = asyncio.get_event_loop().time() - start_time
            self.total_execution_time += execution_time
            
            return {
                "success": True,
                "analysis": result,
                "analysis_type": analysis_type,
                "execution_time": execution_time
            }
            
        except Exception as e:
            self.error_count += 1
            logger.error(f"Content analysis failed: {e}")
            return {"success": False, "error": str(e)}
    
    def _build_job_extraction_prompt(
        self,
        content: str,
        questions: Optional[List[str]] = None
    ) -> str:
        """Build prompt for job extraction analysis."""
        base_prompt = """
        Analyze the following web page content and extract job listings.
        
        For each job found, extract:
        - Job title
        - Location
        - Job type (remote/hybrid/onsite)
        - Experience level
        - Key skills mentioned
        - Application URL or method
        
        Return the results as a JSON array.
        
        Content:
        {content}
        """
        
        if questions:
            base_prompt += f"\n\nSpecific questions to address: {json.dumps(questions)}"
        
        return base_prompt.format(content=content[:8000])  # Limit content length
    
    def _build_career_page_prompt(self, content: str) -> str:
        """Build prompt for career page detection."""
        return f"""
        Analyze the following web page content and determine if it's a career/jobs page.
        
        Look for indicators like:
        - Job listings
        - "Join our team" messaging
        - Application processes
        - Company culture information
        - Employee benefits
        
        Provide a confidence score (0-1) and reasoning.
        
        Content:
        {content[:4000]}
        """
    
    def _build_navigation_prompt(
        self,
        content: str,
        questions: Optional[List[str]] = None
    ) -> str:
        """Build prompt for navigation decisions."""
        prompt = f"""
        Analyze the current web page and suggest the next navigation action.
        
        Look for:
        - Career/jobs links
        - Navigation menus
        - Relevant buttons or links
        - Forms to fill
        
        Suggest the best element to click or action to take.
        
        Content:
        {content[:6000]}
        """
        
        if questions:
            prompt += f"\n\nSpecific context: {json.dumps(questions)}"
        
        return prompt
    
    def _build_general_analysis_prompt(
        self,
        content: str,
        questions: Optional[List[str]] = None
    ) -> str:
        """Build general analysis prompt."""
        prompt = f"Analyze the following content:\n\n{content[:6000]}"
        
        if questions:
            prompt += f"\n\nSpecifically address these questions: {json.dumps(questions)}"
        
        return prompt
    
    def _get_parameters_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "content": {
                    "type": "string",
                    "description": "Content to analyze"
                },
                "analysis_type": {
                    "type": "string",
                    "enum": ["general", "job_extraction", "career_page_detection", "navigation_decision"],
                    "description": "Type of analysis to perform",
                    "default": "general"
                },
                "specific_questions": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Specific questions to address in analysis"
                }
            },
            "required": ["content"]
        }


class AgentToolRegistry:
    """Registry for managing agent tools."""
    
    def __init__(self):
        self.tools: Dict[str, BaseTool] = {}
        self.tool_categories: Dict[ToolCategory, List[str]] = {
            category: [] for category in ToolCategory
        }
    
    def register_tool(self, tool: BaseTool) -> None:
        """Register a tool in the registry."""
        self.tools[tool.name] = tool
        self.tool_categories[tool.category].append(tool.name)
        logger.info(f"Registered tool: {tool.name} ({tool.category.value})")
    
    def get_tool(self, name: str) -> Optional[BaseTool]:
        """Get a tool by name."""
        return self.tools.get(name)
    
    def get_tools_by_category(self, category: ToolCategory) -> List[BaseTool]:
        """Get all tools in a category."""
        return [self.tools[name] for name in self.tool_categories[category]]
    
    def get_all_tools(self) -> List[BaseTool]:
        """Get all registered tools."""
        return list(self.tools.values())
    
    def get_tool_schemas(self) -> List[Dict[str, Any]]:
        """Get schemas for all tools."""
        return [tool.get_schema() for tool in self.tools.values()]
    
    def get_registry_stats(self) -> Dict[str, Any]:
        """Get comprehensive registry statistics."""
        total_usage = sum(tool.usage_count for tool in self.tools.values())
        total_errors = sum(tool.error_count for tool in self.tools.values())
        
        category_stats = {}
        for category, tool_names in self.tool_categories.items():
            tools = [self.tools[name] for name in tool_names]
            category_stats[category.value] = {
                "tool_count": len(tools),
                "total_usage": sum(tool.usage_count for tool in tools),
                "total_errors": sum(tool.error_count for tool in tools)
            }
        
        return {
            "total_tools": len(self.tools),
            "total_usage": total_usage,
            "total_errors": total_errors,
            "overall_error_rate": total_errors / max(1, total_usage),
            "category_breakdown": category_stats,
            "top_tools": sorted(
                [tool.get_stats() for tool in self.tools.values()],
                key=lambda x: x["usage_count"],
                reverse=True
            )[:5]
        }
    
    async def execute_tool(
        self,
        tool_name: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Execute a tool by name."""
        tool = self.get_tool(tool_name)
        if not tool:
            return {"success": False, "error": f"Tool '{tool_name}' not found"}
        
        try:
            result = await tool.execute(**kwargs)
            return result
        except Exception as e:
            logger.error(f"Tool execution failed for {tool_name}: {e}")
            return {"success": False, "error": str(e)}


# Default tool registry instance
default_registry = AgentToolRegistry()


def create_default_tools(browser_controller=None, llm_client=None) -> AgentToolRegistry:
    """Create a registry with default tools."""
    registry = AgentToolRegistry()
    
    if browser_controller:
        registry.register_tool(NavigationTool(browser_controller))
        registry.register_tool(DataExtractionTool(browser_controller))
    
    if llm_client:
        registry.register_tool(ContentAnalysisTool(llm_client))
    
    return registry