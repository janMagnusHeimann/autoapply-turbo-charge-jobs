#!/usr/bin/env python3
"""
Generate evaluation dataset for agent training and testing.

This script creates synthetic datasets for evaluating agent performance,
including job descriptions, user profiles, and expected outcomes.
"""

import os
import sys
import json
import argparse
import random
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from backend.src.job_automation.core.memory.memory_manager import MemoryManager
from backend.src.job_automation.infrastructure.monitoring.logger import get_logger

logger = get_logger(__name__)


class EvaluationDatasetGenerator:
    """Generate evaluation datasets for agent testing."""
    
    def __init__(self, output_dir: str = "data/evaluation"):
        """
        Initialize the generator.
        
        Args:
            output_dir: Directory to save generated datasets
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Sample data templates
        self.job_titles = [
            "Senior Software Engineer", "Data Scientist", "DevOps Engineer",
            "Frontend Developer", "Backend Developer", "Full Stack Developer",
            "Machine Learning Engineer", "Product Manager", "Security Engineer",
            "Cloud Architect", "Mobile Developer", "QA Engineer"
        ]
        
        self.companies = [
            {"name": "TechCorp", "industry": "Technology", "size": "large"},
            {"name": "StartupXYZ", "industry": "Fintech", "size": "startup"},
            {"name": "DataFlow Inc", "industry": "Analytics", "size": "medium"},
            {"name": "CloudScale", "industry": "Cloud Services", "size": "large"},
            {"name": "MobileFirst", "industry": "Mobile Apps", "size": "small"},
            {"name": "SecureNet", "industry": "Cybersecurity", "size": "medium"}
        ]
        
        self.skills = [
            "Python", "JavaScript", "React", "Node.js", "AWS", "Docker",
            "Kubernetes", "PostgreSQL", "MongoDB", "Machine Learning",
            "TensorFlow", "Git", "CI/CD", "Microservices", "REST APIs",
            "GraphQL", "TypeScript", "Vue.js", "Angular", "Go", "Rust"
        ]
        
        self.locations = [
            "San Francisco, CA", "New York, NY", "Seattle, WA", "Austin, TX",
            "Boston, MA", "Denver, CO", "Remote", "Chicago, IL", "Los Angeles, CA"
        ]
    
    def generate_job_listing(self) -> Dict[str, Any]:
        """Generate a synthetic job listing."""
        company = random.choice(self.companies)
        title = random.choice(self.job_titles)
        required_skills = random.sample(self.skills, random.randint(3, 7))
        location = random.choice(self.locations)
        
        # Generate salary based on title and location
        base_salary = {
            "Senior Software Engineer": 130000,
            "Data Scientist": 120000,
            "DevOps Engineer": 125000,
            "Frontend Developer": 100000,
            "Backend Developer": 110000,
            "Full Stack Developer": 115000,
            "Machine Learning Engineer": 140000,
            "Product Manager": 135000,
            "Security Engineer": 130000,
            "Cloud Architect": 150000,
            "Mobile Developer": 105000,
            "QA Engineer": 85000
        }.get(title, 100000)
        
        # Adjust for location and company size
        location_multiplier = 1.3 if "San Francisco" in location or "New York" in location else 1.0
        size_multiplier = {"startup": 0.9, "small": 0.95, "medium": 1.0, "large": 1.1}[company["size"]]
        
        min_salary = int(base_salary * location_multiplier * size_multiplier * 0.9)
        max_salary = int(base_salary * location_multiplier * size_multiplier * 1.2)
        
        return {
            "id": f"job_{random.randint(10000, 99999)}",
            "title": title,
            "company": company,
            "location": location,
            "remote_option": random.choice(["on-site", "remote", "hybrid"]),
            "job_type": "full-time",
            "salary_range": f"${min_salary:,} - ${max_salary:,}",
            "min_salary": min_salary,
            "max_salary": max_salary,
            "required_skills": required_skills,
            "description": self._generate_job_description(title, required_skills),
            "posted_date": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
            "external_url": f"https://{company['name'].lower().replace(' ', '')}.com/jobs/{random.randint(1000, 9999)}"
        }
    
    def generate_user_profile(self) -> Dict[str, Any]:
        """Generate a synthetic user profile."""
        user_skills = random.sample(self.skills, random.randint(5, 12))
        experience_years = random.randint(2, 15)
        
        return {
            "id": f"user_{random.randint(10000, 99999)}",
            "full_name": f"Test User {random.randint(1, 1000)}",
            "email": f"testuser{random.randint(1, 1000)}@example.com",
            "skills": user_skills,
            "experience_years": experience_years,
            "preferred_locations": random.sample(self.locations, random.randint(1, 3)),
            "preferred_remote": random.choice(["on-site", "remote", "hybrid", "any"]),
            "min_salary": random.randint(70000, 150000),
            "max_salary": random.randint(150000, 250000),
            "preferred_industries": random.sample([c["industry"] for c in self.companies], random.randint(1, 3)),
            "github_username": f"testuser{random.randint(1, 1000)}",
            "repositories": self._generate_repositories(user_skills),
            "education": self._generate_education(),
            "work_experience": self._generate_work_experience(experience_years)
        }
    
    def _generate_job_description(self, title: str, skills: List[str]) -> str:
        """Generate a job description."""
        return f"""We are seeking a talented {title} to join our growing team. 

