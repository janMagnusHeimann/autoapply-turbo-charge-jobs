"""
Service for adding new tools to the system.
"""

import os
from typing import Dict, List, Optional, Any
from pathlib import Path
import importlib.util

from ...core.utils.validation import validate_data, sanitize_input
from ...core.tools.tool_registry import ToolRegistry
from ...infrastructure.monitoring.logger import get_logger

logger = get_logger(__name__)


class AddNewToolService:
    """Service for creating and registering new tools."""
    
    def __init__(self, tools_directory: str = None, tool_registry: ToolRegistry = None):
        """
        Initialize the service.
        
        Args:
            tools_directory: Path to tools directory
            tool_registry: Tool registry instance
        """
        if tools_directory is None:
            # Default to core/tools directory
            current_dir = Path(__file__).parent.parent.parent
            self.tools_directory = current_dir / "core" / "tools"
        else:
            self.tools_directory = Path(tools_directory)
        
        self.tool_registry = tool_registry or ToolRegistry()
        self.custom_tools: Dict[str, Any] = {}
        self._load_existing_tools()
    
    def _load_existing_tools(self):
        """Load existing tools from the tools directory."""
        if not self.tools_directory.exists():
            logger.warning(f"Tools directory {self.tools_directory} does not exist")
            return
        
        for tool_file in self.tools_directory.glob("*.py"):
            if tool_file.name in ["__init__.py", "base_tool.py", "tool_executor.py", "tool_registry.py"]:
                continue
            
            tool_name = tool_file.stem
            try:
                spec = importlib.util.spec_from_file_location(tool_name, tool_file)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                
                # Look for tool class
                for attr_name in dir(module):
                    attr = getattr(module, attr_name)
                    if (isinstance(attr, type) and 
                        attr_name.endswith('Tool') and 
                        attr_name != 'BaseTool'):
                        
                        self.custom_tools[tool_name] = {
                            'class': attr,
                            'module': module,
                            'file_path': str(tool_file),
                            'description': getattr(attr, '__doc__', ''),
                            'parameters': getattr(attr, 'parameters', [])
                        }
                        logger.info(f"Loaded tool: {tool_name}")
                        break
                        
            except Exception as e:
                logger.error(f"Failed to load tool from {tool_file}: {e}")
    
    def create_tool(self, name: str, description: str, parameters: List[Dict[str, Any]], 
                   template_type: str = "basic") -> Dict[str, Any]:
        """
        Create a new tool.
        
        Args:
            name: Tool name (will be converted to snake_case)
            description: Tool description
            parameters: List of tool parameters
            template_type: Type of template to use
        
        Returns:
            Dict containing creation result
        """
        # Validate input
        schema = {
            'name': {'type': str, 'required': True},
            'description': {'type': str, 'required': True},
            'parameters': {'type': list, 'required': True}
        }
        
        data = {
            'name': name,
            'description': description,
            'parameters': parameters
        }
        
        if not validate_data(data, schema):
            return {'success': False, 'error': 'Invalid input data'}
        
        # Sanitize inputs
        name = sanitize_input(name)
        description = sanitize_input(description)
        
        # Convert name to snake_case
        tool_name = name.lower().replace(' ', '_').replace('-', '_')
        if not tool_name.endswith('_tool'):
            tool_name += '_tool'
        
        # Check if tool already exists
        if tool_name in self.custom_tools:
            return {'success': False, 'error': f'Tool {tool_name} already exists'}
        
        # Create tool file
        try:
            tool_file_path = self.tools_directory / f"{tool_name}.py"
            tool_code = self._generate_tool_code(
                tool_name, name, description, parameters, template_type
            )
            
            with open(tool_file_path, 'w') as f:
                f.write(tool_code)
            
            # Load the new tool
            self._load_tool_from_file(tool_file_path)
            
            logger.info(f"Created new tool: {tool_name}")
            
            return {
                'success': True,
                'tool_name': tool_name,
                'file_path': str(tool_file_path),
                'parameters': parameters
            }
            
        except Exception as e:
            logger.error(f"Failed to create tool {tool_name}: {e}")
            return {'success': False, 'error': str(e)}
    
    def _generate_tool_code(self, tool_name: str, display_name: str, 
                          description: str, parameters: List[Dict[str, Any]], 
                          template_type: str) -> str:
        """Generate code for new tool."""
        class_name = ''.join(word.capitalize() for word in tool_name.replace('_tool', '').split('_')) + 'Tool'
        
        # Generate parameter definitions
        param_definitions = []
        for param in parameters:
            param_def = f"        ToolParameter('{param['name']}', '{param['type']}', '{param['description']}'"
            if param.get('required', False):
                param_def += ", required=True"
            if 'default' in param:
                param_def += f", default={param['default']!r}"
            param_def += ")"
            param_definitions.append(param_def)
        
        param_definitions_str = ",\\n".join(param_definitions) if param_definitions else ""
        
        template = f'''"""
{display_name} Tool

{description}
"""

from typing import Dict, Any, Optional
from ..base_tool import BaseTool, ToolResult, ToolParameter
from ...infrastructure.monitoring.logger import get_logger

logger = get_logger(__name__)


class {class_name}(BaseTool):
    """
    {display_name} - {description}
    """
    
    def _define_parameters(self):
        """Define tool parameters."""
        return [
{param_definitions_str}
        ]
    
    def _get_description(self) -> str:
        """Get tool description."""
        return "{description}"
    
    def execute(self, **kwargs) -> ToolResult:
        """
        Execute the tool.
        
        Args:
            **kwargs: Tool parameters
        
        Returns:
            ToolResult: Execution result
        """
        logger.info(f"Executing {{self.__class__.__name__}} with parameters: {{kwargs}}")
        
        try:
            # Validate parameters
            validation_result = self.validate_parameters(kwargs)
            if not validation_result.success:
                return validation_result
            
            # TODO: Implement your tool logic here
            # This is a basic template - customize based on your tool's purpose
            
            result_data = {{
                'message': f'Successfully executed {{self.__class__.__name__}}',
                'parameters': kwargs,
                'tool_name': '{tool_name}'
            }}
            
            # Example: Process each parameter
            for param_name, param_value in kwargs.items():
                logger.info(f"Processing parameter {{param_name}}: {{param_value}}")
                # Add your processing logic here
            
            logger.info(f"{{self.__class__.__name__}} completed successfully")
            
            return ToolResult(
                success=True,
                data=result_data,
                metadata={{'execution_time': 'completed'}}
            )
            
        except Exception as e:
            logger.error(f"Error in {{self.__class__.__name__}}: {{e}}")
            return ToolResult(
                success=False,
                error=str(e),
                metadata={{'error_type': type(e).__name__}}
            )
    
    def get_help(self) -> str:
        """Get help information for this tool."""
        help_text = f"{{self._get_description()}}\\n\\n"
        help_text += "Parameters:\\n"
        
        for param in self._define_parameters():
            required_str = " (required)" if param.required else ""
            default_str = f" (default: {{param.default}})" if hasattr(param, 'default') else ""
            help_text += f"  - {{param.name}} ({{param.parameter_type}}){{required_str}}{{default_str}}: {{param.description}}\\n"
        
        return help_text
'''
        
        return template
    
    def _load_tool_from_file(self, tool_file: Path):
        """Load tool from file path."""
        tool_name = tool_file.stem
        try:
            spec = importlib.util.spec_from_file_location(tool_name, tool_file)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Look for tool class
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if (isinstance(attr, type) and 
                    attr_name.endswith('Tool') and 
                    attr_name != 'BaseTool'):
                    
                    self.custom_tools[tool_name] = {
                        'class': attr,
                        'module': module,
                        'file_path': str(tool_file),
                        'description': getattr(attr, '__doc__', ''),
                        'parameters': getattr(attr, 'parameters', [])
                    }
                    
                    # Register with tool registry
                    if self.tool_registry:
                        self.tool_registry.register_tool(attr_name, attr)
                    
                    break
                    
        except Exception as e:
            logger.error(f"Failed to load tool from {tool_file}: {e}")
    
    def list_tools(self) -> Dict[str, Any]:
        """List all custom tools."""
        tools = {}
        for tool_name, tool_info in self.custom_tools.items():
            tools[tool_name] = {
                'description': tool_info['description'],
                'file_path': tool_info['file_path'],
                'parameters': tool_info['parameters']
            }
        return tools
    
    def get_tool_info(self, tool_name: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific tool."""
        return self.custom_tools.get(tool_name)
    
    def delete_tool(self, tool_name: str) -> Dict[str, Any]:
        """Delete a tool (removes file and registry entry)."""
        if tool_name not in self.custom_tools:
            return {'success': False, 'error': f'Tool {tool_name} not found'}
        
        try:
            tool_info = self.custom_tools[tool_name]
            file_path = Path(tool_info['file_path'])
            
            if file_path.exists():
                file_path.unlink()
            
            # Unregister from tool registry
            if self.tool_registry:
                class_name = tool_info['class'].__name__
                self.tool_registry.unregister_tool(class_name)
            
            del self.custom_tools[tool_name]
            
            logger.info(f"Deleted tool: {tool_name}")
            
            return {'success': True, 'tool_name': tool_name}
            
        except Exception as e:
            logger.error(f"Failed to delete tool {tool_name}: {e}")
            return {'success': False, 'error': str(e)}
    
    def validate_tool_parameters(self, tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Validate parameters for a specific tool."""
        if tool_name not in self.custom_tools:
            return {'valid': False, 'error': f'Tool {tool_name} not found'}
        
        try:
            tool_class = self.custom_tools[tool_name]['class']
            tool_instance = tool_class()
            
            validation_result = tool_instance.validate_parameters(parameters)
            
            return {
                'valid': validation_result.success,
                'error': validation_result.error if not validation_result.success else None
            }
            
        except Exception as e:
            return {'valid': False, 'error': str(e)}