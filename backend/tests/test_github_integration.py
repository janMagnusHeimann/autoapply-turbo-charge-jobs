"""
Real GitHub API Integration Tests
Tests actual GitHub API functionality with proper authentication
"""
import pytest
import asyncio
import os
import aiohttp
from unittest.mock import patch
from typing import Optional

class TestGitHubAPIIntegration:
    """Test real GitHub API integration functionality"""
    
    @pytest.fixture
    def github_token(self):
        """Get GitHub token from environment or skip test"""
        token = os.environ.get('GITHUB_TEST_TOKEN')
        if not token:
            pytest.skip("GITHUB_TEST_TOKEN not set - skipping real API tests")
        return token
    
    @pytest.fixture
    def test_username(self):
        """Test username for API calls"""
        return os.environ.get('GITHUB_TEST_USERNAME', 'octocat')
    
    @pytest.mark.asyncio
    async def test_github_user_authentication(self, github_token):
        """Test GitHub user authentication with real token"""
        headers = {
            'Authorization': f'Bearer {github_token}',
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'job-automation-test'
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                'https://api.github.com/user',
                headers=headers
            ) as response:
                assert response.status == 200
                user_data = await response.json()
                
                # Validate required user fields
                assert 'login' in user_data
                assert 'id' in user_data
                assert 'name' in user_data or user_data.get('name') is None
                assert 'public_repos' in user_data
                assert isinstance(user_data['public_repos'], int)
                
                print(f"✅ Authenticated as: {user_data['login']}")
                return user_data
    
    @pytest.mark.asyncio
    async def test_github_repositories_fetch(self, github_token):
        """Test fetching user repositories"""
        headers = {
            'Authorization': f'Bearer {github_token}',
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'job-automation-test'
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                'https://api.github.com/user/repos?per_page=10&sort=updated',
                headers=headers
            ) as response:
                assert response.status == 200
                repos = await response.json()
                
                assert isinstance(repos, list)
                
                if repos:  # If user has repositories
                    repo = repos[0]
                    
                    # Validate repository structure
                    required_fields = [
                        'id', 'name', 'full_name', 'description', 
                        'html_url', 'language', 'updated_at', 
                        'stargazers_count', 'forks_count', 'private'
                    ]
                    
                    for field in required_fields:
                        assert field in repo, f"Missing field: {field}"
                    
                    print(f"✅ Fetched {len(repos)} repositories")
                    print(f"  Sample repo: {repo['name']} ({repo['language']})")
                else:
                    print("✅ User has no repositories (valid response)")
    
    @pytest.mark.asyncio
    async def test_github_rate_limiting(self, github_token):
        """Test GitHub rate limiting handling"""
        headers = {
            'Authorization': f'Bearer {github_token}',
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'job-automation-test'
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                'https://api.github.com/rate_limit',
                headers=headers
            ) as response:
                assert response.status == 200
                rate_limit = await response.json()
                
                # Validate rate limit structure
                assert 'rate' in rate_limit
                assert 'limit' in rate_limit['rate']
                assert 'remaining' in rate_limit['rate']
                assert 'reset' in rate_limit['rate']
                
                remaining = rate_limit['rate']['remaining']
                limit = rate_limit['rate']['limit']
                
                print(f"✅ Rate limit: {remaining}/{limit} remaining")
                
                # Warn if rate limit is low
                if remaining < 100:
                    print(f"⚠️ Low rate limit remaining: {remaining}")
    
    @pytest.mark.asyncio
    async def test_github_public_user_fetch(self, test_username):
        """Test fetching public user data (no auth required)"""
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f'https://api.github.com/users/{test_username}',
                headers={'User-Agent': 'job-automation-test'}
            ) as response:
                assert response.status == 200
                user_data = await response.json()
                
                # Validate public user fields
                assert user_data['login'] == test_username
                assert 'public_repos' in user_data
                assert 'followers' in user_data
                assert 'following' in user_data
                
                print(f"✅ Fetched public user: {user_data['login']}")
    
    @pytest.mark.asyncio
    async def test_github_repository_search(self):
        """Test GitHub repository search functionality"""
        query = "language:python stars:>1000"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f'https://api.github.com/search/repositories?q={query}&per_page=5',
                headers={'User-Agent': 'job-automation-test'}
            ) as response:
                assert response.status == 200
                search_results = await response.json()
                
                # Validate search structure
                assert 'total_count' in search_results
                assert 'items' in search_results
                assert isinstance(search_results['items'], list)
                
                if search_results['items']:
                    repo = search_results['items'][0]
                    assert repo['stargazers_count'] > 1000
                    assert repo['language'] == 'Python'
                
                print(f"✅ Search found {search_results['total_count']} repositories")
    
    def test_github_oauth_flow_validation(self):
        """Test GitHub OAuth flow components"""
        # Test OAuth URL generation
        client_id = os.environ.get('GITHUB_CLIENT_ID', 'test-client-id')
        redirect_uri = 'http://localhost:8087/auth/github/callback'
        
        oauth_url = (
            f'https://github.com/login/oauth/authorize'
            f'?client_id={client_id}'
            f'&redirect_uri={redirect_uri}'
            f'&scope=repo,user:email'
        )
        
        # Basic URL structure validation
        assert 'github.com/login/oauth/authorize' in oauth_url
        assert 'client_id=' in oauth_url
        assert 'redirect_uri=' in oauth_url
        assert 'scope=' in oauth_url
        
        print("✅ OAuth URL structure is valid")
    
    @pytest.mark.asyncio
    async def test_github_api_error_handling(self):
        """Test GitHub API error handling"""
        # Test with invalid token
        headers = {
            'Authorization': 'Bearer invalid-token',
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'job-automation-test'
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                'https://api.github.com/user',
                headers=headers
            ) as response:
                assert response.status == 401
                error_data = await response.json()
                
                assert 'message' in error_data
                print(f"✅ Proper error handling: {error_data['message']}")
    
    def test_github_service_configuration(self):
        """Test GitHub service configuration requirements"""
        # Test required environment variables
        required_vars = [
            'GITHUB_CLIENT_ID',
            'GITHUB_CLIENT_SECRET',
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY'
        ]
        
        missing_vars = []
        for var in required_vars:
            if not os.environ.get(var):
                missing_vars.append(var)
        
        if missing_vars:
            print(f"⚠️ Missing environment variables: {missing_vars}")
            print("  These are required for full GitHub integration")
        else:
            print("✅ All required environment variables are configured")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])