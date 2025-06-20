#!/usr/bin/env python3
"""Delete or clear long-term memory data."""

import sys
import os
import argparse
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from src.job_automation.infrastructure.monitoring import setup_logger
from src.job_automation.core.memory import LongTermMemory


def main():
    """Main entry point for memory deletion."""
    parser = argparse.ArgumentParser(description="Delete long-term memory data")
    parser.add_argument("--category", help="Delete specific knowledge category")
    parser.add_argument("--key", help="Delete specific knowledge key (requires --category)")
    parser.add_argument("--experiences", action="store_true", help="Delete all experiences")
    parser.add_argument("--patterns", action="store_true", help="Delete all patterns")
    parser.add_argument("--clear-all", action="store_true", help="Clear all memory (destructive)")
    parser.add_argument("--confirm", action="store_true", help="Confirm destructive operations")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    
    args = parser.parse_args()
    
    # Setup logging
    log_level = "DEBUG" if args.debug else "INFO"
    logger = setup_logger("memory_deleter", level=log_level)
    
    # Safety check for destructive operations
    destructive_ops = [args.clear_all, args.experiences, args.patterns]
    if any(destructive_ops) and not args.confirm:
        logger.error("Destructive operations require --confirm flag")
        sys.exit(1)
    
    logger.info("Starting memory deletion")
    
    try:
        # Initialize memory
        memory = LongTermMemory()
        memory.load_from_storage()
        
        # Get initial stats
        initial_stats = {
            "knowledge_categories": len(memory.knowledge_base),
            "total_experiences": len(memory.experiences),
            "learned_patterns": len(memory.patterns)
        }
        
        logger.info("Initial memory stats:")
        for key, value in initial_stats.items():
            logger.info(f"  {key}: {value}")
        
        # Perform deletion operations
        if args.clear_all:
            logger.warning("Clearing ALL memory data")
            memory.clear_memory()
            logger.info("All memory cleared")
        
        elif args.category:
            if args.key:
                # Delete specific knowledge item
                if args.category in memory.knowledge_base:
                    if args.key in memory.knowledge_base[args.category]:
                        del memory.knowledge_base[args.category][args.key]
                        logger.info(f"Deleted knowledge: {args.category}.{args.key}")
                        
                        # Clean up empty category
                        if not memory.knowledge_base[args.category]:
                            del memory.knowledge_base[args.category]
                            logger.info(f"Removed empty category: {args.category}")
                    else:
                        logger.warning(f"Key '{args.key}' not found in category '{args.category}'")
                else:
                    logger.warning(f"Category '{args.category}' not found")
            else:
                # Delete entire category
                if args.category in memory.knowledge_base:
                    del memory.knowledge_base[args.category]
                    logger.info(f"Deleted category: {args.category}")
                else:
                    logger.warning(f"Category '{args.category}' not found")
        
        elif args.experiences:
            logger.warning("Clearing all experiences")
            memory.experiences.clear()
            logger.info("All experiences cleared")
        
        elif args.patterns:
            logger.warning("Clearing all patterns")
            memory.patterns.clear()
            logger.info("All patterns cleared")
        
        else:
            logger.error("No deletion operation specified")
            parser.print_help()
            sys.exit(1)
        
        # Show final stats
        final_stats = {
            "knowledge_categories": len(memory.knowledge_base),
            "total_experiences": len(memory.experiences),
            "learned_patterns": len(memory.patterns)
        }
        
        logger.info("Final memory stats:")
        for key, value in final_stats.items():
            logger.info(f"  {key}: {value}")
        
        # Show what was deleted
        logger.info("Deletion summary:")
        for key in initial_stats:
            deleted = initial_stats[key] - final_stats[key]
            if deleted > 0:
                logger.info(f"  Deleted {deleted} {key}")
        
        logger.info("Memory deletion complete")
        
    except Exception as e:
        logger.error(f"Failed to delete memory: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()