"""
Data validation utilities.
"""

from typing import Any, Dict, List, Optional, Union
import re
from urllib.parse import urlparse


def validate_data(data: Dict[str, Any], schema: Dict[str, Any]) -> bool:
    """
    Validate data against a simple schema.
    
    Args:
        data: Data dictionary to validate
        schema: Schema dictionary with field requirements
    
    Returns:
        bool: True if data is valid
    """
    for field, requirements in schema.items():
        if requirements.get('required', False) and field not in data:
            return False
        
        if field in data:
            field_type = requirements.get('type')
            if field_type and not isinstance(data[field], field_type):
                return False
    
    return True


def sanitize_input(text: str) -> str:
    """
    Sanitize user input by removing potentially harmful characters.
    
    Args:
        text: Input text to sanitize
    
    Returns:
        str: Sanitized text
    """
    if not isinstance(text, str):
        return str(text)
    
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    
    # Remove script content
    text = re.sub(r'<script.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
    
    # Remove potential SQL injection patterns
    sql_patterns = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'SELECT', '--', ';']
    for pattern in sql_patterns:
        text = text.replace(pattern, '')
    
    return text.strip()


def validate_email(email: str) -> bool:
    """
    Validate email address format.
    
    Args:
        email: Email address to validate
    
    Returns:
        bool: True if email is valid
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_url(url: str) -> bool:
    """
    Validate URL format.
    
    Args:
        url: URL to validate
    
    Returns:
        bool: True if URL is valid
    """
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except Exception:
        return False


def validate_github_username(username: str) -> bool:
    """
    Validate GitHub username format.
    
    Args:
        username: GitHub username to validate
    
    Returns:
        bool: True if username is valid
    """
    pattern = r'^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$'
    return bool(re.match(pattern, username))