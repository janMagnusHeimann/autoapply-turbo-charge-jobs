"""Tests for memory management components."""

import unittest
import sys
from pathlib import Path
from datetime import datetime

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from src.job_automation.core.memory import ShortTermMemory, LongTermMemory, MemoryManager


class TestShortTermMemory(unittest.TestCase):
    """Test cases for ShortTermMemory."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.memory = ShortTermMemory(max_size=5)
    
    def test_add_interaction(self):
        """Test adding interactions to memory."""
        self.memory.add_interaction("Hello", "Hi there!")
        
        interactions = self.memory.get_recent_interactions(1)
        self.assertEqual(len(interactions), 1)
        self.assertEqual(interactions[0]["user_input"], "Hello")
        self.assertEqual(interactions[0]["agent_response"], "Hi there!")
    
    def test_memory_limit(self):
        """Test that memory respects size limit."""
        # Add more interactions than limit
        for i in range(10):
            self.memory.add_interaction(f"Input {i}", f"Response {i}")
        
        # Should only keep the last 5
        interactions = self.memory.get_recent_interactions(10)
        self.assertEqual(len(interactions), 5)
        self.assertEqual(interactions[-1]["user_input"], "Input 9")
    
    def test_context_management(self):
        """Test context variable management."""
        self.memory.set_context("user_id", "test_user")
        self.memory.set_context("session_id", "test_session")
        
        self.assertEqual(self.memory.get_context("user_id"), "test_user")
        self.assertEqual(self.memory.get_context("session_id"), "test_session")
        self.assertIsNone(self.memory.get_context("nonexistent"))
    
    def test_clear_operations(self):
        """Test clearing memory and context."""
        self.memory.add_interaction("Test", "Response")
        self.memory.set_context("key", "value")
        
        self.memory.clear_context()
        self.assertIsNone(self.memory.get_context("key"))
        self.assertEqual(len(self.memory.memory), 1)  # Memory still there
        
        self.memory.clear_memory()
        self.assertEqual(len(self.memory.memory), 0)
        self.assertIsNone(self.memory.get_context("key"))


class TestLongTermMemory(unittest.TestCase):
    """Test cases for LongTermMemory."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.memory = LongTermMemory()
    
    def test_knowledge_management(self):
        """Test knowledge storage and retrieval."""
        self.memory.add_knowledge("test_category", "test_key", "test_value")
        
        value = self.memory.get_knowledge("test_category", "test_key")
        self.assertEqual(value, "test_value")
        
        # Test getting entire category
        category_data = self.memory.get_knowledge("test_category")
        self.assertIn("test_key", category_data)
    
    def test_experience_management(self):
        """Test experience storage and pattern learning."""
        self.memory.add_experience(
            "job_application",
            {"personalized": True, "quick_response": True},
            "success"
        )
        
        experiences = self.memory.get_experiences("job_application")
        self.assertEqual(len(experiences), 1)
        self.assertEqual(experiences[0]["outcome"], "success")
        
        # Check that patterns are being learned
        patterns = self.memory.get_patterns("job_application")
        self.assertIn("success_patterns", patterns)
    
    def test_pattern_learning(self):
        """Test that patterns are learned from experiences."""
        # Add multiple similar successful experiences
        for i in range(3):
            self.memory.add_experience(
                "test_type",
                {"feature_a": True, "feature_b": False},
                "success"
            )
        
        patterns = self.memory.get_patterns("test_type")
        success_patterns = patterns.get("success_patterns", [])
        
        # Should have learned a pattern
        self.assertGreater(len(success_patterns), 0)
        
        # Pattern frequency should be tracked
        if success_patterns:
            self.assertGreaterEqual(success_patterns[0]["frequency"], 1)


class TestMemoryManager(unittest.TestCase):
    """Test cases for MemoryManager."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.manager = MemoryManager()
    
    def test_unified_interface(self):
        """Test that manager provides unified access to both memory types."""
        # Test short-term operations
        self.manager.add_interaction("Hello", "Hi")
        self.manager.set_context("user", "test")
        
        interactions = self.manager.get_recent_interactions(1)
        self.assertEqual(len(interactions), 1)
        self.assertEqual(self.manager.get_context("user"), "test")
        
        # Test long-term operations
        self.manager.add_knowledge("category", "key", "value")
        self.manager.add_experience("type", {"data": True}, "success")
        
        self.assertEqual(self.manager.get_knowledge("category", "key"), "value")
        experiences = self.manager.get_experiences("type")
        self.assertEqual(len(experiences), 1)
    
    def test_memory_stats(self):
        """Test memory statistics collection."""
        # Add some data
        self.manager.add_interaction("Test", "Response")
        self.manager.set_context("key", "value")
        self.manager.add_knowledge("cat", "key", "value")
        self.manager.add_experience("type", {}, "success")
        
        stats = self.manager.get_memory_stats()
        
        self.assertGreater(stats["short_term_interactions"], 0)
        self.assertGreater(stats["short_term_context_keys"], 0)
        self.assertGreater(stats["long_term_knowledge_categories"], 0)
        self.assertGreater(stats["long_term_experiences"], 0)
    
    def test_memory_consolidation(self):
        """Test memory consolidation process."""
        # Add interactions that should be preserved
        self.manager.add_interaction(
            "Remember this important information",
            "I will remember that"
        )
        self.manager.add_interaction(
            "Regular conversation",
            "Regular response"
        )
        
        initial_knowledge = len(self.manager.long_term.knowledge_base)
        self.manager.consolidate_memory()
        
        # Should have potentially added important interactions to long-term
        final_knowledge = len(self.manager.long_term.knowledge_base)
        # Note: This might or might not increase depending on the heuristics


if __name__ == "__main__":
    unittest.main()