"""
Base LangChain Service - Core infrastructure for AI-powered automation

This module provides the base class and utilities for all LangChain-powered
services in the application agent system.
"""

import asyncio
import logging
from typing import Any, Dict, Optional, Type, TypeVar, Generic
from datetime import datetime
import json

from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import PydanticOutputParser, JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain.memory import ConversationBufferWindowMemory
from pydantic import BaseModel, ValidationError

logger = logging.getLogger(__name__)

T = TypeVar('T', bound=BaseModel)


class BaseLangChainService(Generic[T]):
    """
    Base class for all LangChain-powered services
    
    Provides common functionality including:
    - LLM client management
    - Structured output parsing
    - Error handling and retry logic
    - Memory management
    - Performance monitoring
    """
    
    def __init__(
        self,
        openai_api_key: str,
        model_name: str = "gpt-4",
        temperature: float = 0.1,
        max_retries: int = 3,
        memory_size: int = 10
    ):
        """
        Initialize base LangChain service
        
        Args:
            openai_api_key: OpenAI API key
            model_name: OpenAI model to use
            temperature: LLM temperature setting
            max_retries: Maximum retry attempts
            memory_size: Size of conversation memory
        """
        self.openai_api_key = openai_api_key
        self.model_name = model_name
        self.temperature = temperature
        self.max_retries = max_retries
        
        # Initialize LLM client
        self.llm = ChatOpenAI(
            api_key=openai_api_key,
            model=model_name,
            temperature=temperature,
            max_retries=max_retries,
            request_timeout=60.0
        )
        
        # Initialize memory for context retention
        self.memory = ConversationBufferWindowMemory(
            k=memory_size,
            return_messages=True
        )
        
        # Performance tracking
        self.request_count = 0
        self.total_tokens_used = 0
        self.average_response_time = 0.0
        
        logger.info(f"Initialized {self.__class__.__name__} with model {model_name}")
    
    async def _run_chain_with_structured_output(
        self,
        prompt_template: ChatPromptTemplate,
        input_data: Dict[str, Any],
        output_model: Type[T],
        use_memory: bool = False
    ) -> T:
        """
        Run a LangChain chain with structured output parsing
        
        Args:
            prompt_template: Prompt template to use
            input_data: Input data for the prompt
            output_model: Pydantic model for output parsing
            use_memory: Whether to use conversation memory
            
        Returns:
            Parsed structured output
        """
        start_time = datetime.now()
        
        try:
            # Create output parser
            parser = PydanticOutputParser(pydantic_object=output_model)
            
            # Add format instructions to input
            input_data['format_instructions'] = parser.get_format_instructions()
            
            # Create chain
            chain = prompt_template | self.llm | parser
            
            # Add memory context if requested
            if use_memory:
                memory_context = self.memory.load_memory_variables({})
                input_data['conversation_history'] = memory_context.get('history', [])
            
            # Execute chain
            logger.info(f"Running chain with input keys: {list(input_data.keys())}")
            result = await chain.ainvoke(input_data)
            
            # Update memory if used
            if use_memory:
                self.memory.save_context(
                    {"input": str(input_data)},
                    {"output": str(result)}
                )
            
            # Update performance metrics
            self._update_performance_metrics(start_time)
            
            logger.info(f"Chain completed successfully with {output_model.__name__}")
            return result
            
        except ValidationError as e:
            logger.error(f"Output validation failed: {e}")
            # Try to parse with fallback method
            return await self._fallback_parsing(input_data, output_model, str(e))
            
        except Exception as e:
            logger.error(f"Chain execution failed: {e}")
            # Implement retry logic
            return await self._retry_with_fallback(
                prompt_template, input_data, output_model, str(e)
            )
    
    async def _run_chain_with_json_output(
        self,
        prompt_template: ChatPromptTemplate,
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Run a chain with JSON output (for flexible responses)
        
        Args:
            prompt_template: Prompt template to use
            input_data: Input data for the prompt
            
        Returns:
            JSON response as dictionary
        """
        start_time = datetime.now()
        
        try:
            parser = JsonOutputParser()
            input_data['format_instructions'] = parser.get_format_instructions()
            
            chain = prompt_template | self.llm | parser
            result = await chain.ainvoke(input_data)
            
            self._update_performance_metrics(start_time)
            return result
            
        except Exception as e:
            logger.error(f"JSON chain execution failed: {e}")
            return {"error": str(e), "success": False}
    
    async def _fallback_parsing(
        self,
        input_data: Dict[str, Any],
        output_model: Type[T],
        error_message: str
    ) -> T:
        """
        Fallback parsing method when structured output fails
        
        Args:
            input_data: Original input data
            output_model: Target output model
            error_message: Original error message
            
        Returns:
            Best-effort parsed output or default instance
        """
        logger.warning(f"Using fallback parsing for {output_model.__name__}")
        
        try:
            # Create a simple chain to get raw text response
            simple_prompt = ChatPromptTemplate.from_template(
                "Based on this input: {input}, provide a response that can be parsed as {model_name}. "
                "Error encountered: {error}. Please provide valid JSON."
            )
            
            chain = simple_prompt | self.llm
            response = await chain.ainvoke({
                "input": str(input_data),
                "model_name": output_model.__name__,
                "error": error_message
            })
            
            # Try to parse the response
            if hasattr(response, 'content'):
                content = response.content
            else:
                content = str(response)
            
            # Try JSON parsing first
            try:
                json_data = json.loads(content)
                return output_model.parse_obj(json_data)
            except (json.JSONDecodeError, ValidationError):
                pass
            
            # Create minimal valid instance
            return self._create_minimal_instance(output_model)
            
        except Exception as e:
            logger.error(f"Fallback parsing failed: {e}")
            return self._create_minimal_instance(output_model)
    
    async def _retry_with_fallback(
        self,
        prompt_template: ChatPromptTemplate,
        input_data: Dict[str, Any],
        output_model: Type[T],
        error_message: str,
        retry_count: int = 0
    ) -> T:
        """
        Retry chain execution with exponential backoff and circuit breaker
        
        Args:
            prompt_template: Original prompt template
            input_data: Input data
            output_model: Target output model
            error_message: Error that caused retry
            retry_count: Current retry attempt
            
        Returns:
            Structured output or minimal fallback instance
        """
        if retry_count >= self.max_retries:
            logger.error(f"Max retries exceeded for {output_model.__name__}, creating minimal instance")
            return self._create_minimal_instance(output_model)
        
        # Check for specific JSON parsing errors to prevent infinite loops
        if "Invalid json output" in error_message and retry_count >= 2:
            logger.warning(f"JSON parsing failed multiple times, falling back to minimal instance")
            return self._create_minimal_instance(output_model)
        
        # Exponential backoff
        wait_time = min(2 ** retry_count, 10)  # Cap at 10 seconds
        logger.info(f"Retrying in {wait_time} seconds (attempt {retry_count + 1})")
        await asyncio.sleep(wait_time)
        
        try:
            # For retries, try with a simplified prompt to encourage JSON output
            if retry_count > 0:
                return await self._simplified_retry(input_data, output_model, retry_count)
            else:
                return await self._run_chain_with_structured_output(
                    prompt_template, input_data, output_model
                )
        except Exception as e:
            logger.warning(f"Retry {retry_count + 1} failed: {e}")
            if retry_count + 1 >= self.max_retries:
                logger.error("All retries exhausted, returning minimal instance")
                return self._create_minimal_instance(output_model)
            return await self._retry_with_fallback(
                prompt_template, input_data, output_model, str(e), retry_count + 1
            )
    
    async def _simplified_retry(
        self,
        input_data: Dict[str, Any],
        output_model: Type[T],
        retry_count: int
    ) -> T:
        """
        Simplified retry with minimal prompt to encourage JSON output
        """
        try:
            parser = PydanticOutputParser(pydantic_object=output_model)
            format_instructions = parser.get_format_instructions()
            
            # Create a very simple prompt that just asks for JSON
            simple_prompt = ChatPromptTemplate.from_template(
                "Based on the provided data, return a valid JSON response that matches this format exactly. "
                "Do not include any explanations, markdown, or additional text. Only return valid JSON.\n\n"
                "Format required:\n{format_instructions}\n\n"
                "Data: {data}\n\n"
                "Response (JSON only):"
            )
            
            chain = simple_prompt | self.llm | parser
            
            result = await chain.ainvoke({
                "format_instructions": format_instructions,
                "data": str(input_data)
            })
            
            logger.info(f"Simplified retry {retry_count} succeeded")
            return result
            
        except Exception as e:
            logger.error(f"Simplified retry {retry_count} failed: {e}")
            raise e
    
    def _create_minimal_instance(self, output_model: Type[T]) -> T:
        """
        Create a minimal valid instance of the output model
        
        Args:
            output_model: Pydantic model class
            
        Returns:
            Minimal valid instance with default values
        """
        try:
            # Try to create with empty dict (will use defaults)
            return output_model.parse_obj({})
        except ValidationError:
            # Create with minimal required fields
            fields = output_model.__fields__
            minimal_data = {}
            
            for field_name, field_info in fields.items():
                if field_info.is_required():
                    # Provide reasonable defaults based on type
                    field_type = field_info.type_
                    if field_type == str:
                        minimal_data[field_name] = ""
                    elif field_type == int:
                        minimal_data[field_name] = 0
                    elif field_type == float:
                        minimal_data[field_name] = 0.0
                    elif field_type == bool:
                        minimal_data[field_name] = False
                    elif field_type == list:
                        minimal_data[field_name] = []
                    elif field_type == dict:
                        minimal_data[field_name] = {}
            
            try:
                return output_model.parse_obj(minimal_data)
            except ValidationError as e:
                logger.error(f"Failed to create minimal instance: {e}")
                # Last resort: create with all defaults
                return output_model()
    
    def _update_performance_metrics(self, start_time: datetime) -> None:
        """Update performance tracking metrics"""
        end_time = datetime.now()
        response_time = (end_time - start_time).total_seconds()
        
        self.request_count += 1
        
        # Update average response time
        if self.request_count == 1:
            self.average_response_time = response_time
        else:
            self.average_response_time = (
                (self.average_response_time * (self.request_count - 1) + response_time) 
                / self.request_count
            )
        
        logger.debug(f"Request completed in {response_time:.2f}s (avg: {self.average_response_time:.2f}s)")
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get current performance statistics"""
        return {
            "request_count": self.request_count,
            "average_response_time": self.average_response_time,
            "total_tokens_used": self.total_tokens_used,
            "model_name": self.model_name,
            "memory_size": len(self.memory.buffer) if hasattr(self.memory, 'buffer') else 0
        }
    
