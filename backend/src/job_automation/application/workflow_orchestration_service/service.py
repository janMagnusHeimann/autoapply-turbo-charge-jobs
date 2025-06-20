"""
Workflow Orchestration Service
Main service that orchestrates the complete job application workflow
"""

import logging
from typing import Dict, Any
from datetime import datetime

from ...core.models import (
    WorkflowExecutionRequest, WorkflowExecution, WorkflowStep,
    CompanyData, APIResponse
)
from ...application.career_discovery_service.service import CareerDiscoveryService
from ...application.user_validation_service.service import UserValidationService
from ...infrastructure.clients.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)


class WorkflowOrchestrationService:
    """
    Main orchestration service for job application workflows
    
    This service coordinates the complete workflow:
    1. User profile validation
    2. Career page discovery
    3. Job scraping and matching
    4. CV generation and optimization
    5. Application submission (future)
    """
    
    def __init__(
        self,
        career_discovery_service: CareerDiscoveryService,
        user_validation_service: UserValidationService,
        supabase_client: SupabaseClient
    ):
        self.career_discovery_service = career_discovery_service
        self.user_validation_service = user_validation_service
        self.supabase_client = supabase_client

    async def execute_career_page_discovery_workflow(self, request: WorkflowExecutionRequest) -> APIResponse:
        """
        Execute the career page discovery workflow for a specific company
        
        Workflow steps:
        1. Validate user profile readiness
        2. Check if career page already exists
        3. Discover career page using AI agent
        4. Verify and store career page
        5. Prepare for next steps (job scraping)
        """
        workflow_id = f"workflow_{request.user_id}_{request.company_id}_{int(datetime.utcnow().timestamp())}"
        
        try:
            logger.info(f"Starting workflow {workflow_id} for user {request.user_id} and company {request.company_id}")
            
            # Initialize workflow execution tracking
            workflow = WorkflowExecution(
                workflow_id=workflow_id,
                user_id=request.user_id,
                company_id=request.company_id,
                status="running"
            )
            
            # Step 1: Validate user profile
            step1 = await self._execute_user_validation_step(workflow, request.user_id)
            workflow.steps.append(step1)
            
            if step1.status == "failed":
                workflow.status = "failed"
                return APIResponse(
                    success=False,
                    message="Workflow failed at user validation step",
                    error=step1.error_message,
                    data={"workflow_id": workflow_id, "step": "user_validation"}
                )
            
            # Check if user profile is ready for job applications
            validation_data = step1.result_data or {}
            if not validation_data.get("can_proceed", False):
                workflow.status = "failed"
                return APIResponse(
                    success=False,
                    message="User profile is not ready for job applications",
                    error="Please complete your profile before proceeding",
                    data={
                        "workflow_id": workflow_id,
                        "step": "user_validation",
                        "validation_result": validation_data
                    }
                )
            
            # Step 2: Get company information
            step2 = await self._execute_company_info_step(workflow, request.company_id)
            workflow.steps.append(step2)
            
            if step2.status == "failed":
                workflow.status = "failed"
                return APIResponse(
                    success=False,
                    message="Workflow failed at company info step",
                    error=step2.error_message,
                    data={"workflow_id": workflow_id, "step": "company_info"}
                )
            
            # Step 3: Career page discovery
            company_data = step2.result_data.get("company_data")
            step3 = await self._execute_career_discovery_step(workflow, company_data)
            workflow.steps.append(step3)
            
            # Calculate total cost
            workflow.total_cost_usd = sum(
                step.result_data.get("cost_usd", 0.0) if step.result_data else 0.0
                for step in workflow.steps
            )
            
            # Complete workflow
            workflow.status = "completed"
            workflow.completed_at = datetime.utcnow()
            
            # Prepare results
            career_discovery_result = step3.result_data or {}
            
            return APIResponse(
                success=True,
                message="Career page discovery workflow completed successfully",
                data={
                    "workflow_id": workflow_id,
                    "user_id": request.user_id,
                    "company_id": request.company_id,
                    "career_page_url": career_discovery_result.get("career_page_url"),
                    "confidence_score": career_discovery_result.get("confidence_score", 0.0),
                    "discovery_method": career_discovery_result.get("discovery_method"),
                    "total_cost_usd": workflow.total_cost_usd,
                    "workflow_status": workflow.status,
                    "steps_completed": len([s for s in workflow.steps if s.status == "completed"]),
                    "ready_for_job_scraping": bool(career_discovery_result.get("career_page_url"))
                }
            )
            
        except Exception as e:
            logger.error(f"Error in workflow {workflow_id}: {e}")
            return APIResponse(
                success=False,
                message="Workflow execution failed",
                error=str(e),
                data={"workflow_id": workflow_id}
            )

    async def _execute_user_validation_step(self, workflow: WorkflowExecution, user_id: str) -> WorkflowStep:
        """Execute user profile validation step"""
        step = WorkflowStep(
            step_name="user_profile_validation",
            status="in_progress",
            started_at=datetime.utcnow()
        )
        
        try:
            from ...core.models import UserProfileValidationRequest
            
            validation_request = UserProfileValidationRequest(user_id=user_id)
            validation_response = await self.user_validation_service.validate_user_profile(validation_request)
            
            if validation_response.success:
                step.status = "completed"
                step.result_data = validation_response.data
            else:
                step.status = "failed"
                step.error_message = validation_response.error
            
        except Exception as e:
            step.status = "failed"
            step.error_message = str(e)
            logger.error(f"User validation step failed: {e}")
        
        step.completed_at = datetime.utcnow()
        return step

    async def _execute_company_info_step(self, workflow: WorkflowExecution, company_id: str) -> WorkflowStep:
        """Execute company information retrieval step"""
        step = WorkflowStep(
            step_name="company_info_retrieval",
            status="in_progress",
            started_at=datetime.utcnow()
        )
        
        try:
            company = await self.supabase_client.get_company(company_id)
            
            if company:
                step.status = "completed"
                step.result_data = {
                    "company_data": company.dict()
                }
            else:
                step.status = "failed"
                step.error_message = f"Company not found: {company_id}"
            
        except Exception as e:
            step.status = "failed"
            step.error_message = str(e)
            logger.error(f"Company info step failed: {e}")
        
        step.completed_at = datetime.utcnow()
        return step

    async def _execute_career_discovery_step(self, workflow: WorkflowExecution, company_data: Dict[str, Any]) -> WorkflowStep:
        """Execute career page discovery step"""
        step = WorkflowStep(
            step_name="career_page_discovery",
            status="in_progress",
            started_at=datetime.utcnow()
        )
        
        try:
            from ...core.models import CareerPageDiscoveryRequest
            
            discovery_request = CareerPageDiscoveryRequest(
                company_id=company_data["id"],
                company_name=company_data["name"],
                website_url=company_data.get("website_url"),
                industry=company_data.get("industry")
            )
            
            discovery_response = await self.career_discovery_service.discover_single_career_page(discovery_request)
            
            if discovery_response.success:
                step.status = "completed"
                step.result_data = discovery_response.data
            else:
                step.status = "failed"
                step.error_message = discovery_response.error
            
        except Exception as e:
            step.status = "failed"
            step.error_message = str(e)
            logger.error(f"Career discovery step failed: {e}")
        
        step.completed_at = datetime.utcnow()
        return step

    async def get_workflow_status(self, workflow_id: str) -> APIResponse:
        """Get status of a specific workflow execution"""
        try:
            # In a real implementation, you'd store workflow state in database
            # For now, return basic status
            return APIResponse(
                success=True,
                message="Workflow status retrieved",
                data={
                    "workflow_id": workflow_id,
                    "message": "Workflow status tracking not yet implemented in database"
                }
            )
        except Exception as e:
            logger.error(f"Error getting workflow status: {e}")
            return APIResponse(
                success=False,
                message="Failed to get workflow status",
                error=str(e)
            )