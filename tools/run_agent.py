#!/usr/bin/env python3
"""Run agent with specified configuration."""

import sys
import os
import argparse
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from src.job_automation.infrastructure.monitoring import setup_logger
from src.job_automation.core.memory import MemoryManager
from src.job_automation.core.agents.career_page_agent import CareerPageAgent


def main():
    """Main entry point for running agents."""
    parser = argparse.ArgumentParser(description="Run AI agents")
    parser.add_argument("--agent", choices=["career_page"], required=True,
                       help="Agent type to run")
    parser.add_argument("--config", help="Configuration file path")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    parser.add_argument("--memory-file", help="Memory storage file")
    
    args = parser.parse_args()
    
    # Setup logging
    log_level = "DEBUG" if args.debug else "INFO"
    logger = setup_logger("agent_runner", level=log_level)
    
    logger.info(f"Starting {args.agent} agent")
    
    try:
        # Initialize memory manager
        memory_manager = MemoryManager()
        
        # Initialize agent based on type
        if args.agent == "career_page":
            agent = CareerPageAgent(memory_manager=memory_manager, logger=logger)
        else:
            raise ValueError(f"Unknown agent type: {args.agent}")
        
        # Run agent
        logger.info("Agent initialized successfully")
        
        # Interactive mode
        print(f"\n{args.agent.upper()} Agent Ready!")
        print("Type 'quit' to exit, 'help' for commands")
        
        while True:
            try:
                user_input = input("\n> ").strip()
                
                if user_input.lower() in ['quit', 'exit']:
                    break
                elif user_input.lower() == 'help':
                    print("Commands:")
                    print("  quit/exit - Exit the agent")
                    print("  status - Show agent status")
                    print("  memory - Show memory stats")
                elif user_input.lower() == 'status':
                    print(f"Agent: {args.agent}")
                    print(f"Status: Running")
                elif user_input.lower() == 'memory':
                    stats = memory_manager.get_memory_stats()
                    for key, value in stats.items():
                        print(f"  {key}: {value}")
                else:
                    # Process user input with agent
                    response = agent.process_input(user_input)
                    print(f"\nAgent: {response}")
                    
            except KeyboardInterrupt:
                break
            except Exception as e:
                logger.error(f"Error processing input: {e}")
                print(f"Error: {e}")
        
        print("\nAgent shutting down...")
        logger.info("Agent shutdown complete")
        
    except Exception as e:
        logger.error(f"Failed to start agent: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()