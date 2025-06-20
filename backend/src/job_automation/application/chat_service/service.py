"""
Chat service implementation for agent interactions.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
import uuid

from ...core.memory.memory_manager import MemoryManager
from ...core.agents.career_page_agent import CareerPageAgent
from ...core.tools.tool_executor import ToolExecutor
from ...core.utils.validation import validate_data, sanitize_input


class ChatService:
    """Service for managing chat interactions with AI agents."""
    
    def __init__(self, memory_manager: MemoryManager, tool_executor: ToolExecutor):
        """
        Initialize chat service.
        
        Args:
            memory_manager: Memory management instance
            tool_executor: Tool execution instance
        """
        self.memory_manager = memory_manager
        self.tool_executor = tool_executor
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
    
    def create_session(self, user_id: str, agent_type: str = "career_page") -> str:
        """
        Create a new chat session.
        
        Args:
            user_id: User identifier
            agent_type: Type of agent to create
        
        Returns:
            str: Session ID
        """
        session_id = str(uuid.uuid4())
        
        # Initialize agent based on type
        if agent_type == "career_page":
            agent = CareerPageAgent(self.memory_manager, self.tool_executor)
        else:
            raise ValueError(f"Unknown agent type: {agent_type}")
        
        self.active_sessions[session_id] = {
            'user_id': user_id,
            'agent': agent,
            'agent_type': agent_type,
            'created_at': datetime.now(),
            'message_history': []
        }
        
        return session_id
    
    def send_message(self, session_id: str, message: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Send message to agent in session.
        
        Args:
            session_id: Session identifier
            message: User message
            context: Additional context for the message
        
        Returns:
            Dict containing agent response and metadata
        """
        if session_id not in self.active_sessions:
            raise ValueError(f"Session {session_id} not found")
        
        session = self.active_sessions[session_id]
        
        # Sanitize input
        message = sanitize_input(message)
        
        # Add message to history
        user_message = {
            'role': 'user',
            'content': message,
            'timestamp': datetime.now(),
            'context': context or {}
        }
        session['message_history'].append(user_message)
        
        # Get agent response
        agent = session['agent']
        try:
            response = agent.process_message(message, context)
            
            # Add response to history
            agent_message = {
                'role': 'assistant',
                'content': response.get('message', ''),
                'timestamp': datetime.now(),
                'metadata': response.get('metadata', {}),
                'tools_used': response.get('tools_used', [])
            }
            session['message_history'].append(agent_message)
            
            return {
                'success': True,
                'response': response,
                'session_id': session_id
            }
            
        except Exception as e:
            error_message = {
                'role': 'system',
                'content': f"Error processing message: {str(e)}",
                'timestamp': datetime.now(),
                'error': True
            }
            session['message_history'].append(error_message)
            
            return {
                'success': False,
                'error': str(e),
                'session_id': session_id
            }
    
    def get_session_history(self, session_id: str) -> List[Dict[str, Any]]:
        """
        Get message history for a session.
        
        Args:
            session_id: Session identifier
        
        Returns:
            List of messages in the session
        """
        if session_id not in self.active_sessions:
            raise ValueError(f"Session {session_id} not found")
        
        return self.active_sessions[session_id]['message_history']
    
    def close_session(self, session_id: str) -> bool:
        """
        Close a chat session.
        
        Args:
            session_id: Session identifier
        
        Returns:
            bool: True if session was closed successfully
        """
        if session_id in self.active_sessions:
            # Save session history to memory if needed
            session = self.active_sessions[session_id]
            self.memory_manager.add_experience(
                "chat_session",
                {
                    'session_id': session_id,
                    'user_id': session['user_id'],
                    'agent_type': session['agent_type'],
                    'message_count': len(session['message_history']),
                    'duration': (datetime.now() - session['created_at']).total_seconds()
                },
                "completed"
            )
            
            del self.active_sessions[session_id]
            return True
        
        return False
    
    def get_active_sessions(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get list of active sessions.
        
        Args:
            user_id: Optional user ID to filter sessions
        
        Returns:
            List of active session information
        """
        sessions = []
        
        for session_id, session_data in self.active_sessions.items():
            if user_id is None or session_data['user_id'] == user_id:
                sessions.append({
                    'session_id': session_id,
                    'user_id': session_data['user_id'],
                    'agent_type': session_data['agent_type'],
                    'created_at': session_data['created_at'],
                    'message_count': len(session_data['message_history'])
                })
        
        return sessions