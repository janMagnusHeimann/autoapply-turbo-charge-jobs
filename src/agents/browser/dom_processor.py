"""
DOM processing utilities for extracting structured information from web pages.
Specialized for job-related content extraction and analysis.
"""

import re
import json
from typing import Any, Dict, List, Optional, Set, Tuple, Union
from dataclasses import dataclass, field
from datetime import datetime
from urllib.parse import urljoin, urlparse
import logging

logger = logging.getLogger(__name__)


@dataclass
class ExtractedJob:
    """Represents a job extracted from a web page."""
    title: str
    company: str
    location: Optional[str] = None
    job_type: Optional[str] = None  # remote, hybrid, onsite
    experience_level: Optional[str] = None
    salary_range: Optional[str] = None
    description: Optional[str] = None
    skills: List[str] = field(default_factory=list)
    application_url: Optional[str] = None
    posted_date: Optional[str] = None
    department: Optional[str] = None
    confidence_score: float = 0.0
    raw_data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PageAnalysis:
    """Analysis results for a web page."""
    is_career_page: bool
    is_job_listing: bool
    confidence_score: float
    job_count: int
    navigation_hints: List[Dict[str, str]]
    content_structure: Dict[str, Any]
    extraction_strategy: str
    indicators: List[str]


class DOMProcessor:
    """
    Processes DOM content to extract structured job information.
    Uses multiple strategies for different page types and structures.
    """
    
    def __init__(self):
        # Common job-related keywords and patterns
        self.job_keywords = {
            'titles': [
                'software engineer', 'developer', 'programmer', 'architect',
                'manager', 'lead', 'senior', 'junior', 'intern',
                'designer', 'analyst', 'consultant', 'specialist',
                'product manager', 'data scientist', 'devops'
            ],
            'locations': [
                'remote', 'hybrid', 'onsite', 'office', 'work from home',
                'san francisco', 'new york', 'london', 'berlin', 'toronto'
            ],
            'types': [
                'full-time', 'part-time', 'contract', 'freelance',
                'temporary', 'permanent', 'internship'
            ],
            'experience': [
                'entry level', 'junior', 'mid-level', 'senior', 'lead', 'principal',
                '0-2 years', '2-5 years', '5+ years', 'experienced'
            ]
        }
        
        # Common selectors for job content
        self.job_selectors = {
            'containers': [
                '[class*="job"]', '[class*="position"]', '[class*="opening"]',
                '[class*="career"]', '[id*="job"]', '[data-job]',
                '.job-listing', '.position-listing', '.career-opportunity'
            ],
            'titles': [
                'h1', 'h2', 'h3', '[class*="title"]', '[class*="position"]',
                '.job-title', '.position-title', '.role-title'
            ],
            'details': [
                '[class*="detail"]', '[class*="meta"]', '[class*="info"]',
                '.job-details', '.position-details', '.job-meta'
            ],
            'descriptions': [
                '[class*="description"]', '[class*="summary"]', '[class*="content"]',
                '.job-description', '.position-description', '.job-summary'
            ]
        }
    
    def analyze_page(self, dom_content: Dict[str, Any], page_url: str) -> PageAnalysis:
        """
        Analyze a page to determine its type and extraction strategy.
        
        Args:
            dom_content: Structured DOM content from browser
            page_url: URL of the page being analyzed
            
        Returns:
            PageAnalysis with recommendations
        """
        indicators = []
        confidence = 0.0
        
        # Check URL patterns
        url_lower = page_url.lower()
        if any(keyword in url_lower for keyword in ['career', 'job', 'position', 'hiring']):
            indicators.append("Career-related URL")
            confidence += 0.3
        
        # Analyze page title
        title = dom_content.get('title', '').lower()
        if any(keyword in title for keyword in ['career', 'job', 'position', 'hiring', 'team']):
            indicators.append("Career-related title")
            confidence += 0.2
        
        # Check for job-related links
        links = dom_content.get('links', [])
        career_links = [
            link for link in links
            if any(keyword in link.get('text', '').lower() for keyword in ['career', 'job', 'position'])
        ]
        if career_links:
            indicators.append(f"Found {len(career_links)} career links")
            confidence += 0.2
        
        # Check for job indicators in content
        job_indicators = dom_content.get('jobIndicators', [])
        if job_indicators:
            indicators.append(f"Found {len(job_indicators)} job-related elements")
            confidence += 0.3
        
        # Analyze headings for job content
        headings = dom_content.get('headings', [])
        job_headings = [
            h for h in headings
            if any(keyword in h.get('text', '').lower() for keyword in self.job_keywords['titles'])
        ]
        if job_headings:
            indicators.append(f"Found {len(job_headings)} job-related headings")
            confidence += 0.2
        
        # Determine page type and strategy
        is_career_page = confidence > 0.4
        is_job_listing = len(job_indicators) > 0 or len(job_headings) > 3
        
        # Determine extraction strategy
        strategy = self._determine_extraction_strategy(dom_content, is_career_page, is_job_listing)
        
        # Get navigation hints
        navigation_hints = self._extract_navigation_hints(dom_content)
        
        return PageAnalysis(
            is_career_page=is_career_page,
            is_job_listing=is_job_listing,
            confidence_score=min(1.0, confidence),
            job_count=len(job_indicators),
            navigation_hints=navigation_hints,
            content_structure=self._analyze_content_structure(dom_content),
            extraction_strategy=strategy,
            indicators=indicators
        )
    
    def extract_jobs(
        self,
        page_content: Dict[str, Any],
        dom_content: Dict[str, Any],
        page_url: str,
        company_name: Optional[str] = None
    ) -> List[ExtractedJob]:
        """
        Extract job listings from page content using multiple strategies.
        
        Args:
            page_content: Full page content (text, HTML)
            dom_content: Structured DOM content
            page_url: URL of the page
            company_name: Known company name
            
        Returns:
            List of extracted jobs
        """
        extracted_jobs = []
        
        # Strategy 1: JSON-LD structured data
        json_jobs = self._extract_from_json_ld(page_content.get('html', ''))
        if json_jobs:
            extracted_jobs.extend(json_jobs)
            logger.info(f"Extracted {len(json_jobs)} jobs from JSON-LD")
        
        # Strategy 2: DOM structure analysis
        dom_jobs = self._extract_from_dom_structure(dom_content, page_url, company_name)
        if dom_jobs:
            extracted_jobs.extend(dom_jobs)
            logger.info(f"Extracted {len(dom_jobs)} jobs from DOM structure")
        
        # Strategy 3: Text pattern matching
        if not extracted_jobs:
            text_jobs = self._extract_from_text_patterns(page_content.get('text', ''), page_url, company_name)
            if text_jobs:
                extracted_jobs.extend(text_jobs)
                logger.info(f"Extracted {len(text_jobs)} jobs from text patterns")
        
        # Strategy 4: Heuristic extraction
        if not extracted_jobs:
            heuristic_jobs = self._extract_using_heuristics(page_content, dom_content, page_url, company_name)
            if heuristic_jobs:
                extracted_jobs.extend(heuristic_jobs)
                logger.info(f"Extracted {len(heuristic_jobs)} jobs using heuristics")
        
        # Clean and deduplicate
        cleaned_jobs = self._clean_and_deduplicate(extracted_jobs, company_name)
        
        logger.info(f"Final job count: {len(cleaned_jobs)}")
        return cleaned_jobs
    
    def extract_career_page_links(self, dom_content: Dict[str, Any], base_url: str) -> List[Dict[str, str]]:
        """Extract potential career page links from navigation."""
        career_links = []
        
        # Check all links for career-related content
        links = dom_content.get('links', [])
        
        for link in links:
            text = link.get('text', '').lower().strip()
            href = link.get('href', '')
            
            if not text or not href:
                continue
            
            # Score the link based on career relevance
            relevance_score = 0
            
            career_keywords = ['career', 'job', 'position', 'hiring', 'join', 'team', 'work', 'opportunity']
            for keyword in career_keywords:
                if keyword in text:
                    relevance_score += 1
                if keyword in href.lower():
                    relevance_score += 0.5
            
            if relevance_score > 0.5:
                full_url = urljoin(base_url, href)
                career_links.append({
                    'text': text,
                    'url': full_url,
                    'relevance_score': relevance_score
                })
        
        # Sort by relevance
        career_links.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        return career_links[:10]  # Return top 10 most relevant
    
    def _extract_from_json_ld(self, html_content: str) -> List[ExtractedJob]:
        """Extract jobs from JSON-LD structured data."""
        jobs = []
        
        # Find JSON-LD scripts
        json_ld_pattern = r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>'
        matches = re.findall(json_ld_pattern, html_content, re.DOTALL | re.IGNORECASE)
        
        for match in matches:
            try:
                data = json.loads(match.strip())
                
                # Handle array of objects
                if isinstance(data, list):
                    for item in data:
                        job = self._parse_json_ld_job(item)
                        if job:
                            jobs.append(job)
                else:
                    job = self._parse_json_ld_job(data)
                    if job:
                        jobs.append(job)
                        
            except json.JSONDecodeError:
                continue
        
        return jobs
    
    def _parse_json_ld_job(self, data: Dict[str, Any]) -> Optional[ExtractedJob]:
        """Parse a single JSON-LD job posting."""
        if data.get('@type') != 'JobPosting':
            return None
        
        try:
            # Extract basic information
            title = data.get('title', '')
            company = ''
            
            # Handle company information
            hiring_org = data.get('hiringOrganization', {})
            if isinstance(hiring_org, dict):
                company = hiring_org.get('name', '')
            
            # Extract location
            location = ''
            job_location = data.get('jobLocation', {})
            if isinstance(job_location, dict):
                address = job_location.get('address', {})
                if isinstance(address, dict):
                    location = f"{address.get('addressLocality', '')}, {address.get('addressRegion', '')}"
                    location = location.strip(', ')
            
            # Extract other details
            employment_type = data.get('employmentType', '')
            experience_requirements = data.get('experienceRequirements', '')
            salary = data.get('baseSalary', {})
            description = data.get('description', '')
            
            # Handle salary
            salary_range = ''
            if isinstance(salary, dict):
                value = salary.get('value', {})
                if isinstance(value, dict):
                    min_val = value.get('minValue')
                    max_val = value.get('maxValue')
                    if min_val and max_val:
                        salary_range = f"${min_val:,} - ${max_val:,}"
            
            return ExtractedJob(
                title=title,
                company=company,
                location=location,
                job_type=employment_type,
                experience_level=experience_requirements,
                salary_range=salary_range,
                description=description,
                confidence_score=0.9,
                raw_data=data
            )
            
        except Exception as e:
            logger.error(f"Error parsing JSON-LD job: {e}")
            return None
    
    def _extract_from_dom_structure(
        self,
        dom_content: Dict[str, Any],
        page_url: str,
        company_name: Optional[str]
    ) -> List[ExtractedJob]:
        """Extract jobs from DOM structure analysis."""
        jobs = []
        
        # Look for structured job containers
        job_indicators = dom_content.get('jobIndicators', [])
        
        for indicator in job_indicators:
            job = self._parse_dom_job_element(indicator, page_url, company_name)
            if job:
                jobs.append(job)
        
        return jobs
    
    def _parse_dom_job_element(
        self,
        element: Dict[str, Any],
        page_url: str,
        company_name: Optional[str]
    ) -> Optional[ExtractedJob]:
        """Parse a single DOM element as a job."""
        try:
            text = element.get('text', '').strip()
            if not text:
                return None
            
            # Extract title (usually the first line or largest text)
            lines = [line.strip() for line in text.split('\n') if line.strip()]
            title = lines[0] if lines else ''
            
            # Try to extract location, job type, etc. from text
            location = self._extract_location_from_text(text)
            job_type = self._extract_job_type_from_text(text)
            experience_level = self._extract_experience_from_text(text)
            
            # Extract application URL
            application_url = element.get('href') or page_url
            
            return ExtractedJob(
                title=title,
                company=company_name or '',
                location=location,
                job_type=job_type,
                experience_level=experience_level,
                application_url=application_url,
                description=text,
                confidence_score=0.6,
                raw_data=element
            )
            
        except Exception as e:
            logger.error(f"Error parsing DOM job element: {e}")
            return None
    
    def _extract_from_text_patterns(
        self,
        text_content: str,
        page_url: str,
        company_name: Optional[str]
    ) -> List[ExtractedJob]:
        """Extract jobs using text pattern matching."""
        jobs = []
        
        # Split content into potential job sections
        sections = self._split_into_job_sections(text_content)
        
        for section in sections:
            job = self._parse_text_section_as_job(section, page_url, company_name)
            if job:
                jobs.append(job)
        
        return jobs
    
    def _extract_using_heuristics(
        self,
        page_content: Dict[str, Any],
        dom_content: Dict[str, Any],
        page_url: str,
        company_name: Optional[str]
    ) -> List[ExtractedJob]:
        """Extract jobs using heuristic approaches."""
        jobs = []
        
        # Look for patterns in headings that might be job titles
        headings = dom_content.get('headings', [])
        
        for heading in headings:
            text = heading.get('text', '').strip()
            
            # Check if heading looks like a job title
            if self._is_likely_job_title(text):
                job = ExtractedJob(
                    title=text,
                    company=company_name or '',
                    application_url=page_url,
                    confidence_score=0.4,
                    raw_data=heading
                )
                jobs.append(job)
        
        return jobs
    
    def _determine_extraction_strategy(
        self,
        dom_content: Dict[str, Any],
        is_career_page: bool,
        is_job_listing: bool
    ) -> str:
        """Determine the best extraction strategy for the page."""
        if is_job_listing:
            return "structured_extraction"
        elif is_career_page:
            return "career_page_navigation"
        else:
            return "exploratory_search"
    
    def _extract_navigation_hints(self, dom_content: Dict[str, Any]) -> List[Dict[str, str]]:
        """Extract navigation hints for finding more jobs."""
        hints = []
        
        # Look for pagination
        navigation = dom_content.get('navigation', [])
        for nav_item in navigation:
            text = nav_item.get('text', '').lower()
            if any(keyword in text for keyword in ['next', 'more', 'page', 'load more']):
                hints.append({
                    'type': 'pagination',
                    'text': nav_item.get('text', ''),
                    'action': 'click'
                })
        
        # Look for filters or categories
        links = dom_content.get('links', [])
        for link in links:
            text = link.get('text', '').lower()
            if any(keyword in text for keyword in ['department', 'team', 'location', 'type']):
                hints.append({
                    'type': 'filter',
                    'text': link.get('text', ''),
                    'href': link.get('href', ''),
                    'action': 'navigate'
                })
        
        return hints
    
    def _analyze_content_structure(self, dom_content: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze the content structure of the page."""
        return {
            'total_links': len(dom_content.get('links', [])),
            'total_headings': len(dom_content.get('headings', [])),
            'total_forms': len(dom_content.get('forms', [])),
            'job_indicators': len(dom_content.get('jobIndicators', [])),
            'has_navigation': len(dom_content.get('navigation', [])) > 0
        }
    
    def _split_into_job_sections(self, text: str) -> List[str]:
        """Split text content into potential job sections."""
        # Look for common job listing separators
        separators = [
            r'\n\s*\n',  # Empty lines
            r'(?=^[A-Z][^a-z]*$)',  # All caps lines (likely titles)
            r'(?=^\d+\.)',  # Numbered lists
            r'(?=^[-•])',  # Bullet points
        ]
        
        sections = [text]  # Start with full text
        
        for separator in separators:
            new_sections = []
            for section in sections:
                parts = re.split(separator, section, flags=re.MULTILINE)
                new_sections.extend([part.strip() for part in parts if part.strip()])
            sections = new_sections
        
        # Filter out sections that are too short or too long
        filtered_sections = []
        for section in sections:
            if 20 <= len(section) <= 2000:  # Reasonable job description length
                filtered_sections.append(section)
        
        return filtered_sections
    
    def _parse_text_section_as_job(
        self,
        section: str,
        page_url: str,
        company_name: Optional[str]
    ) -> Optional[ExtractedJob]:
        """Parse a text section as a potential job."""
        lines = [line.strip() for line in section.split('\n') if line.strip()]
        
        if not lines:
            return None
        
        # First line is likely the title
        title = lines[0]
        
        # Check if it looks like a job title
        if not self._is_likely_job_title(title):
            return None
        
        # Extract details from the rest of the text
        location = self._extract_location_from_text(section)
        job_type = self._extract_job_type_from_text(section)
        experience_level = self._extract_experience_from_text(section)
        skills = self._extract_skills_from_text(section)
        
        return ExtractedJob(
            title=title,
            company=company_name or '',
            location=location,
            job_type=job_type,
            experience_level=experience_level,
            skills=skills,
            description=section,
            application_url=page_url,
            confidence_score=0.5,
            raw_data={'text_section': section}
        )
    
    def _is_likely_job_title(self, text: str) -> bool:
        """Determine if text is likely a job title."""
        text_lower = text.lower()
        
        # Check for job title keywords
        title_keywords = self.job_keywords['titles']
        has_title_keyword = any(keyword in text_lower for keyword in title_keywords)
        
        # Check structure (reasonable length, not too many special chars)
        reasonable_length = 10 <= len(text) <= 100
        not_too_many_special = len(re.findall(r'[^a-zA-Z0-9\s\-/]', text)) < len(text) * 0.3
        
        return has_title_keyword and reasonable_length and not_too_many_special
    
    def _extract_location_from_text(self, text: str) -> Optional[str]:
        """Extract location from text."""
        text_lower = text.lower()
        
        # Look for location patterns
        location_patterns = [
            r'location[:\s]+([^\n]+)',
            r'based in[:\s]+([^\n]+)',
            r'office[:\s]+([^\n]+)',
            r'(remote|hybrid|onsite)',
            r'([A-Z][a-z]+,\s*[A-Z]{2})',  # City, State
            r'([A-Z][a-z]+,\s*[A-Z][a-z]+)',  # City, Country
        ]
        
        for pattern in location_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                return matches[0].strip()
        
        # Check for location keywords
        for keyword in self.job_keywords['locations']:
            if keyword in text_lower:
                return keyword
        
        return None
    
    def _extract_job_type_from_text(self, text: str) -> Optional[str]:
        """Extract job type from text."""
        text_lower = text.lower()
        
        for job_type in self.job_keywords['types']:
            if job_type in text_lower:
                return job_type
        
        return None
    
    def _extract_experience_from_text(self, text: str) -> Optional[str]:
        """Extract experience level from text."""
        text_lower = text.lower()
        
        for experience in self.job_keywords['experience']:
            if experience in text_lower:
                return experience
        
        return None
    
    def _extract_skills_from_text(self, text: str) -> List[str]:
        """Extract skills from text."""
        # Common tech skills
        tech_skills = [
            'python', 'javascript', 'java', 'react', 'node.js', 'sql',
            'aws', 'docker', 'kubernetes', 'git', 'linux', 'html', 'css',
            'typescript', 'go', 'rust', 'c++', 'c#', 'ruby', 'php'
        ]
        
        found_skills = []
        text_lower = text.lower()
        
        for skill in tech_skills:
            if skill in text_lower:
                found_skills.append(skill)
        
        return found_skills
    
    def _clean_and_deduplicate(
        self,
        jobs: List[ExtractedJob],
        company_name: Optional[str]
    ) -> List[ExtractedJob]:
        """Clean and deduplicate extracted jobs."""
        if not jobs:
            return []
        
        # Remove duplicates based on title similarity
        unique_jobs = []
        seen_titles = set()
        
        for job in jobs:
            # Normalize title for comparison
            normalized_title = re.sub(r'[^\w\s]', '', job.title.lower()).strip()
            
            if normalized_title not in seen_titles:
                # Set company name if not already set
                if not job.company and company_name:
                    job.company = company_name
                
                # Clean up fields
                job.title = job.title.strip()
                if job.location:
                    job.location = job.location.strip()
                if job.description:
                    job.description = job.description.strip()
                
                unique_jobs.append(job)
                seen_titles.add(normalized_title)
        
        # Sort by confidence score
        unique_jobs.sort(key=lambda x: x.confidence_score, reverse=True)
        
        return unique_jobs