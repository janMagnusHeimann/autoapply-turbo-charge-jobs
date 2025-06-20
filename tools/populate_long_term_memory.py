#!/usr/bin/env python3
"""Populate long-term memory with initial knowledge and experiences."""

import sys
import os
import json
import argparse
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from src.job_automation.infrastructure.monitoring import setup_logger
from src.job_automation.core.memory import LongTermMemory


def load_knowledge_from_file(file_path: str) -> dict:
    """Load knowledge from JSON file."""
    with open(file_path, 'r') as f:
        return json.load(f)


def populate_job_search_knowledge(memory: LongTermMemory):
    """Populate with job search related knowledge."""
    
    # Job search strategies
    memory.add_knowledge(
        "job_search_strategies",
        "application_best_practices",
        {
            "cover_letter_tips": [
                "Personalize for each company",
                "Highlight relevant experience",
                "Show enthusiasm for the role",
                "Keep it concise (1 page max)"
            ],
            "resume_tips": [
                "Use action verbs",
                "Quantify achievements",
                "Tailor to job description",
                "Keep formatting consistent"
            ],
            "interview_preparation": [
                "Research company thoroughly",
                "Prepare STAR method examples",
                "Prepare thoughtful questions",
                "Practice common interview questions"
            ]
        }
    )
    
    # Common job boards and their characteristics
    memory.add_knowledge(
        "job_boards",
        "platform_characteristics",
        {
            "linkedin": {
                "type": "professional_network",
                "best_for": "networking_and_referrals",
                "tips": "Optimize profile, engage with content"
            },
            "indeed": {
                "type": "job_aggregator",
                "best_for": "broad_job_search",
                "tips": "Use specific keywords, set up alerts"
            },
            "glassdoor": {
                "type": "company_research",
                "best_for": "salary_and_culture_research",
                "tips": "Read reviews, check salary ranges"
            }
        }
    )
    
    # Industry-specific knowledge
    memory.add_knowledge(
        "industries",
        "tech_industry",
        {
            "common_roles": [
                "software_engineer",
                "data_scientist",
                "product_manager",
                "devops_engineer",
                "ui_ux_designer"
            ],
            "required_skills": {
                "technical": ["programming", "system_design", "testing"],
                "soft": ["communication", "teamwork", "problem_solving"]
            },
            "career_progression": [
                "junior -> mid -> senior -> lead -> principal/staff"
            ]
        }
    )


def populate_company_knowledge(memory: LongTermMemory):
    """Populate with company-specific knowledge."""
    
    # Company research framework
    memory.add_knowledge(
        "company_research",
        "research_framework",
        {
            "key_areas": [
                "company_mission_and_values",
                "recent_news_and_developments",
                "company_culture",
                "growth_trajectory",
                "leadership_team",
                "competitive_landscape"
            ],
            "research_sources": [
                "company_website",
                "linkedin_company_page",
                "glassdoor_reviews",
                "recent_press_releases",
                "industry_reports"
            ]
        }
    )


def populate_successful_experiences(memory: LongTermMemory):
    """Populate with example successful experiences."""
    
    # Successful application patterns
    memory.add_experience(
        "job_application",
        {
            "personalized_cover_letter": True,
            "tailored_resume": True,
            "followed_up_after_application": True,
            "researched_company_thoroughly": True,
            "applied_within_24_hours": True
        },
        "success"
    )
    
    memory.add_experience(
        "interview_preparation",
        {
            "practiced_coding_problems": True,
            "prepared_behavioral_questions": True,
            "researched_interviewer_background": True,
            "prepared_thoughtful_questions": True
        },
        "success"
    )
    
    # Less successful patterns
    memory.add_experience(
        "job_application",
        {
            "generic_cover_letter": True,
            "no_follow_up": True,
            "applied_late": True,
            "no_company_research": True
        },
        "failure"
    )


def main():
    """Main entry point for populating long-term memory."""
    parser = argparse.ArgumentParser(description="Populate long-term memory")
    parser.add_argument("--knowledge-file", help="JSON file with knowledge to load")
    parser.add_argument("--clear-existing", action="store_true", 
                       help="Clear existing memory before populating")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    
    args = parser.parse_args()
    
    # Setup logging
    log_level = "DEBUG" if args.debug else "INFO"
    logger = setup_logger("memory_populator", level=log_level)
    
    logger.info("Starting memory population")
    
    try:
        # Initialize memory
        memory = LongTermMemory()
        
        if args.clear_existing:
            logger.info("Clearing existing memory")
            memory.clear_memory()
        
        # Load from file if specified
        if args.knowledge_file:
            logger.info(f"Loading knowledge from {args.knowledge_file}")
            knowledge_data = load_knowledge_from_file(args.knowledge_file)
            
            for category, items in knowledge_data.items():
                for key, value in items.items():
                    memory.add_knowledge(category, key, value)
                    logger.info(f"Added knowledge: {category}.{key}")
        
        # Populate default knowledge
        logger.info("Populating job search knowledge")
        populate_job_search_knowledge(memory)
        
        logger.info("Populating company knowledge")
        populate_company_knowledge(memory)
        
        logger.info("Populating successful experiences")
        populate_successful_experiences(memory)
        
        # Show stats
        stats = {
            "knowledge_categories": len(memory.knowledge_base),
            "total_experiences": len(memory.experiences),
            "learned_patterns": len(memory.patterns)
        }
        
        logger.info("Memory population complete")
        for key, value in stats.items():
            logger.info(f"  {key}: {value}")
        
    except Exception as e:
        logger.error(f"Failed to populate memory: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()