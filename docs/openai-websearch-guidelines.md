# OpenAI Web Search API Guidelines for Claude Code

## Overview

OpenAI has introduced web search capabilities through their new Responses API, which provides a simpler and more flexible way to interact with models that can search the web. This guide covers how to implement and use the web search functionality in Claude Code.

## Prerequisites

- OpenAI API key
- Python environment with `openai` library installed
- Access to models that support web search (e.g., `gpt-4o`)

## Installation

```bash
pip install openai
```

## Basic Implementation

### 1. Initialize the Client

```python
from openai import OpenAI
import json

# Initialize the OpenAI client
client = OpenAI(api_key="your-api-key-here")
```

### 2. Simple Web Search Query

```python
# Basic web search example
response = client.responses.create(
    model="gpt-4o",
    input="What's the latest news about AI?",
    tools=[
        {
            "type": "web_search"
        }
    ]
)

# Print the response
print(json.dumps(response.output, indent=2))
```

### 3. Web Search with Specific Parameters

```python
# Web search with configuration
response = client.responses.create(
    model="gpt-4o",
    input="Find recent research papers on quantum computing",
    tools=[
        {
            "type": "web_search",
            "location": None,  # Optional: specify location
            "sites": None      # Optional: restrict to specific sites
        }
    ],
    temperature=0.7,
    tool_choice="auto"  # Let the model decide when to use tools
)
```

## Advanced Usage Patterns

### 1. Multi-Tool Response with Web Search

```python
# Combine web search with other capabilities
response = client.responses.create(
    model="gpt-4o",
    input="Search for the latest stock price of Apple and analyze the trend",
    tools=[
        {
            "type": "web_search"
        },
        {
            "type": "file_search"  # If you have files to search
        }
    ]
)
```

### 2. Handling Web Search Results

```python
def process_web_search_response(response):
    """Process and extract information from web search responses"""
    
    for output in response.output:
        if output.get("type") == "web_search_call":
            print(f"Web search performed - ID: {output.get('id')}")
            print(f"Status: {output.get('status')}")
        
        elif output.get("type") == "message":
            content = output.get("content", [])
            for item in content:
                # Extract text content
                if item.get("type") == "output_text":
                    print("Response:", item.get("text"))
                    
                    # Extract URL citations
                    annotations = item.get("annotations", [])
                    for annotation in annotations:
                        if annotation.get("type") == "url_citation":
                            print(f"Source: {annotation.get('title')}")
                            print(f"URL: {annotation.get('url')}")

# Use the function
response = client.responses.create(
    model="gpt-4o",
    input="What are the latest developments in renewable energy?",
    tools=[{"type": "web_search"}]
)

process_web_search_response(response)
```

### 3. Error Handling

```python
try:
    response = client.responses.create(
        model="gpt-4o",
        input="Search for current weather in New York",
        tools=[{"type": "web_search"}]
    )
    
    if response.error:
        print(f"Error occurred: {response.error}")
    else:
        # Process successful response
        pass
        
except Exception as e:
    print(f"API call failed: {str(e)}")
```

## Best Practices

### 1. Query Optimization

- Keep search queries concise and specific
- Use natural language that clearly indicates search intent
- Include temporal indicators when searching for recent information

```python
# Good examples
good_queries = [
    "latest AI breakthroughs 2025",
    "current Bitcoin price USD",
    "recent climate change research papers"
]

# Less optimal examples
poor_queries = [
    "tell me everything about AI",  # Too broad
    "weather",                       # Missing location/time
    "news"                          # Too vague
]
```

### 2. Rate Limiting and Cost Management

```python
import time

class WebSearchClient:
    def __init__(self, api_key, max_requests_per_minute=20):
        self.client = OpenAI(api_key=api_key)
        self.max_requests_per_minute = max_requests_per_minute
        self.request_times = []
    
    def search(self, query):
        # Rate limiting logic
        current_time = time.time()
        self.request_times = [t for t in self.request_times 
                            if current_time - t < 60]
        
        if len(self.request_times) >= self.max_requests_per_minute:
            sleep_time = 60 - (current_time - self.request_times[0])
            time.sleep(sleep_time)
        
        self.request_times.append(current_time)
        
        # Make the API call
        return self.client.responses.create(
            model="gpt-4o",
            input=query,
            tools=[{"type": "web_search"}]
        )
```

### 3. Caching Results

