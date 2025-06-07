# User Asset Ingestion Agent

## Overview
The User Asset Ingestion Agent imports a user's professional history from external platforms (GitHub repositories and Google Scholar publications) into the database, making these assets available for CV generation.

## Purpose
This agent connects to external professional platforms to fetch and store user assets (code repositories and academic publications) that can be leveraged for tailored CV generation.

## Trigger
- **Type**: Manual
- **Method**: API call initiated when user connects their GitHub account or provides Google Scholar URL
- **Input**: Platform credentials or profile URLs

## Dependencies
- GitHub API access
- Google Scholar web scraping capabilities
- Access to cv_assets table
- User authentication and authorization system

## Core Logic

### GitHub Repository Ingestion
1. Authenticate with GitHub API using user's connected account
2. Fetch all public repositories for the authenticated user
3. For each repository:
   - Extract metadata (name, description, language, stars, forks)
   - Identify key technologies and frameworks used
   - Determine project significance based on activity and engagement
   - Create record in cv_assets table with type "repository"

### Google Scholar Publication Ingestion
1. Parse Google Scholar profile URL provided by user
2. Scrape publication list from Scholar profile
3. For each publication:
   - Extract title, authors, publication venue, citation count
   - Identify publication type (journal, conference, etc.)
   - Parse publication date and impact metrics
   - Create record in cv_assets table with type "publication"

### Asset Processing
1. Normalize asset data into standardized format
2. Link each asset to the user_id in cv_assets table
3. Tag assets with relevant keywords and categories
4. Set asset visibility and priority levels

## Data Schema
Assets stored in cv_assets table with fields:
- `user_id`: Reference to user
- `asset_type`: "repository" or "publication"
- `title`: Asset name/title
- `description`: Asset description or abstract
- `metadata`: JSON field with platform-specific data
- `tags`: Relevant keywords and technologies
- `created_at`: Ingestion timestamp
- `external_url`: Link to original source

## Error Handling
- GitHub API rate limiting and authentication failures
- Google Scholar anti-scraping measures
- Invalid or inaccessible profile URLs
- Network connectivity issues
- Malformed or missing asset data

## Success Criteria
- All accessible repositories/publications successfully imported
- Assets properly categorized and tagged
- Clean data format suitable for CV generation
- Accurate linking to user profile

## Monitoring & Logging
- Track ingestion success rates by platform
- Monitor API usage and rate limits
- Log failed asset imports with error details
- Alert on systematic ingestion failures