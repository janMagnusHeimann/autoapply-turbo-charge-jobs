"""
Web Scraper Client - Direct web scraping for job listings
"""

import asyncio
import aiohttp
from bs4 import BeautifulSoup
from typing import List, Dict, Any, Optional
import logging
import re
from urllib.parse import urljoin, urlparse

logger = logging.getLogger(__name__)

class WebScraperClient:
    """Direct web scraping client for finding real job listings"""

    def __init__(self):
        self.session = None
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }

    async def __aenter__(self):
        self.session = aiohttp.ClientSession(headers=self.headers)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def find_job_listings(self, company_name: str, careers_url: str, user_skills: List[str] = None) -> List[Dict[str, Any]]:
        """Scrape job listings directly from company careers page"""
        try:
            # First, try to get the page content
            async with aiohttp.ClientSession(headers=self.headers) as session:
                async with session.get(careers_url, timeout=10) as response:
                    if response.status != 200:
                        logger.warning(f"Failed to fetch {careers_url}: Status {response.status}")
                        return []

                    content = await response.text()

            # Parse with BeautifulSoup
            soup = BeautifulSoup(content, 'html.parser')
            jobs = []

            # Try different strategies based on the URL
            if 'lever.co' in careers_url:
                jobs = await self._parse_lever_jobs(soup, careers_url, company_name)
            elif 'greenhouse.io' in careers_url:
                jobs = await self._parse_greenhouse_jobs(soup, careers_url, company_name)
            elif 'workday.com' in careers_url or 'myworkdayjobs.com' in careers_url:
                jobs = await self._parse_workday_jobs(soup, careers_url, company_name)
            else:
                # Generic parsing for company sites
                jobs = await self._parse_generic_jobs(soup, careers_url, company_name)

            # Filter by skills if provided
            if user_skills and jobs:
                jobs = self._filter_by_skills(jobs, user_skills)

            logger.info(f"Found {len(jobs)} real job listings for {company_name}")
            return jobs[:20]  # Return max 20 jobs

        except Exception as e:
            logger.error(f"Error scraping {careers_url}: {e}")
            return []

    async def _parse_lever_jobs(self, soup: BeautifulSoup, base_url: str, company_name: str) -> List[Dict[str, Any]]:
        """Parse Lever job board format"""
        jobs = []

        # Lever uses postings-group class for job listings
        job_elements = soup.find_all('div', class_='posting')
        if not job_elements:
            # Try alternative selectors
            job_elements = soup.find_all('a', class_='posting-title')

        for element in job_elements[:20]:  # Limit to 20 jobs
            try:
                # Extract job details
                if element.name == 'div':
                    link_elem = element.find('a', class_='posting-title')
                    if not link_elem:
                        continue
                else:
                    link_elem = element

                job_url = link_elem.get('href', '')
                if not job_url:
                    continue

                # Make URL absolute
                if not job_url.startswith('http'):
                    job_url = urljoin(base_url, job_url)

                # Verify it's a real job URL (not a placeholder)
                if self._is_valid_job_url(job_url):
                    title = link_elem.text.strip()

                    # Try to find location
                    location_elem = element.find('span', class_='location') or element.find('div', class_='location')
                    location = location_elem.text.strip() if location_elem else "Not specified"

                    # Try to find department
                    dept_elem = element.find('span', class_='department') or element.find('div', class_='department')
                    department = dept_elem.text.strip() if dept_elem else None

                    jobs.append({
                        'title': title,
                        'url': job_url,
                        'location': location,
                        'department': department,
                        'company': company_name,
                        'source': 'Direct Scraping - Lever'
                    })

            except Exception as e:
                logger.debug(f"Error parsing individual Lever job: {e}")
                continue

        return jobs

    async def _parse_greenhouse_jobs(self, soup: BeautifulSoup, base_url: str, company_name: str) -> List[Dict[str, Any]]:
        """Parse Greenhouse job board format"""
        jobs = []

        # Greenhouse uses opening class
        job_elements = soup.find_all('div', class_='opening')
        if not job_elements:
            # Try alternative selectors
            job_elements = soup.find_all('a', href=re.compile(r'/jobs/\d+'))

        for element in job_elements[:20]:
            try:
                if element.name == 'div':
                    link_elem = element.find('a')
                    if not link_elem:
                        continue
                else:
                    link_elem = element

                job_url = link_elem.get('href', '')
                if not job_url:
                    continue

                if not job_url.startswith('http'):
                    job_url = urljoin(base_url, job_url)

                if self._is_valid_job_url(job_url):
                    title = link_elem.text.strip()
                    location = element.find('span', class_='location')
                    location = location.text.strip() if location else "Not specified"

                    jobs.append({
                        'title': title,
                        'url': job_url,
                        'location': location,
                        'company': company_name,
                        'source': 'Direct Scraping - Greenhouse'
                    })

            except Exception as e:
                logger.debug(f"Error parsing individual Greenhouse job: {e}")
                continue

        return jobs

    async def _parse_workday_jobs(self, soup: BeautifulSoup, base_url: str, company_name: str) -> List[Dict[str, Any]]:
        """Parse Workday job board format"""
        jobs = []

        # Workday is tricky as it uses React/dynamic content
        # Look for job listing patterns in the HTML
        job_elements = soup.find_all('li', {'data-automation-id': 'jobItem'})
        if not job_elements:
            # Try alternative patterns
            job_elements = soup.find_all('a', href=re.compile(r'/job/'))

        for element in job_elements[:20]:
            try:
                link_elem = element if element.name == 'a' else element.find('a')
                if not link_elem:
                    continue

                job_url = link_elem.get('href', '')
                if not job_url:
                    continue

                if not job_url.startswith('http'):
                    job_url = urljoin(base_url, job_url)

                if self._is_valid_job_url(job_url):
                    title = link_elem.text.strip() or element.get_text(strip=True)

                    jobs.append({
                        'title': title,
                        'url': job_url,
                        'location': "Check job page",
                        'company': company_name,
                        'source': 'Direct Scraping - Workday'
                    })

            except Exception as e:
                logger.debug(f"Error parsing individual Workday job: {e}")
                continue

        return jobs

    async def _parse_generic_jobs(self, soup: BeautifulSoup, base_url: str, company_name: str) -> List[Dict[str, Any]]:
        """Generic job parsing for unknown formats"""
        jobs = []

        # Look for common patterns in job listings
        # Try to find links with job-related keywords
        job_links = []

        # Common patterns
        patterns = [
            r'/careers/',
            r'/jobs/',
            r'/job/',
            r'/position/',
            r'/opening/',
            r'/vacancy/',
            r'/opportunity/'
        ]

        for pattern in patterns:
            links = soup.find_all('a', href=re.compile(pattern, re.I))
            job_links.extend(links)

        # Also look for common job title keywords
        keywords = ['engineer', 'developer', 'manager', 'analyst', 'designer', 'specialist']
        for keyword in keywords:
            links = soup.find_all('a', text=re.compile(keyword, re.I))
            job_links.extend(links)

        # Deduplicate and process
        seen_urls = set()
        for link in job_links[:30]:  # Process max 30 links
            try:
                job_url = link.get('href', '')
                if not job_url or job_url in seen_urls:
                    continue

                if not job_url.startswith('http'):
                    job_url = urljoin(base_url, job_url)

                # Skip if it's the main careers page
                if job_url.rstrip('/') == base_url.rstrip('/'):
                    continue

                if self._is_valid_job_url(job_url) and job_url not in seen_urls:
                    seen_urls.add(job_url)
                    title = link.get_text(strip=True)

                    # Skip if title is too generic
                    if len(title) < 5 or title.lower() in ['careers', 'jobs', 'opportunities', 'view all']:
                        continue

                    jobs.append({
                        'title': title,
                        'url': job_url,
                        'location': "See job details",
                        'company': company_name,
                        'source': 'Direct Scraping - Generic'
                    })

            except Exception as e:
                logger.debug(f"Error parsing generic job link: {e}")
                continue

        return jobs[:20]  # Return max 20 jobs

    def _is_valid_job_url(self, url: str) -> bool:
        """Check if URL looks like a real job posting"""
        if not url or len(url) < 10:
            return False

        # Check for suspicious patterns
        suspicious = [
            'abc123', 'def456', 'test', 'demo', 'sample',
            'placeholder', 'example.com', '#', 'javascript:'
        ]

        url_lower = url.lower()
        for pattern in suspicious:
            if pattern in url_lower:
                return False

        # Check if it has a valid structure
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            return False

        return True

    def _filter_by_skills(self, jobs: List[Dict[str, Any]], skills: List[str]) -> List[Dict[str, Any]]:
        """Filter jobs by matching skills in title"""
        if not skills:
            return jobs

        filtered = []
        skill_patterns = [skill.lower() for skill in skills[:10]]  # Use first 10 skills

        for job in jobs:
            title_lower = job.get('title', '').lower()
            # Check if any skill matches the title
            if any(skill in title_lower for skill in skill_patterns):
                filtered.append(job)

        # If too few matches, return all jobs
        if len(filtered) < 3:
            return jobs

        return filtered