"""Tool execution engine for AI agents."""

from typing import Dict, Any, Optional, List
import asyncio
import logging
from datetime import datetime
from .base_tool import BaseTool, ToolResult
from .tool_registry import ToolRegistry


class ToolExecutor:
    """Executes tools with proper error handling and logging."""
    
    def __init__(self, registry: ToolRegistry, logger: Optional[logging.Logger] = None):
        self.registry = registry
        self.logger = logger or logging.getLogger(__name__)
        self.execution_history: List[Dict[str, Any]] = []
    
    def execute_tool(self, tool_name: str, **kwargs) -> ToolResult:
        """Execute a tool by name with parameters."""
        start_time = datetime.now()
        
        # Get tool from registry
        tool = self.registry.get_tool(tool_name)
        if not tool:
            error_msg = f"Tool '{tool_name}' not found in registry"
            self.logger.error(error_msg)
            return ToolResult(success=False, error=error_msg)
        
        # Validate parameters
        if not tool.validate_parameters(**kwargs):
            error_msg = f"Invalid parameters for tool '{tool_name}'"
            self.logger.error(error_msg)
            return ToolResult(success=False, error=error_msg)
        
        try:
            # Execute tool
            self.logger.info(f"Executing tool: {tool_name}")
            result = tool.execute(**kwargs)
            
            # Log execution
            execution_time = (datetime.now() - start_time).total_seconds()
            self._log_execution(tool_name, kwargs, result, execution_time)
            
            return result
            
        except Exception as e:
            error_msg = f"Error executing tool '{tool_name}': {str(e)}"
            self.logger.error(error_msg, exc_info=True)
            
            execution_time = (datetime.now() - start_time).total_seconds()
            error_result = ToolResult(success=False, error=error_msg)
            self._log_execution(tool_name, kwargs, error_result, execution_time)
            
            return error_result
    
    async def execute_tool_async(self, tool_name: str, **kwargs) -> ToolResult:
        """Execute a tool asynchronously."""
        # For now, run in thread pool - can be enhanced for truly async tools
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.execute_tool, tool_name, **kwargs)
    
    def execute_tools_parallel(self, tool_calls: List[Dict[str, Any]]) -> List[ToolResult]:
        """Execute multiple tools in parallel."""
        async def run_parallel():
            tasks = []
            for call in tool_calls:
                tool_name = call["tool_name"]
                parameters = call.get("parameters", {})
                task = asyncio.create_task(self.execute_tool_async(tool_name, **parameters))
                tasks.append(task)
            
            return await asyncio.gather(*tasks)
        
        return asyncio.run(run_parallel())
    
    def execute_tool_chain(self, tool_chain: List[Dict[str, Any]]) -> List[ToolResult]:
        """Execute tools in sequence, passing results between them."""
        results = []
        context = {}
        
        for i, step in enumerate(tool_chain):
            tool_name = step["tool_name"]
            parameters = step.get("parameters", {})
            
            # Allow parameters to reference previous results
            if "use_previous_result" in parameters:
                prev_index = parameters["use_previous_result"]
                if prev_index < len(results) and results[prev_index].success:
                    parameters["input_data"] = results[prev_index].data
                del parameters["use_previous_result"]
            
            # Execute tool
            result = self.execute_tool(tool_name, **parameters)
            results.append(result)
            
            # Update context for next tool
            if result.success:
                context[f"step_{i}_result"] = result.data
            
            # Stop chain if tool fails and fail_fast is enabled
            if not result.success and step.get("fail_fast", False):
                self.logger.warning(f"Tool chain stopped at step {i} due to failure")
                break
        
        return results
    
    def _log_execution(self, tool_name: str, parameters: Dict[str, Any], 
                      result: ToolResult, execution_time: float):
        """Log tool execution details."""
        execution_record = {
            "timestamp": datetime.now().isoformat(),
            "tool_name": tool_name,
            "parameters": parameters,
            "success": result.success,
            "execution_time": execution_time,
            "error": result.error if not result.success else None
        }
        
        self.execution_history.append(execution_record)
        
        # Keep history size manageable
        if len(self.execution_history) > 1000:
            self.execution_history = self.execution_history[-500:]
    
    def get_execution_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent execution history."""
        return self.execution_history[-limit:] if limit else self.execution_history
    
    def get_tool_usage_stats(self) -> Dict[str, Any]:
        """Get statistics about tool usage."""
        if not self.execution_history:
            return {"total_executions": 0}
        
        stats = {
            "total_executions": len(self.execution_history),
            "successful_executions": sum(1 for record in self.execution_history if record["success"]),
            "failed_executions": sum(1 for record in self.execution_history if not record["success"]),
            "tools_used": len(set(record["tool_name"] for record in self.execution_history)),
            "average_execution_time": sum(record["execution_time"] for record in self.execution_history) / len(self.execution_history)
        }
        
        # Tool usage frequency
        tool_usage = {}
        for record in self.execution_history:
            tool_name = record["tool_name"]
            tool_usage[tool_name] = tool_usage.get(tool_name, 0) + 1
        
        stats["tool_usage_frequency"] = tool_usage
        return stats
    
    def clear_history(self):
        """Clear execution history."""
        self.execution_history.clear()