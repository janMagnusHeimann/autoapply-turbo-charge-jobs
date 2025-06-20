#!/usr/bin/env python3
"""Create and configure new AI agents."""

import sys
import os
import argparse
from pathlib import Path
import json

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from src.job_automation.infrastructure.monitoring import setup_logger


AGENT_TEMPLATE = '''"""Generated AI agent: {agent_name}."""

from typing import Dict, Any, Optional, List
import logging
from ..memory import MemoryManager
from ..tools import ToolRegistry, ToolExecutor


class {class_name}:
    """{description}"""
    
    def __init__(self, memory_manager: MemoryManager, logger: Optional[logging.Logger] = None):
        self.memory_manager = memory_manager
        self.logger = logger or logging.getLogger(__name__)
        self.tool_registry = ToolRegistry()
        self.tool_executor = ToolExecutor(self.tool_registry, self.logger)
        
        # Agent configuration
        self.agent_id = "{agent_name}"
        self.capabilities = {capabilities}
        
        # Initialize agent
        self._setup_tools()
        self._setup_memory()
        
        self.logger.info(f"{{self.agent_id}} agent initialized")
    
    def _setup_tools(self):
        """Setup tools for this agent."""
        # TODO: Register specific tools for this agent
        pass
    
    def _setup_memory(self):
        """Setup memory context for this agent."""
        self.memory_manager.set_context("agent_id", self.agent_id)
        self.memory_manager.set_context("capabilities", self.capabilities)
    
    def process_input(self, user_input: str) -> str:
        """Process user input and return response."""
        try:
            # Add interaction to memory
            self.memory_manager.add_interaction(
                user_input, 
                "Processing...", 
                {{"agent_id": self.agent_id}}
            )
            
            # TODO: Implement agent logic here
            response = f"{{self.agent_id}} received: {{user_input}}"
            
            # Update memory with actual response
            recent_interactions = self.memory_manager.get_recent_interactions(1)
            if recent_interactions:
                recent_interactions[0]["agent_response"] = response
            
            return response
            
        except Exception as e:
            self.logger.error(f"Error processing input: {{e}}")
            return f"Error: {{str(e)}}"
    
    def get_status(self) -> Dict[str, Any]:
        """Get agent status information."""
        return {{
            "agent_id": self.agent_id,
            "capabilities": self.capabilities,
            "memory_stats": self.memory_manager.get_memory_stats(),
            "tool_stats": self.tool_executor.get_tool_usage_stats()
        }}
'''


def create_agent_file(agent_name: str, description: str, capabilities: List[str], 
                     output_dir: Path) -> Path:
    """Create agent Python file."""
    class_name = "".join(word.capitalize() for word in agent_name.split("_"))
    
    agent_content = AGENT_TEMPLATE.format(
        agent_name=agent_name,
        class_name=class_name,
        description=description,
        capabilities=capabilities
    )
    
    agent_file = output_dir / f"{agent_name}.py"
    with open(agent_file, 'w') as f:
        f.write(agent_content)
    
    return agent_file


def update_agents_init(agents_dir: Path, agent_name: str):
    """Update __init__.py in agents directory."""
    init_file = agents_dir / "__init__.py"
    class_name = "".join(word.capitalize() for word in agent_name.split("_"))
    
    # Read existing content
    if init_file.exists():
        with open(init_file, 'r') as f:
            content = f.read()
    else:
        content = '"""AI Agents."""\n\n'
    
    # Add import and __all__ entry
    import_line = f"from .{agent_name} import {class_name}"
    
    if import_line not in content:
        # Add import
        if "from ." in content:
            lines = content.split('\n')
            last_import_idx = -1
            for i, line in enumerate(lines):
                if line.startswith("from ."):
                    last_import_idx = i
            
            if last_import_idx >= 0:
                lines.insert(last_import_idx + 1, import_line)
            else:
                lines.insert(-1, import_line)
            content = '\n'.join(lines)
        else:
            content += f"\n{import_line}\n"
        
        # Update __all__
        if "__all__" in content:
            # Find and update existing __all__
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if line.strip().startswith("__all__"):
                    # Extract current __all__ items
                    all_line = line.strip()
                    if "]" in all_line:
                        items = all_line.split("[")[1].split("]")[0]
                        items = [item.strip().strip('"\'') for item in items.split(",") if item.strip()]
                        if class_name not in items:
                            items.append(class_name)
                        lines[i] = f'__all__ = {items!r}'
                    break
        else:
            content += f'\n__all__ = ["{class_name}"]\n'
    
    with open(init_file, 'w') as f:
        f.write(content)


def main():
    """Main entry point for creating agents."""
    parser = argparse.ArgumentParser(description="Create new AI agent")
    parser.add_argument("--name", required=True, help="Agent name (snake_case)")
    parser.add_argument("--description", required=True, help="Agent description")
    parser.add_argument("--capabilities", nargs="+", default=[], 
                       help="List of agent capabilities")
    parser.add_argument("--output-dir", help="Output directory for agent files")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    
    args = parser.parse_args()
    
    # Setup logging
    log_level = "DEBUG" if args.debug else "INFO"
    logger = setup_logger("agent_creator", level=log_level)
    
    # Validate agent name
    if not args.name.replace("_", "").isalnum():
        logger.error("Agent name must be alphanumeric with underscores")
        sys.exit(1)
    
    # Determine output directory
    if args.output_dir:
        output_dir = Path(args.output_dir)
    else:
        output_dir = Path(__file__).parent.parent / "backend" / "src" / "job_automation" / "core" / "agents"
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    logger.info(f"Creating agent '{args.name}' in {output_dir}")
    
    try:
        # Create agent file
        agent_file = create_agent_file(
            args.name, 
            args.description, 
            args.capabilities, 
            output_dir
        )
        logger.info(f"Created agent file: {agent_file}")
        
        # Update __init__.py
        update_agents_init(output_dir, args.name)
        logger.info("Updated agents __init__.py")
        
        # Create agent configuration
        config = {
            "name": args.name,
            "description": args.description,
            "capabilities": args.capabilities,
            "created_at": "2025-01-19T00:00:00Z",
            "version": "1.0.0"
        }
        
        config_file = output_dir / f"{args.name}_config.json"
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)
        logger.info(f"Created agent config: {config_file}")
        
        print(f"\\nAgent '{args.name}' created successfully!")
        print(f"Files created:")
        print(f"  - {agent_file}")
        print(f"  - {config_file}")
        print(f"\\nNext steps:")
        print(f"  1. Implement agent logic in {agent_file}")
        print(f"  2. Register necessary tools in _setup_tools()")
        print(f"  3. Test the agent with: python tools/run_agent.py --agent {args.name}")
        
    except Exception as e:
        logger.error(f"Failed to create agent: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()