"""
Text processing utilities.
"""

import re
from typing import List, Set
from collections import Counter


def extract_keywords(text: str, min_length: int = 3, max_keywords: int = 20) -> List[str]:
    """
    Extract keywords from text.
    
    Args:
        text: Input text
        min_length: Minimum keyword length
        max_keywords: Maximum number of keywords to return
    
    Returns:
        List[str]: List of keywords
    """
    # Common stop words
    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
        'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
        'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    }
    
    # Extract words
    words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
    
    # Filter words
    keywords = [word for word in words if len(word) >= min_length and word not in stop_words]
    
    # Count frequency and return most common
    word_counts = Counter(keywords)
    return [word for word, _ in word_counts.most_common(max_keywords)]


def clean_text(text: str) -> str:
    """
    Clean text by removing extra whitespace and special characters.
    
    Args:
        text: Input text
    
    Returns:
        str: Cleaned text
    """
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Remove special characters but keep basic punctuation
    text = re.sub(r'[^\w\s.,!?-]', '', text)
    
    return text.strip()


def extract_skills_from_text(text: str) -> List[str]:
    """
    Extract technical skills from job description text.
    
    Args:
        text: Job description text
    
    Returns:
        List[str]: List of extracted skills
    """
    # Common technical skills patterns
    skill_patterns = [
        # Programming languages
        r'\b(?:Python|JavaScript|Java|C\+\+|C#|Go|Rust|Ruby|PHP|Swift|Kotlin)\b',
        # Frameworks
        r'\b(?:React|Angular|Vue|Django|Flask|Spring|Express|Node\.js|Laravel)\b',
        # Databases
        r'\b(?:MySQL|PostgreSQL|MongoDB|Redis|Elasticsearch|Oracle|SQLite)\b',
        # Cloud services
        r'\b(?:AWS|Azure|GCP|Docker|Kubernetes|Terraform|Jenkins)\b',
        # Other tools
        r'\b(?:Git|Linux|Unix|Nginx|Apache|GraphQL|REST|API)\b'
    ]
    
    skills = set()
    text_upper = text.upper()
    
    for pattern in skill_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        skills.update(matches)
    
    return list(skills)


def extract_salary_from_text(text: str) -> tuple:
    """
    Extract salary information from text.
    
    Args:
        text: Text containing salary information
    
    Returns:
        tuple: (min_salary, max_salary) or (None, None)
    """
    # Patterns for salary extraction
    salary_patterns = [
        r'\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*-\s*\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',  # $50,000 - $70,000
        r'(\d{1,3}(?:,\d{3})*)\s*-\s*(\d{1,3}(?:,\d{3})*)\s*(?:USD|dollars?)',  # 50,000 - 70,000 USD
        r'\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:to|up to)\s*\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',  # $50,000 to $70,000
    ]
    
    for pattern in salary_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            min_sal = int(match.group(1).replace(',', '').replace('.00', ''))
            max_sal = int(match.group(2).replace(',', '').replace('.00', ''))
            return (min_sal, max_sal)
    
    return (None, None)


def extract_locations_from_text(text: str) -> List[str]:
    """
    Extract location information from text.
    
    Args:
        text: Text containing location information
    
    Returns:
        List[str]: List of extracted locations
    """
    # Common location patterns
    location_patterns = [
        r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})\b',  # City, State
        r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+)\b',  # City, Country
        r'\b(Remote|Work from home|WFH|Hybrid)\b',  # Remote work options
    ]
    
    locations = []
    
    for pattern in location_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            if isinstance(match, tuple):
                locations.append(f"{match[0]}, {match[1]}")
            else:
                locations.append(match)
    
    return list(set(locations))