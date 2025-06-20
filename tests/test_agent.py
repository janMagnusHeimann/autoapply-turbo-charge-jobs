"""Tests for agent components."""

import unittest
import sys
from pathlib import Path
from unittest.mock import Mock, patch

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from src.job_automation.core.memory import MemoryManager
from src.job_automation.core.tools import BaseTool, ToolRegistry, ToolExecutor, ToolResult, ToolParameter


class MockTool(BaseTool):
    """Mock tool for testing."""
    
    def _define_parameters(self):
        return [
            ToolParameter("input_text", "string", "Input text to process", required=True),
            ToolParameter("uppercase", "boolean", "Convert to uppercase", required=False, default=False)
        ]
    
    def execute(self, **kwargs):
        input_text = kwargs.get("input_text", "")
        uppercase = kwargs.get("uppercase", False)
        
        if not input_text:
            return ToolResult(success=False, error="No input text provided")
        
        result = input_text.upper() if uppercase else input_text.lower()
        return ToolResult(success=True, data=result)


class FailingTool(BaseTool):
    """Tool that always fails for testing error handling."""
    
    def _define_parameters(self):
        return [ToolParameter("input", "string", "Input data", required=True)]
    
    def execute(self, **kwargs):
        raise Exception("This tool always fails")


class TestBaseTool(unittest.TestCase):
    """Test cases for BaseTool."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.tool = MockTool()
    
    def test_tool_initialization(self):
        """Test tool initialization."""
        self.assertEqual(self.tool.name, "MockTool")
        self.assertEqual(len(self.tool.parameters), 2)
        self.assertIsNotNone(self.tool.description)
    
    def test_parameter_validation(self):
        """Test parameter validation."""
        # Valid parameters
        self.assertTrue(self.tool.validate_parameters(input_text="test"))
        self.assertTrue(self.tool.validate_parameters(input_text="test", uppercase=True))
        
        # Missing required parameter
        self.assertFalse(self.tool.validate_parameters(uppercase=True))
        self.assertFalse(self.tool.validate_parameters())
    
    def test_parameter_schema(self):
        """Test parameter schema generation."""
        schema = self.tool.get_parameter_schema()
        
        self.assertEqual(schema["type"], "object")
        self.assertIn("input_text", schema["properties"])
        self.assertIn("uppercase", schema["properties"])
        self.assertIn("input_text", schema["required"])
        self.assertNotIn("uppercase", schema["required"])
    
    def test_tool_execution(self):
        """Test tool execution."""
        # Successful execution
        result = self.tool.execute(input_text="Hello World")
        self.assertTrue(result.success)
        self.assertEqual(result.data, "hello world")
        
        # With optional parameter
        result = self.tool.execute(input_text="Hello World", uppercase=True)
        self.assertTrue(result.success)
        self.assertEqual(result.data, "HELLO WORLD")
        
        # Failed execution
        result = self.tool.execute(input_text="")
        self.assertFalse(result.success)
        self.assertIsNotNone(result.error)


class TestToolRegistry(unittest.TestCase):
    """Test cases for ToolRegistry."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.registry = ToolRegistry()
    
    def test_tool_registration(self):
        """Test tool registration."""
        self.registry.register_tool(MockTool)
        
        self.assertIn("MockTool", self.registry.list_tool_names())
        tool = self.registry.get_tool("MockTool")
        self.assertIsInstance(tool, MockTool)
    
    def test_tool_instance_registration(self):
        """Test registering tool instances."""
        tool_instance = MockTool()
        self.registry.register_tool_instance(tool_instance)
        
        retrieved_tool = self.registry.get_tool("MockTool")
        self.assertIs(retrieved_tool, tool_instance)
    
    def test_tool_search(self):
        """Test tool search functionality."""
        self.registry.register_tool(MockTool)
        
        # Search by name
        results = self.registry.search_tools("Mock")
        self.assertEqual(len(results), 1)
        self.assertIsInstance(results[0], MockTool)
        
        # Search by description (case insensitive)
        results = self.registry.search_tools("mock")
        self.assertEqual(len(results), 1)
    
    def test_tool_info(self):
        """Test tool information retrieval."""
        self.registry.register_tool(MockTool)
        
        info = self.registry.get_tool_info("MockTool")
        self.assertIsNotNone(info)
        self.assertEqual(info["name"], "MockTool")
        self.assertIn("parameters", info)
        self.assertIn("schema", info)
    
    def test_tool_validation(self):
        """Test tool availability validation."""
        self.registry.register_tool(MockTool)
        
        validation = self.registry.validate_tool_availability(["MockTool", "NonexistentTool"])
        self.assertTrue(validation["MockTool"])
        self.assertFalse(validation["NonexistentTool"])