```python
import hashlib
import json
from datetime import datetime, timedelta

class CachedWebSearch:
    def __init__(self, client, cache_duration_hours=1):
        self.client = client
        self.cache = {}
        self.cache_duration = timedelta(hours=cache_duration_hours)
    
    def _get_cache_key(self, query):
        return hashlib.md5(query.encode()).hexdigest()
    
    def search(self, query):
        cache_key = self._get_cache_key(query)
        
        # Check cache
        if cache_key in self.cache:
            cached_data, timestamp = self.cache[cache_key]
            if datetime.now() - timestamp < self.cache_duration:
                return cached_data
        
        # Perform search
        response = self.client.responses.create(
            model="gpt-4o",
            input=query,
            tools=[{"type": "web_search"}]
        )
        
        # Cache the result
        self.cache[cache_key] = (response, datetime.now())
        return response
```

## Common Use Cases

### 1. Real-time Information Retrieval

```python
def get_current_info(topic):
    """Get real-time information about a topic"""
    response = client.responses.create(
        model="gpt-4o",
        input=f"Search for the latest information about {topic}",
        tools=[{"type": "web_search"}]
    )
    return response
```

### 2. Fact Checking

```python
def fact_check(claim):
    """Verify a claim using web search"""
    response = client.responses.create(
        model="gpt-4o",
        input=f"Fact check this claim: {claim}",
        tools=[{"type": "web_search"}]
    )
    return response
```

### 3. Research Assistant

```python
def research_topic(topic, num_sources=5):
    """Comprehensive research on a topic"""
    response = client.responses.create(
        model="gpt-4o",
        input=f"Research {topic} and provide {num_sources} credible sources",
        tools=[{"type": "web_search"}],
        temperature=0.3  # Lower temperature for factual accuracy
    )
    return response
```

## Integration with Claude Code

When integrating with Claude Code, consider these patterns:

```python
class ClaudeCodeWebSearchIntegration:
    def __init__(self, openai_api_key):
        self.openai_client = OpenAI(api_key=openai_api_key)
    
    def enhance_code_with_docs(self, code_snippet, language):
        """Search for documentation related to code"""
        query = f"Find official documentation for {language}: {code_snippet[:100]}"
        
        response = self.openai_client.responses.create(
            model="gpt-4o",
            input=query,
            tools=[{"type": "web_search"}]
        )
        
        return self._extract_documentation_links(response)
    
    def find_code_examples(self, problem_description):
        """Search for code examples solving similar problems"""
        query = f"Find code examples: {problem_description}"
        
        response = self.openai_client.responses.create(
            model="gpt-4o",
            input=query,
            tools=[{"type": "web_search"}]
        )
        
        return response
```

## Troubleshooting

### Common Issues and Solutions

1. **No search results returned**
   - Ensure the model supports web search
   - Check if tools parameter is correctly formatted
   - Verify API key has necessary permissions

2. **Rate limiting errors**
   - Implement exponential backoff
   - Use caching for repeated queries
   - Monitor API usage

3. **Irrelevant results**
   - Refine search queries to be more specific
   - Use temporal indicators for recent information
   - Consider using site restrictions when applicable

## Security Considerations

1. **API Key Management**
   ```python
   import os
   from dotenv import load_dotenv
   
   load_dotenv()
   api_key = os.getenv("OPENAI_API_KEY")
   ```

2. **Input Sanitization**
   ```python
   def sanitize_search_query(query):
       # Remove potentially harmful characters
       sanitized = query.replace("<", "").replace(">", "")
       # Limit query length
       return sanitized[:500]
   ```

3. **Response Validation**
   ```python
   def validate_search_response(response):
       # Check for expected structure
       if not hasattr(response, 'output'):
           raise ValueError("Invalid response structure")
       
       # Validate URLs in citations
       for output in response.output:
           if output.get("type") == "message":
               for content in output.get("content", []):
                   for annotation in content.get("annotations", []):
                       url = annotation.get("url")
                       if url and not url.startswith(("https://", "http://")):
                           raise ValueError(f"Invalid URL: {url}")
   ```

## Conclusion

The OpenAI Web Search API through the Responses API provides a powerful way to enhance Claude Code with real-time information retrieval capabilities. By following these guidelines and best practices, you can effectively integrate web search functionality into your applications while maintaining performance, security, and cost efficiency.

Remember to:
- Always handle errors gracefully
- Implement rate limiting to avoid API limits
- Cache results when appropriate
- Validate and sanitize inputs
- Monitor usage and costs
- Keep your API keys secure

For the latest updates and additional features, refer to the official OpenAI documentation at https://platform.openai.com/docs/