Responsibilities:
- Develop and maintain high-quality software solutions
- Collaborate with cross-functional teams to deliver projects
- Participate in code reviews and technical discussions
- Contribute to architectural decisions and best practices

Requirements:
- {random.randint(2, 8)}+ years of experience in software development
- Strong proficiency in {', '.join(skills[:3])}
- Experience with {', '.join(skills[3:6]) if len(skills) > 3 else 'relevant technologies'}
- Excellent problem-solving and communication skills
- Bachelor's degree in Computer Science or related field

Nice to have:
- Experience with {', '.join(skills[6:]) if len(skills) > 6 else 'additional technologies'}
- Previous startup/enterprise experience
- Open source contributions

We offer competitive compensation, comprehensive benefits, and opportunities for professional growth."""
    
    def _generate_repositories(self, user_skills: List[str]) -> List[Dict[str, Any]]:
        """Generate repositories for a user."""
        repos = []
        for i in range(random.randint(3, 8)):
            skill = random.choice(user_skills)
            repos.append({
                "name": f"{skill.lower()}-project-{i+1}",
                "description": f"A {skill} project demonstrating advanced concepts",
                "language": skill if skill in ["Python", "JavaScript", "Go", "Rust"] else "Python",
                "stars": random.randint(0, 100),
                "forks": random.randint(0, 20),
                "url": f"https://github.com/testuser/project-{i+1}"
            })
        return repos
    
    def _generate_education(self) -> List[Dict[str, Any]]:
        """Generate education history."""
        degrees = [
            {"degree": "B.S. Computer Science", "university": "Tech University", "year": 2018},
            {"degree": "M.S. Software Engineering", "university": "Engineering College", "year": 2020}
        ]
        return random.sample(degrees, random.randint(1, 2))
    
    def _generate_work_experience(self, years: int) -> List[Dict[str, Any]]:
        """Generate work experience."""
        experiences = []
        current_year = datetime.now().year
        
        for i in range(min(years // 2 + 1, 4)):  # Max 4 jobs
            job_years = random.randint(1, 3)
            start_year = current_year - years + (i * job_years)
            end_year = start_year + job_years if i < 3 else current_year
            
            experiences.append({
                "title": random.choice(self.job_titles),
                "company": random.choice(self.companies)["name"],
                "duration": f"{start_year}-{end_year}",
                "description": "Developed software solutions and collaborated with teams"
            })
        
        return experiences
    
    def generate_evaluation_case(self) -> Dict[str, Any]:
        """Generate a complete evaluation case with job, user, and expected outcome."""
        job = self.generate_job_listing()
        user = self.generate_user_profile()
        
        # Calculate match score based on skills overlap and other factors
        job_skills = set(skill.lower() for skill in job["required_skills"])
        user_skills = set(skill.lower() for skill in user["skills"])
        
        skill_overlap = len(job_skills.intersection(user_skills))
        total_job_skills = len(job_skills)
        skill_match_score = skill_overlap / total_job_skills if total_job_skills > 0 else 0
        
        # Factor in salary match
        salary_match = 1.0
        if job["min_salary"] > user["max_salary"]:
            salary_match = 0.3
        elif job["max_salary"] < user["min_salary"]:
            salary_match = 0.3
        
        # Factor in location preference
        location_match = 1.0
        if job["location"] not in user["preferred_locations"] and "Remote" not in user["preferred_locations"]:
            location_match = 0.7
        
        # Overall match score
        match_score = (skill_match_score * 0.6 + salary_match * 0.2 + location_match * 0.2)
        
        # Determine expected actions
        expected_actions = []
        if match_score > 0.7:
            expected_actions.append("apply")
        if match_score > 0.8:
            expected_actions.append("priority_apply")
        if match_score < 0.5:
            expected_actions.append("skip")
        
        return {
            "case_id": f"eval_{random.randint(10000, 99999)}",
            "job_listing": job,
            "user_profile": user,
            "expected_match_score": round(match_score, 2),
            "expected_actions": expected_actions,
            "evaluation_criteria": {
                "skill_match": round(skill_match_score, 2),
                "salary_match": round(salary_match, 2),
                "location_match": round(location_match, 2),
                "skills_overlap": list(job_skills.intersection(user_skills))
            }
        }
    
    def generate_dataset(self, num_cases: int = 100) -> Dict[str, Any]:
        """Generate a complete evaluation dataset."""
        logger.info(f"Generating evaluation dataset with {num_cases} cases")
        
        cases = []
        for i in range(num_cases):
            case = self.generate_evaluation_case()
            cases.append(case)
            
            if (i + 1) % 10 == 0:
                logger.info(f"Generated {i + 1}/{num_cases} cases")
        
        dataset = {
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "num_cases": num_cases,
                "generator_version": "1.0.0"
            },
            "cases": cases
        }
        
        return dataset
    
    def save_dataset(self, dataset: Dict[str, Any], filename: str = None) -> str:
        """Save dataset to file."""
        if filename is None:
            filename = f"evaluation_dataset_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        filepath = self.output_dir / filename
        
        with open(filepath, 'w') as f:
            json.dump(dataset, f, indent=2)
        
        logger.info(f"Dataset saved to {filepath}")
        return str(filepath)
    
    def generate_test_scenarios(self) -> Dict[str, Any]:
        """Generate specific test scenarios for agent evaluation."""
        scenarios = {
            "high_match_scenario": {
                "description": "User with perfect skill match for job",
                "cases": []
            },
            "low_match_scenario": {
                "description": "User with poor skill match for job",
                "cases": []
            },
            "salary_mismatch_scenario": {
                "description": "Good skills but salary requirements don't align",
                "cases": []
            },
            "location_preference_scenario": {
                "description": "Testing location preference handling",
                "cases": []
            }
        }
        
        # Generate specific cases for each scenario
        for scenario_name, scenario_data in scenarios.items():
            for _ in range(10):  # 10 cases per scenario
                case = self.generate_evaluation_case()
                
                # Modify case based on scenario
                if scenario_name == "high_match_scenario":
                    # Ensure high skill overlap
                    job_skills = case["job_listing"]["required_skills"]
                    case["user_profile"]["skills"] = job_skills + random.sample(self.skills, 3)
                
                elif scenario_name == "low_match_scenario":
                    # Ensure low skill overlap
                    job_skills = set(case["job_listing"]["required_skills"])
                    available_skills = set(self.skills) - job_skills
                    case["user_profile"]["skills"] = list(available_skills)[:5]
                
                elif scenario_name == "salary_mismatch_scenario":
                    # Create salary mismatch
                    case["user_profile"]["min_salary"] = case["job_listing"]["max_salary"] + 50000
                
                elif scenario_name == "location_preference_scenario":
                    # Test remote vs on-site preferences
                    case["job_listing"]["remote_option"] = "on-site"
                    case["user_profile"]["preferred_locations"] = ["Remote"]
                
                scenario_data["cases"].append(case)
        
        return scenarios


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Generate evaluation dataset for agent training")
    parser.add_argument("--num-cases", type=int, default=100, help="Number of evaluation cases to generate")
    parser.add_argument("--output-dir", type=str, default="data/evaluation", help="Output directory")
    parser.add_argument("--scenarios", action="store_true", help="Generate test scenarios")
    parser.add_argument("--format", choices=["json", "csv"], default="json", help="Output format")
    
    args = parser.parse_args()
    
    # Create generator
    generator = EvaluationDatasetGenerator(args.output_dir)
    
    if args.scenarios:
        # Generate test scenarios
        logger.info("Generating test scenarios...")
        scenarios = generator.generate_test_scenarios()
        
        for scenario_name, scenario_data in scenarios.items():
            filename = f"test_scenarios_{scenario_name}.json"
            filepath = generator.output_dir / filename
            
            with open(filepath, 'w') as f:
                json.dump(scenario_data, f, indent=2)
            
            logger.info(f"Test scenario saved to {filepath}")
    
    else:
        # Generate main dataset
        dataset = generator.generate_dataset(args.num_cases)
        filepath = generator.save_dataset(dataset)
        
        logger.info(f"Generated evaluation dataset with {args.num_cases} cases")
        logger.info(f"Dataset saved to: {filepath}")
        
        # Print summary statistics
        cases = dataset["cases"]
        match_scores = [case["expected_match_score"] for case in cases]
        
        print(f"\\nDataset Statistics:")
        print(f"Total cases: {len(cases)}")
        print(f"Average match score: {sum(match_scores) / len(match_scores):.2f}")
        print(f"High match cases (>0.7): {len([s for s in match_scores if s > 0.7])}")
        print(f"Low match cases (<0.5): {len([s for s in match_scores if s < 0.5])}")


if __name__ == "__main__":
    main()