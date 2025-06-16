# Browser Use Agents for Job Application Automation

A comprehensive guide to building AI agents that automate job searching and application processes using Browser Use with Claude Code integration.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Agent Architecture](#agent-architecture)
- [Core Agents](#core-agents)
- [Advanced Workflows](#advanced-workflows)
- [Claude Code Integration](#claude-code-integration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Examples](#examples)

## Overview

Browser Use enables AI agents to interact with web browsers through natural language commands, making it perfect for automating repetitive job application tasks. This guide focuses on creating specialized agents for job search automation that can:

- Search for jobs across multiple platforms
- Automatically fill and submit applications
- Manage follow-up communications
- Track application status
- Generate insights and reports

## Prerequisites

### System Requirements
- Python 3.11 or higher
- Browser Use library installed
- Playwright browser automation
- Valid API keys for LLM providers

### Installation
```bash
# Create virtual environment
uv venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows

# Install dependencies
uv pip install browser-use python-dotenv
uv run playwright install
```

### Environment Setup
Create a `.env` file with your API keys:
```env
ANTHROPIC_API_KEY=your_claude_api_key
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_google_key
DEEPSEEK_API_KEY=your_deepseek_key
```

## Quick Start

### Basic Job Search Agent
```python
import asyncio
from browser_use import Agent
from langchain_anthropic import ChatAnthropic
from dotenv import load_dotenv

load_dotenv()

async def quick_job_search():
    agent = Agent(
        task="Search for 'Software Engineer' jobs on LinkedIn and save the top 5 results to a file",
        llm=ChatAnthropic(model="claude-3-5-sonnet-20241022"),
    )
    result = await agent.run()
    return result

# Run with Claude Code
if __name__ == "__main__":
    asyncio.run(quick_job_search())
```

## Agent Architecture

### Base Agent Configuration
```python
from browser_use import Agent, Browser, BrowserConfig
from dataclasses import dataclass
from typing import List, Optional, Dict

@dataclass
class JobSearchConfig:
    keywords: List[str]
    location: str
    experience_level: str
    salary_range: Optional[str] = None
    remote_only: bool = False
    max_results: int = 10

class JobApplicationAgent:
    def __init__(self, config: JobSearchConfig, llm):
        self.config = config
        self.llm = llm
        self.browser_config = BrowserConfig(
            headless=False,  # Set True for production
            wait_for_network_idle_page_load_time=3.0,
            highlight_elements=True,
        )
    
    async def create_agent(self, task: str) -> Agent:
        return Agent(
            task=task,
            llm=self.llm,
            browser=Browser(config=self.browser_config)
        )
```

## Core Agents

### 1. Job Discovery Agent

**Purpose**: Searches for job opportunities across multiple platforms

```python
class JobDiscoveryAgent(JobApplicationAgent):
    async def search_jobs(self) -> Dict:
        search_query = " OR ".join(self.config.keywords)
        location_filter = f"in {self.config.location}" if not self.config.remote_only else "remote"
        
        task = f"""
        Search for jobs matching these criteria:
        - Keywords: {search_query}
        - Location: {location_filter}
        - Experience Level: {self.config.experience_level}
        - Maximum Results: {self.config.max_results}
        
        Platforms to search:
        1. LinkedIn Jobs
        2. Indeed
        3. Glassdoor
        4. AngelList (for startups)
        5. Company career pages (Google, Meta, Apple, etc.)
        
        For each job found, extract:
        - Job title and company name
        - Location and remote status
        - Salary range (if available)
        - Job description summary
        - Required qualifications
        - Application URL
        - Posted date
        
        Save results to 'job_discoveries.json' with structured data.
        Remove duplicates and rank by relevance to keywords.
        """
        
        agent = await self.create_agent(task)
        return await agent.run()

# Usage
config = JobSearchConfig(
    keywords=["Software Engineer", "Full Stack Developer"],
    location="San Francisco",
    experience_level="Mid-level",
    remote_only=True,
    max_results=20
)

discovery_agent = JobDiscoveryAgent(config, llm)
jobs = await discovery_agent.search_jobs()
```

### 2. Application Submission Agent

**Purpose**: Automatically fills and submits job applications

```python
class ApplicationAgent(JobApplicationAgent):
    def __init__(self, config: JobSearchConfig, llm, applicant_profile: Dict):
        super().__init__(config, llm)
        self.profile = applicant_profile
    
    async def apply_to_jobs(self, job_list_file: str, max_applications: int = 5):
        task = f"""
        Read the job list from '{job_list_file}' and apply to up to {max_applications} positions.
        
        Applicant Profile:
        - Name: {self.profile.get('name')}
        - Email: {self.profile.get('email')}
        - Phone: {self.profile.get('phone')}
        - Location: {self.profile.get('location')}
        - Resume File: {self.profile.get('resume_path')}
        - LinkedIn: {self.profile.get('linkedin_url')}
        
        Application Process:
        1. Navigate to each job application URL
        2. Fill out all required fields using the profile information
        3. Upload resume when prompted (file: {self.profile.get('resume_path')})
        4. Write a customized cover letter for each position:
           - Address the hiring manager by name if possible
           - Mention specific company details and job requirements
           - Highlight relevant experience from the profile
           - Keep it concise (2-3 paragraphs)
        5. Review all information before submitting
        6. Submit the application
        7. Save confirmation details
        
        Error Handling:
        - Skip applications requiring manual verification
        - Handle CAPTCHAs by pausing for manual intervention
        - Log any errors or skipped applications
        - Continue with remaining applications if one fails
        
        Create a detailed log file 'applications_submitted.json' with:
        - Application timestamp
        - Company and position details
        - Application status (submitted/failed/skipped)
        - Confirmation numbers if available
        - Notes about the process
        """
        
        agent = await self.create_agent(task)
        return await agent.run()

# Usage
applicant_profile = {
    "name": "John Doe",
    "email": "john.doe@email.com",
    "phone": "+1-555-0123",
    "location": "San Francisco, CA",
    "resume_path": "./resume.pdf",
    "linkedin_url": "https://linkedin.com/in/johndoe"
}

app_agent = ApplicationAgent(config, llm, applicant_profile)
results = await app_agent.apply_to_jobs("job_discoveries.json", max_applications=10)
```

### 3. Follow-up Communication Agent

**Purpose**: Manages follow-up emails and communications

```python
class FollowUpAgent(JobApplicationAgent):
    async def send_follow_ups(self, days_since_application: int = 7):
        task = f"""
        Review 'applications_submitted.json' and identify applications submitted {days_since_application} days ago.
        
        For each application requiring follow-up:
        1. Research the company's hiring process timeline
        2. Find appropriate contact information:
           - HR department email
           - Hiring manager on LinkedIn
           - General careers email
        3. Compose a professional follow-up email:
           
        Email Template:
        Subject: Following up on [Position] application - [Your Name]
        
        Dear [Hiring Manager/Hiring Team],
        
        I hope this message finds you well. I wanted to follow up on my application 
        for the [Position Title] role that I submitted on [Date].
        
        I remain very enthusiastic about the opportunity to contribute to [Company Name] 
        and would welcome the chance to discuss how my [relevant skills/experience] 
        align with your team's needs.
        
        Please let me know if you need any additional information from me. I look 
        forward to hearing about the next steps in the process.
        
        Best regards,
        [Your Name]
        [Your Contact Information]
        
        4. Send the email through the company's contact system or LinkedIn
        5. Log all follow-up activities with timestamps
        6. Set reminders for second follow-up (if appropriate)
        
        Guidelines:
        - Only send one follow-up per application
        - Be professional and concise
        - Don't be pushy or demanding
        - Respect company communication preferences
        """
        
        agent = await self.create_agent(task)
        return await agent.run()

# Usage
followup_agent = FollowUpAgent(config, llm)
await followup_agent.send_follow_ups(days_since_application=7)
```

### 4. Application Tracking Agent

**Purpose**: Monitors application status and updates

```python
class TrackingAgent(JobApplicationAgent):
    async def update_application_status(self):
        task = f"""
        Review all submitted applications and update their status:
        
        1. Check email inbox for responses:
           - Rejection emails
           - Interview invitations
           - Requests for additional information
           - Automated confirmations
        
        2. Visit company career portals to check application status:
           - Login to applicant tracking systems
           - Check for status updates
           - Download any new communications
        
        3. Update the applications database with:
           - Current status (under review, interview scheduled, rejected, etc.)
           - Response date
           - Next action required
           - Interview details if applicable
        
        4. Generate a status report:
           - Total applications submitted
           - Response rate
           - Interview conversion rate
           - Companies still pending
           - Recommended next actions
        
        5. Create alerts for time-sensitive actions:
           - Interview preparation needed
           - Follow-up emails due
           - Application deadlines approaching
        
        Save updated data to 'application_status_report.json'
        """
        
        agent = await self.create_agent(task)
        return await agent.run()

# Usage
tracking_agent = TrackingAgent(config, llm)
status_report = await tracking_agent.update_application_status()
```

## Advanced Workflows

### Multi-Agent Job Campaign

```python
class JobCampaignOrchestrator:
    def __init__(self, config: JobSearchConfig, applicant_profile: Dict, llm):
        self.config = config
        self.profile = applicant_profile
        self.llm = llm
        
        # Initialize all agents
        self.discovery = JobDiscoveryAgent(config, llm)
        self.application = ApplicationAgent(config, llm, applicant_profile)
        self.followup = FollowUpAgent(config, llm)
        self.tracking = TrackingAgent(config, llm)
    
    async def run_campaign(self, campaign_duration_days: int = 30):
        """Run a complete job search campaign"""
        
        print("🚀 Starting Job Search Campaign")
        
        # Phase 1: Job Discovery
        print("📋 Phase 1: Discovering opportunities...")
        jobs = await self.discovery.search_jobs()
        
        # Phase 2: Application Submission
        print("📝 Phase 2: Submitting applications...")
        applications = await self.application.apply_to_jobs(
            "job_discoveries.json", 
            max_applications=10
        )
        
        # Phase 3: Daily monitoring (would run periodically)
        print("📊 Phase 3: Setting up monitoring...")
        await self.setup_monitoring_schedule()
        
        print("✅ Campaign setup complete!")
        
    async def setup_monitoring_schedule(self):
        """Set up periodic monitoring tasks"""
        monitoring_task = f"""
        Set up a monitoring schedule for ongoing job search activities:
        
        Daily Tasks:
        - Check for new email responses
        - Update application status in tracking system
        - Monitor for new job postings matching criteria
        
        Weekly Tasks:
        - Send follow-up emails for applications 7+ days old
        - Generate weekly progress report
        - Research new companies to target
        
        Bi-weekly Tasks:
        - Analyze response rates and adjust strategy
        - Update resume based on market feedback
        - Expand search criteria if needed
        
        Create a calendar/reminder system for these tasks.
        """
        
        agent = Agent(task=monitoring_task, llm=self.llm)
        return await agent.run()

# Usage
orchestrator = JobCampaignOrchestrator(config, applicant_profile, llm)
await orchestrator.run_campaign(campaign_duration_days=30)
```

## Claude Code Integration

### Running with Claude Code CLI

Create a `job_search.py` script that can be executed with Claude Code:

```python
#!/usr/bin/env python3
"""
Job Search Automation Script for Claude Code
Usage: python job_search.py --action [search|apply|followup|track]
"""

import argparse
import asyncio
import json
from datetime import datetime
from pathlib import Path

# Import your agents here
from agents.job_discovery import JobDiscoveryAgent
from agents.application import ApplicationAgent
from agents.followup import FollowUpAgent
from agents.tracking import TrackingAgent

async def main():
    parser = argparse.ArgumentParser(description='Job Search Automation')
    parser.add_argument('--action', choices=['search', 'apply', 'followup', 'track'], 
                       required=True, help='Action to perform')
    parser.add_argument('--config', default='job_config.json', 
                       help='Configuration file path')
    parser.add_argument('--profile', default='profile.json', 
                       help='Applicant profile file path')
    
    args = parser.parse_args()
    
    # Load configuration
    with open(args.config, 'r') as f:
        config_data = json.load(f)
    
    with open(args.profile, 'r') as f:
        profile_data = json.load(f)
    
    config = JobSearchConfig(**config_data)
    
    # Initialize LLM
    from langchain_anthropic import ChatAnthropic
    llm = ChatAnthropic(model="claude-3-5-sonnet-20241022")
    
    # Execute action
    if args.action == 'search':
        agent = JobDiscoveryAgent(config, llm)
        result = await agent.search_jobs()
        print(f"✅ Job search completed. Found opportunities saved to job_discoveries.json")
        
    elif args.action == 'apply':
        agent = ApplicationAgent(config, llm, profile_data)
        result = await agent.apply_to_jobs("job_discoveries.json")
        print(f"✅ Applications submitted. Check applications_submitted.json for details")
        
    elif args.action == 'followup':
        agent = FollowUpAgent(config, llm)
        result = await agent.send_follow_ups()
        print(f"✅ Follow-up emails sent")
        
    elif args.action == 'track':
        agent = TrackingAgent(config, llm)
        result = await agent.update_application_status()
        print(f"✅ Application status updated")

if __name__ == "__main__":
    asyncio.run(main())
```

### Configuration Files

**job_config.json**:
```json
{
    "keywords": ["Software Engineer", "Full Stack Developer", "Python Developer"],
    "location": "San Francisco",
    "experience_level": "Mid-level",
    "salary_range": "$120k-$180k",
    "remote_only": true,
    "max_results": 15
}
```

**profile.json**:
```json
{
    "name": "John Doe",
    "email": "john.doe@email.com",
    "phone": "+1-555-0123",
    "location": "San Francisco, CA",
    "resume_path": "./resume.pdf",
    "linkedin_url": "https://linkedin.com/in/johndoe",
    "github_url": "https://github.com/johndoe",
    "portfolio_url": "https://johndoe.dev",
    "summary": "Experienced software engineer with 5+ years in full-stack development"
}
```

### Claude Code Commands

```bash
# Search for jobs
python job_search.py --action search

# Apply to discovered jobs
python job_search.py --action apply

# Send follow-up emails
python job_search.py --action followup

# Update application tracking
python job_search.py --action track

# Use custom config files
python job_search.py --action search --config custom_config.json --profile my_profile.json
```

## Best Practices

### 1. Ethical Automation
- Always provide truthful information
- Respect website rate limits and terms of service
- Don't spam employers with excessive applications
- Maintain quality over quantity

### 2. Data Management
- Keep all personal data secure and encrypted
- Regularly backup application logs and responses
- Use version control for configuration changes
- Implement proper error logging

### 3. Customization
- Tailor cover letters for each application
- Research companies before applying
- Adjust search criteria based on market response
- A/B test different application approaches

### 4. Monitoring and Optimization
- Track response rates and conversion metrics
- Adjust automation based on feedback
- Keep human oversight for important decisions
- Regular review of automated communications

### 5. Integration with Existing Workflow
- Connect with your ATS or CRM system
- Set up Slack/email notifications for important updates
- Integrate with calendar for interview scheduling
- Use webhooks for real-time status updates

## Troubleshooting

### Common Issues

**Browser Automation Fails**:
```python
# Add retry logic and better error handling
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
async def robust_agent_run(agent):
    try:
        return await agent.run()
    except Exception as e:
        print(f"Agent execution failed: {e}")
        raise
```

**Authentication Issues**:
```python
# Handle login requirements
async def handle_login(self, site_name: str):
    task = f"""
    Login to {site_name} using stored credentials:
    1. Navigate to login page
    2. Enter username and password
    3. Handle 2FA if required (pause for manual intervention)
    4. Verify successful login
    5. Save session for future use
    """
    agent = await self.create_agent(task)
    return await agent.run()
```

**Rate Limiting**:
```python
import asyncio
import random

async def respectful_delay():
    """Add random delays to appear more human-like"""
    delay = random.uniform(2, 8)  # 2-8 second delay
    await asyncio.sleep(delay)
```

### Debugging Tips

1. **Use headless=False** during development to watch the automation
2. **Enable detailed logging** for all agent activities
3. **Start with small batches** before scaling up
4. **Test with known websites** before trying new platforms
5. **Keep manual oversight** for critical steps

## Examples

### Example 1: Tech Startup Job Search
```python
startup_config = JobSearchConfig(
    keywords=["Frontend Engineer", "React Developer", "JavaScript"],
    location="Remote",
    experience_level="Senior",
    max_results=25
)

# Focus on startup job boards
async def startup_job_search():
    task = """
    Search for frontend engineering roles specifically at tech startups:
    
    Platforms to focus on:
    - AngelList (angel.co)
    - Y Combinator job board
    - Startup job boards
    - BuiltIn locations
    - Company websites for YC companies
    
    Priority criteria:
    - Companies with recent funding
    - Teams smaller than 100 people
    - Equity compensation mentioned
    - Modern tech stack (React, TypeScript, etc.)
    """
    
    agent = Agent(task=task, llm=llm)
    return await agent.run()
```

### Example 2: Enterprise Job Focus
```python
enterprise_config = JobSearchConfig(
    keywords=["Senior Software Engineer", "Principal Engineer"],
    location="Seattle",
    experience_level="Senior",
    salary_range="$180k-$250k"
)

# Target large tech companies
async def enterprise_job_search():
    task = """
    Search for senior engineering roles at major tech companies:
    
    Target companies:
    - FAANG (Facebook/Meta, Apple, Amazon, Netflix, Google)
    - Microsoft, Adobe, Salesforce
    - Established unicorns (Uber, Airbnb, etc.)
    
    Focus on:
    - Senior/Principal level positions
    - Technical leadership roles
    - Strong compensation packages
    - Clear career advancement paths
    """
    
    agent = Agent(task=task, llm=llm)
    return await agent.run()
```

### Example 3: Remote-First Campaign
```python
async def remote_first_campaign():
    """Complete campaign focused on remote opportunities"""
    
    config = JobSearchConfig(
        keywords=["Full Stack Developer", "Software Engineer"],
        location="Remote",
        remote_only=True,
        max_results=30
    )
    
    # Multi-step process
    orchestrator = JobCampaignOrchestrator(config, profile, llm)
    
    # Custom remote-focused search
    discovery_task = """
    Find remote software engineering opportunities with these priorities:
    1. Companies with strong remote culture (remote-first, distributed teams)
    2. Async communication practices
    3. Flexible time zones
    4. Good remote onboarding process
    5. Remote-friendly benefits (home office stipend, etc.)
    
    Research company remote policies and culture before adding to results.
    """
    
    agent = Agent(task=discovery_task, llm=llm)
    await agent.run()
    
    # Continue with standard campaign
    await orchestrator.run_campaign()
```

---

## Contributing

To extend this agents library:

1. **Add new agent types** in separate modules
2. **Follow the base agent pattern** for consistency
3. **Include comprehensive error handling**
4. **Add configuration options** for flexibility
5. **Document all public methods** with examples
6. **Test with different job sites** and scenarios

## License

This agents library is designed for educational and personal use. Always comply with website terms of service and applicable laws when using automation tools.

---

*Last updated: January 2025*
*Compatible with: Browser Use 0.2.6+, Claude 3.5 Sonnet*