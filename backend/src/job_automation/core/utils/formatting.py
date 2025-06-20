"""
Formatting utilities.
"""

from datetime import datetime
from typing import Optional, Union
import locale


def format_timestamp(timestamp: Union[datetime, str], format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
    """
    Format timestamp to string.
    
    Args:
        timestamp: Datetime object or ISO string
        format_str: Format string for output
    
    Returns:
        str: Formatted timestamp
    """
    if isinstance(timestamp, str):
        try:
            timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        except ValueError:
            return timestamp
    
    return timestamp.strftime(format_str)


def format_currency(amount: Union[int, float], currency: str = "USD") -> str:
    """
    Format currency amount.
    
    Args:
        amount: Amount to format
        currency: Currency code
    
    Returns:
        str: Formatted currency string
    """
    if currency == "USD":
        return f"${amount:,.0f}"
    elif currency == "EUR":
        return f"€{amount:,.0f}"
    elif currency == "GBP":
        return f"£{amount:,.0f}"
    else:
        return f"{amount:,.0f} {currency}"


def format_salary_range(min_salary: Optional[int], max_salary: Optional[int], currency: str = "USD") -> str:
    """
    Format salary range.
    
    Args:
        min_salary: Minimum salary
        max_salary: Maximum salary
        currency: Currency code
    
    Returns:
        str: Formatted salary range
    """
    if min_salary and max_salary:
        return f"{format_currency(min_salary, currency)} - {format_currency(max_salary, currency)}"
    elif min_salary:
        return f"{format_currency(min_salary, currency)}+"
    elif max_salary:
        return f"Up to {format_currency(max_salary, currency)}"
    else:
        return "Salary not specified"


def format_job_title(title: str) -> str:
    """
    Format job title with proper capitalization.
    
    Args:
        title: Job title to format
    
    Returns:
        str: Formatted job title
    """
    # Common words that should not be capitalized unless at the beginning
    articles = {'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
    
    words = title.lower().split()
    formatted_words = []
    
    for i, word in enumerate(words):
        if i == 0 or word not in articles:
            formatted_words.append(word.capitalize())
        else:
            formatted_words.append(word)
    
    return ' '.join(formatted_words)


def truncate_text(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """
    Truncate text to specified length.
    
    Args:
        text: Text to truncate
        max_length: Maximum length
        suffix: Suffix to add when truncated
    
    Returns:
        str: Truncated text
    """
    if len(text) <= max_length:
        return text
    
    return text[:max_length - len(suffix)] + suffix