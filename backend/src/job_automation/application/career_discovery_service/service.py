"""
Career Discovery Service
Application service that orchestrates career page discovery workflow
"""

import logging
from typing import List, Optional
from datetime import datetime

from ...core.models import (
    CompanyData, CareerPageResult, CareerPageDiscoveryRequest, 
    BulkCareerPageDiscoveryRequest, APIResponse
)
from ...core.agents.career_page_agent import CareerPageAgent
from ...infrastructure.clients.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)


class CareerDiscoveryService:
    """Service for managing career page discovery operations"""
    
    def __init__(self, openai_api_key: str, supabase_client: SupabaseClient):
        self.career_agent = CareerPageAgent(openai_api_key)
        self.supabase_client = supabase_client

    async def discover_single_career_page(self, request: CareerPageDiscoveryRequest) -> APIResponse:
        """
        Discover career page for a single company
        
        This method:
        1. Checks if company already has career page in database
        2. If not, uses AI agent to discover it
        3. Validates the discovered URL
        4. Updates database with result
        """
        try:
            logger.info(f"Starting career page discovery for company: {request.company_name}")
            
            # Check if career page already exists in database
            existing_url = await self.supabase_client.check_company_career_page_exists(request.company_id)
            if existing_url:
                return APIResponse(
                    success=True,
                    message="Career page already exists in database",
                    data={
                        "career_page_url": existing_url,
                        "confidence_score": 1.0,
                        "discovery_method": "database_existing",
                        "company_id": request.company_id,
                        "company_name": request.company_name
                    }
                )
            
            # Create company data model
            company = CompanyData(
                id=request.company_id,
                name=request.company_name,
                website_url=request.website_url,
                industry=request.industry
            )
            
            # Use AI agent to discover career page
            discovery_result = await self.career_agent.discover_career_page(company)
            
            # Update database if we found a good career page
            if discovery_result.career_page_url and discovery_result.confidence_score > 0.5:
                await self.supabase_client.update_company_career_page(
                    request.company_id, 
                    discovery_result.career_page_url
                )
            
            # Store discovery log for analytics
            await self.supabase_client.store_career_page_discovery_log(discovery_result)
            
            # Prepare response
            if discovery_result.career_page_url:
                return APIResponse(
                    success=True,
                    message=f"Career page discovered with {discovery_result.confidence_score:.1%} confidence",
                    data={
                        "career_page_url": discovery_result.career_page_url,
                        "confidence_score": discovery_result.confidence_score,
                        "discovery_method": discovery_result.discovery_method,
                        "validation_status": discovery_result.validation_status,
                        "additional_urls": discovery_result.additional_urls,
                        "cost_usd": discovery_result.cost_usd,
                        "company_id": request.company_id,
                        "company_name": request.company_name
                    }
                )
            else:
                return APIResponse(
                    success=False,
                    message="No career page found",
                    error=discovery_result.error_message,
                    data={
                        "company_id": request.company_id,
                        "company_name": request.company_name,
                        "cost_usd": discovery_result.cost_usd
                    }
                )
                
        except Exception as e:
            logger.error(f"Error in career page discovery for {request.company_name}: {e}")
            return APIResponse(
                success=False,
                message="Career page discovery failed",
                error=str(e),
                data={
                    "company_id": request.company_id,
                    "company_name": request.company_name
                }
            )

    async def discover_bulk_career_pages(self, request: BulkCareerPageDiscoveryRequest) -> APIResponse:
        """
        Discover career pages for multiple companies
        
        This method processes companies in batches to avoid rate limiting
        and provides progress updates for long-running operations.
        """
        try:
            logger.info(f"Starting bulk career page discovery for {len(request.companies)} companies")
            
            # Convert requests to company data models
            companies = []
            for company_request in request.companies:
                company = CompanyData(
                    id=company_request.company_id,
                    name=company_request.company_name,
                    website_url=company_request.website_url,
                    industry=company_request.industry
                )
                companies.append(company)
            
            # Use agent to discover career pages in batches
            discovery_results = await self.career_agent.discover_multiple_career_pages(companies)
            
            # Process results and update database
            successful_discoveries = 0
            failed_discoveries = 0
            total_cost = 0.0
            results_summary = []
            
            for result in discovery_results:
                total_cost += result.cost_usd
                
                # Update database if we found a good career page
                if result.career_page_url and result.confidence_score > 0.5:
                    await self.supabase_client.update_company_career_page(
                        result.company_id, 
                        result.career_page_url
                    )
                    successful_discoveries += 1
                else:
                    failed_discoveries += 1
                
                # Store discovery log
                await self.supabase_client.store_career_page_discovery_log(result)
                
                # Add to results summary
                results_summary.append({
                    "company_id": result.company_id,
                    "company_name": result.company_name,
                    "career_page_url": result.career_page_url,
                    "confidence_score": result.confidence_score,
                    "discovery_method": result.discovery_method,
                    "validation_status": result.validation_status
                })
            
            return APIResponse(
                success=True,
                message=f"Bulk discovery completed: {successful_discoveries} successful, {failed_discoveries} failed",
                data={
                    "total_companies": len(request.companies),
                    "successful_discoveries": successful_discoveries,
                    "failed_discoveries": failed_discoveries,
                    "total_cost_usd": total_cost,
                    "results": results_summary
                }
            )
            
        except Exception as e:
            logger.error(f"Error in bulk career page discovery: {e}")
            return APIResponse(
                success=False,
                message="Bulk career page discovery failed",
                error=str(e)
            )

    async def get_discovery_stats(self) -> APIResponse:
        """Get career page discovery statistics"""
        try:
            cache_stats = self.career_agent.get_cache_stats()
            
            return APIResponse(
                success=True,
                message="Discovery statistics retrieved",
                data={
                    "cache_stats": cache_stats,
                    "agent_status": "healthy"
                }
            )
        except Exception as e:
            logger.error(f"Error getting discovery stats: {e}")
            return APIResponse(
                success=False,
                message="Failed to get discovery statistics",
                error=str(e)
            )

    async def clear_discovery_cache(self) -> APIResponse:
        """Clear the career page discovery cache"""
        try:
            self.career_agent.clear_cache()
            
            return APIResponse(
                success=True,
                message="Discovery cache cleared successfully"
            )
        except Exception as e:
            logger.error(f"Error clearing discovery cache: {e}")
            return APIResponse(
                success=False,
                message="Failed to clear discovery cache",
                error=str(e)
            )