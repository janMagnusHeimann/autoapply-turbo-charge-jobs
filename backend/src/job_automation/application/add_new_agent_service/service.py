"""
Service for adding new agents to the system.
"""

import os
from typing import Dict, List, Optional, Any
from pathlib import Path
import importlib.util

from ...core.utils.validation import validate_data, sanitize_input
from ...core.utils.formatting import format_timestamp
from ...infrastructure.monitoring.logger import get_logger

logger = get_logger(__name__)


class AddNewAgentService:
    """Service for creating and registering new AI agents."""
    
    def __init__(self, agents_directory: str = None):
        """
        Initialize the service.
        
        Args:
            agents_directory: Path to agents directory
        """
        if agents_directory is None:
            # Default to core/agents directory
            current_dir = Path(__file__).parent.parent.parent
            self.agents_directory = current_dir / "core" / "agents"
        else:
            self.agents_directory = Path(agents_directory)
        
        self.agent_registry: Dict[str, Any] = {}
        self._load_existing_agents()
    
    def _load_existing_agents(self):
        """Load existing agents from the agents directory."""
        if not self.agents_directory.exists():
            logger.warning(f"Agents directory {self.agents_directory} does not exist")
            return
        
        for agent_file in self.agents_directory.glob("*_agent.py"):
            if agent_file.name == "__init__.py":
                continue
            
            agent_name = agent_file.stem
            try:
                spec = importlib.util.spec_from_file_location(agent_name, agent_file)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                
                # Look for agent class
                for attr_name in dir(module):
                    attr = getattr(module, attr_name)
                    if (isinstance(attr, type) and 
                        attr_name.endswith('Agent') and 
                        attr_name != 'BaseAgent'):
                        
                        self.agent_registry[agent_name] = {
                            'class': attr,
                            'module': module,
                            'file_path': str(agent_file),
                            'capabilities': getattr(attr, 'capabilities', [])
                        }
                        logger.info(f"Loaded agent: {agent_name}")
                        break
                        
            except Exception as e:
                logger.error(f"Failed to load agent from {agent_file}: {e}")
    
    def create_agent(self, name: str, description: str, capabilities: List[str], 
                    template_type: str = "basic") -> Dict[str, Any]:
        """
        Create a new agent.
        
        Args:
            name: Agent name (will be converted to snake_case)
            description: Agent description
            capabilities: List of agent capabilities
            template_type: Type of template to use
        
        Returns:
            Dict containing creation result
        """
        # Validate input
        schema = {
            'name': {'type': str, 'required': True},
            'description': {'type': str, 'required': True},
            'capabilities': {'type': list, 'required': True}
        }
        
        data = {
            'name': name,
            'description': description,
            'capabilities': capabilities
        }
        
        if not validate_data(data, schema):
            return {'success': False, 'error': 'Invalid input data'}
        
        # Sanitize inputs
        name = sanitize_input(name)
        description = sanitize_input(description)
        
        # Convert name to snake_case
        agent_name = name.lower().replace(' ', '_').replace('-', '_')
        if not agent_name.endswith('_agent'):
            agent_name += '_agent'
        
        # Check if agent already exists
        if agent_name in self.agent_registry:
            return {'success': False, 'error': f'Agent {agent_name} already exists'}
        
        # Create agent file
        try:
            agent_file_path = self.agents_directory / f"{agent_name}.py"
            agent_code = self._generate_agent_code(
                agent_name, name, description, capabilities, template_type
            )
            
            with open(agent_file_path, 'w') as f:
                f.write(agent_code)
            
            # Load the new agent
            self._load_agent_from_file(agent_file_path)
            
            logger.info(f"Created new agent: {agent_name}")
            
            return {
                'success': True,
                'agent_name': agent_name,
                'file_path': str(agent_file_path),
                'capabilities': capabilities
            }
            
        except Exception as e:
            logger.error(f"Failed to create agent {agent_name}: {e}")
            return {'success': False, 'error': str(e)}
    
    def _generate_agent_code(self, agent_name: str, display_name: str, 
                           description: str, capabilities: List[str], 
                           template_type: str) -> str:
        """Generate code for new agent."""
        class_name = ''.join(word.capitalize() for word in agent_name.replace('_agent', '').split('_')) + 'Agent'
        
        template = f'''"""
{display_name} Agent

{description}
"""

from typing import Dict, List, Optional, Any
from datetime import datetime

from ..memory.memory_manager import MemoryManager
from ..tools.tool_executor import ToolExecutor
from ...infrastructure.monitoring.logger import get_logger

logger = get_logger(__name__)


class {class_name}:
    """
    {display_name} - {description}
    
    Capabilities: {', '.join(capabilities)}
    """
    
    capabilities = {capabilities!r}
    
    def __init__(self, memory_manager: MemoryManager, tool_executor: ToolExecutor):
        """
        Initialize the agent.
        
        Args:
            memory_manager: Memory management instance
            tool_executor: Tool execution instance
        """
        self.memory_manager = memory_manager
        self.tool_executor = tool_executor
        self.agent_name = "{agent_name}"
        self.display_name = "{display_name}"
        
        logger.info(f"Initialized {{self.display_name}} agent")
    
    def process_message(self, message: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Process incoming message and generate response.
        
        Args:
            message: User message
            context: Additional context
        
        Returns:
            Dict containing response and metadata
        """
        logger.info(f"Processing message: {{message[:50]}}...")
        
        try:
            # Store message in short-term memory
            self.memory_manager.add_to_short_term_memory(
                "user_message",
                {{"message": message, "context": context, "timestamp": datetime.now()}}
            )
            
            # Process based on capabilities
            response = self._generate_response(message, context)
            
            # Store response in memory
            self.memory_manager.add_to_short_term_memory(
                "agent_response",
                {{"response": response, "timestamp": datetime.now()}}
            )
            
            return {{
                'message': response,
                'agent': self.agent_name,
                'capabilities_used': self._get_used_capabilities(message),
                'metadata': {{
                    'timestamp': datetime.now().isoformat(),
                    'context': context
                }}
            }}
            
        except Exception as e:
            logger.error(f"Error processing message: {{e}}")
            return {{
                'message': f"I encountered an error: {{str(e)}}",
                'agent': self.agent_name,
                'error': True,
                'metadata': {{'timestamp': datetime.now().isoformat()}}
            }}
    
    def _generate_response(self, message: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Generate response based on message and context."""
        # TODO: Implement specific logic for {display_name}
        # This is a basic template - customize based on your agent's purpose
        
        response_parts = []
        
        # Add greeting if this is the first interaction
        recent_messages = self.memory_manager.get_recent_short_term_memory("user_message", limit=5)
        if len(recent_messages) <= 1:
            response_parts.append(f"Hello! I'm {{self.display_name}}, and I'm here to help with {{', '.join(self.capabilities)}}.")
        
        # Basic response logic
        message_lower = message.lower()
        
        if any(cap.lower() in message_lower for cap in self.capabilities):
            response_parts.append(f"I can help with that! My capabilities include {{', '.join(self.capabilities)}}.")
        else:
            response_parts.append(f"I'm {{self.display_name}}. How can I assist you with {{', '.join(self.capabilities)}}?")
        
        return " ".join(response_parts)
    
    def _get_used_capabilities(self, message: str) -> List[str]:
        """Determine which capabilities were used for this message."""
        used_capabilities = []
        message_lower = message.lower()
        
        for capability in self.capabilities:
            if capability.lower() in message_lower:
                used_capabilities.append(capability)
        
        return used_capabilities
    
    def get_status(self) -> Dict[str, Any]:
        """Get current agent status."""
        return {{
            'agent_name': self.agent_name,
            'display_name': self.display_name,
            'capabilities': self.capabilities,
            'memory_size': len(self.memory_manager.get_recent_short_term_memory("", limit=100)),
            'status': 'active'
        }}
'''
        
        return template
    
    def _load_agent_from_file(self, agent_file: Path):
        """Load agent from file path."""
        agent_name = agent_file.stem
        try:
            spec = importlib.util.spec_from_file_location(agent_name, agent_file)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Look for agent class
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if (isinstance(attr, type) and 
                    attr_name.endswith('Agent') and 
                    attr_name != 'BaseAgent'):
                    
                    self.agent_registry[agent_name] = {
                        'class': attr,
                        'module': module,
                        'file_path': str(agent_file),
                        'capabilities': getattr(attr, 'capabilities', [])
                    }
                    break
                    
        except Exception as e:
            logger.error(f"Failed to load agent from {agent_file}: {e}")
    
    def list_agents(self) -> Dict[str, Any]:
        """List all registered agents."""
        agents = {}
        for agent_name, agent_info in self.agent_registry.items():
            agents[agent_name] = {
                'capabilities': agent_info['capabilities'],
                'file_path': agent_info['file_path']
            }
        return agents
    
    def get_agent_info(self, agent_name: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific agent."""
        return self.agent_registry.get(agent_name)
    
    def delete_agent(self, agent_name: str) -> Dict[str, Any]:
        """Delete an agent (removes file and registry entry)."""
        if agent_name not in self.agent_registry:
            return {'success': False, 'error': f'Agent {agent_name} not found'}
        
        try:
            agent_info = self.agent_registry[agent_name]
            file_path = Path(agent_info['file_path'])
            
            if file_path.exists():
                file_path.unlink()
            
            del self.agent_registry[agent_name]
            
            logger.info(f"Deleted agent: {agent_name}")
            
            return {'success': True, 'agent_name': agent_name}
            
        except Exception as e:
            logger.error(f"Failed to delete agent {agent_name}: {e}")
            return {'success': False, 'error': str(e)}