class TestToolExecutor(unittest.TestCase):
    """Test cases for ToolExecutor."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.registry = ToolRegistry()
        self.registry.register_tool(MockTool)
        self.registry.register_tool(FailingTool)
        self.executor = ToolExecutor(self.registry)
    
    def test_successful_execution(self):
        """Test successful tool execution."""
        result = self.executor.execute_tool("MockTool", input_text="Hello")
        
        self.assertTrue(result.success)
        self.assertEqual(result.data, "hello")
        
        # Check execution history
        history = self.executor.get_execution_history(1)
        self.assertEqual(len(history), 1)
        self.assertTrue(history[0]["success"])
    
    def test_failed_execution(self):
        """Test failed tool execution."""
        result = self.executor.execute_tool("FailingTool", input="test")
        
        self.assertFalse(result.success)
        self.assertIsNotNone(result.error)
        
        # Check execution history
        history = self.executor.get_execution_history(1)
        self.assertEqual(len(history), 1)
        self.assertFalse(history[0]["success"])
    
    def test_invalid_tool_execution(self):
        """Test execution of non-existent tool."""
        result = self.executor.execute_tool("NonexistentTool")
        
        self.assertFalse(result.success)
        self.assertIn("not found", result.error)
    
    def test_invalid_parameters(self):
        """Test execution with invalid parameters."""
        # Missing required parameter
        result = self.executor.execute_tool("MockTool", uppercase=True)
        
        self.assertFalse(result.success)
        self.assertIn("Invalid parameters", result.error)
    
    def test_tool_chain_execution(self):
        """Test tool chain execution."""
        # Simple chain - just execute one tool
        chain = [
            {"tool_name": "MockTool", "parameters": {"input_text": "Hello World"}}
        ]
        
        results = self.executor.execute_tool_chain(chain)
        
        self.assertEqual(len(results), 1)
        self.assertTrue(results[0].success)
        self.assertEqual(results[0].data, "hello world")
    
    def test_usage_stats(self):
        """Test tool usage statistics."""
        # Execute some tools
        self.executor.execute_tool("MockTool", input_text="test1")
        self.executor.execute_tool("MockTool", input_text="test2")
        self.executor.execute_tool("FailingTool", input="test")
        
        stats = self.executor.get_tool_usage_stats()
        
        self.assertEqual(stats["total_executions"], 3)
        self.assertEqual(stats["successful_executions"], 2)
        self.assertEqual(stats["failed_executions"], 1)
        self.assertIn("MockTool", stats["tool_usage_frequency"])
        self.assertEqual(stats["tool_usage_frequency"]["MockTool"], 2)


class TestAgentIntegration(unittest.TestCase):
    """Integration tests for agent components."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.memory_manager = MemoryManager()
        self.tool_registry = ToolRegistry()
        self.tool_registry.register_tool(MockTool)
        self.tool_executor = ToolExecutor(self.tool_registry)
    
    def test_memory_tool_integration(self):
        """Test integration between memory and tools."""
        # Add some context to memory
        self.memory_manager.set_context("user_preference", "uppercase")
        
        # Execute tool
        result = self.tool_executor.execute_tool("MockTool", input_text="hello", uppercase=True)
        
        # Add interaction to memory
        self.memory_manager.add_interaction(
            "Convert 'hello' to uppercase",
            result.data if result.success else "Failed",
            {"tool_used": "MockTool", "success": result.success}
        )
        
        # Verify memory contains the interaction
        interactions = self.memory_manager.get_recent_interactions(1)
        self.assertEqual(len(interactions), 1)
        self.assertEqual(interactions[0]["metadata"]["tool_used"], "MockTool")
        self.assertTrue(interactions[0]["metadata"]["success"])
    
    def test_experience_learning(self):
        """Test that agent can learn from tool execution experiences."""
        # Execute tool successfully
        result = self.tool_executor.execute_tool("MockTool", input_text="test")
        
        # Record experience
        self.memory_manager.add_experience(
            "tool_execution",
            {
                "tool_name": "MockTool",
                "parameters": {"input_text": "test", "uppercase": False},
                "execution_time": 0.1
            },
            "success" if result.success else "failure"
        )
        
        # Verify experience was recorded
        experiences = self.memory_manager.get_experiences("tool_execution")
        self.assertEqual(len(experiences), 1)
        self.assertEqual(experiences[0]["outcome"], "success")
        
        # Check that patterns are being learned
        patterns = self.memory_manager.get_patterns("tool_execution")
        self.assertIn("success_patterns", patterns)


if __name__ == "__main__":
    unittest.main()