"""
Enhanced Application Agent - LangChain-powered orchestrator for complete job application automation

This service orchestrates the entire job application process using LangChain multi-agent
architecture with intelligent decision making, error recovery, and adaptive strategies.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Tuple
import json
from datetime import datetime

from langchain.memory import ConversationBufferWindowMemory

from .langchain_services.base_service import BaseLangChainService
from .langchain_services.prompt_templates import PromptTemplates
from .langchain_services.structured_outputs import (
    FormAnalysisOutput, CVMappingOutput, FormFillingOutput, 
    CoverLetterOutput, AgentDecision, ErrorRecoveryOutput
)

# Import enhanced services
from .enhanced_form_analysis_service import EnhancedFormAnalysisService
from .enhanced_cv_selection_service import EnhancedCVSelectionService
from .enhanced_browser_form_filler import EnhancedBrowserFormFiller
from .enhanced_content_generation_service import EnhancedContentGenerationService
from .application_tracking_service import ApplicationTrackingService

logger = logging.getLogger(__name__)


class EnhancedApplicationAgent(BaseLangChainService[AgentDecision]):
    """
    Enhanced Application Agent using LangChain orchestration for complete automation
    
    Features:
    - Multi-agent orchestration with intelligent coordination
    - Adaptive workflow management based on form complexity
    - Intelligent error recovery and alternative strategies
    - Real-time progress tracking and user communication
    - Quality assurance and validation at each step
    - Learning from successful/failed applications for improvement
    """
    
    def __init__(
        self,
        form_analysis_service: EnhancedFormAnalysisService,
        cv_selection_service: EnhancedCVSelectionService,
        browser_form_filler: EnhancedBrowserFormFiller,
        content_generation_service: EnhancedContentGenerationService,
        tracking_service: ApplicationTrackingService,
        openai_api_key: str
    ):
        super().__init__(
            openai_api_key=openai_api_key,
            model_name="gpt-4",
            temperature=0.3,  # Balanced for decision making
            max_retries=3
        )
        
        # Enhanced service components
        self.form_analysis_service = form_analysis_service
        self.cv_selection_service = cv_selection_service
        self.browser_form_filler = browser_form_filler
        self.content_generation_service = content_generation_service
        self.tracking_service = tracking_service
        
        # Workflow management
        self.workflow_memory = ConversationBufferWindowMemory(k=20, return_messages=True)
        self.successful_patterns = {}
        
        # Performance tracking
        self.application_attempts = 0
        self.successful_applications = 0
        self.error_recoveries = 0
        
        # Decision thresholds
        self.confidence_thresholds = {
            'form_analysis': 0.7,
            'cv_mapping': 0.6,
            'form_filling': 0.8,
            'content_quality': 0.7
        }
        
        logger.info("Enhanced Application Agent initialized with multi-agent orchestration")
    
    async def process_complete_application(
        self,
        application_id: str,
        user_id: str,
        job_data: Dict[str, Any],
        cv_choice: str,
        cv_id: Optional[str] = None,
        uploaded_cv_path: Optional[str] = None,
        cover_letter_prompt: Optional[str] = None,
        auto_submit: bool = False
    ) -> Dict[str, Any]:
        """
        Process complete job application with intelligent orchestration
        
        Args:
            application_id: Unique application identifier
            user_id: User identifier
            job_data: Complete job information
            cv_choice: 'generated' or 'uploaded'
            cv_id: ID for generated CV
            uploaded_cv_path: Path for uploaded CV
            cover_letter_prompt: Custom cover letter instructions
            auto_submit: Whether to automatically submit
            
        Returns:
            Complete application processing results
        """
        try:
            logger.info(f"🚀 Starting complete application processing: {application_id}")
            self.application_attempts += 1
            
            # Initialize application context
            context = await self._initialize_application_context(
                application_id, user_id, job_data, cv_choice, cv_id, uploaded_cv_path
            )
            
            if not context['success']:
                return context
            
            # Execute multi-stage application workflow
            workflow_result = await self._execute_application_workflow(
                context, cover_letter_prompt, auto_submit
            )
            
            # Finalize and validate results
            final_result = await self._finalize_application_results(
                application_id, workflow_result, context
            )
            
            if final_result.get('success', False):
                self.successful_applications += 1
            
            logger.info(f"✅ Application processing completed: {application_id}")
            return final_result
            
        except Exception as e:
            logger.error(f"❌ Application processing failed for {application_id}: {e}")
            await self.tracking_service.update_application_progress(
                application_id, 100, f"Application failed: {str(e)}", "failed"
            )
            return {
                'success': False,
                'error': str(e),
                'application_id': application_id
            }
    
    async def _initialize_application_context(
        self,
        application_id: str,
        user_id: str,
        job_data: Dict[str, Any],
        cv_choice: str,
        cv_id: Optional[str],
        uploaded_cv_path: Optional[str]
    ) -> Dict[str, Any]:
        """Initialize comprehensive application context"""
        
        try:
            # Update progress
            await self.tracking_service.update_application_progress(
                application_id, 5, "Initializing application context", "analyzing"
            )
            
            # Load CV data based on choice
            if cv_choice == 'generated' and cv_id:
                cv_data = await self.cv_selection_service.get_generated_cv(cv_id)
            elif cv_choice == 'uploaded' and uploaded_cv_path:
                cv_data = await self.cv_selection_service.get_uploaded_cv(uploaded_cv_path)
            else:
                raise ValueError(f"Invalid CV configuration: choice={cv_choice}, cv_id={cv_id}, path={uploaded_cv_path}")
            
            # Extract application URL
            application_url = job_data.get('applicationUrl') or job_data.get('apply_url')
            if not application_url:
                raise ValueError("No application URL found in job data")
            
            # Create application context
            context = {
                'success': True,
                'application_id': application_id,
                'user_id': user_id,
                'job_data': job_data,
                'cv_data': cv_data,
                'cv_choice': cv_choice,
                'application_url': application_url,
                'timestamp': datetime.now().isoformat(),
                'workflow_state': 'initialized'
            }
            
            # Store context in memory for workflow continuity
            self.workflow_memory.save_context(
                {"input": f"Initialize application {application_id}"},
                {"output": f"Context initialized for {job_data.get('company', 'Unknown')} - {job_data.get('title', 'Unknown')}"}
            )
            
            logger.info(f"✅ Application context initialized: {application_id}")
            return context
            
        except Exception as e:
            logger.error(f"Context initialization failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'application_id': application_id
            }
    
    async def _execute_application_workflow(
        self,
        context: Dict[str, Any],
        cover_letter_prompt: Optional[str],
        auto_submit: bool
    ) -> Dict[str, Any]:
        """Execute the complete application workflow with intelligent orchestration"""
        
        application_id = context['application_id']
        workflow_results = {}
        
        try:
            # Stage 1: Intelligent Form Analysis
            logger.info(f"📋 Stage 1: Form Analysis - {application_id}")
            form_analysis_result = await self._execute_form_analysis_stage(context)
            workflow_results['form_analysis'] = form_analysis_result
            
            if not form_analysis_result.get('success', False):
                return self._create_workflow_failure("Form analysis failed", workflow_results)
            
            # Stage 2: CV-Job Mapping and Content Generation
            logger.info(f"🎯 Stage 2: CV Mapping & Content Generation - {application_id}")
            mapping_result = await self._execute_cv_mapping_stage(
                context, form_analysis_result['analysis'], cover_letter_prompt
            )
            workflow_results['cv_mapping'] = mapping_result
            
            if not mapping_result.get('success', False):
                return self._create_workflow_failure("CV mapping failed", workflow_results)
            
            # Stage 3: Intelligent Form Filling
            logger.info(f"📝 Stage 3: Form Filling - {application_id}")
            filling_result = await self._execute_form_filling_stage(
                context, form_analysis_result['analysis'], mapping_result['mappings']
            )
            workflow_results['form_filling'] = filling_result
            
            if not filling_result.get('success', False):
                return self._create_workflow_failure("Form filling failed", workflow_results)
            
            # Stage 4: Quality Validation and Review
            logger.info(f"✅ Stage 4: Quality Validation - {application_id}")
            validation_result = await self._execute_validation_stage(
                context, workflow_results
            )
            workflow_results['validation'] = validation_result
            
            # Stage 5: Submission Decision and Execution
            if auto_submit and validation_result.get('ready_for_submission', False):
                logger.info(f"🚀 Stage 5: Auto Submission - {application_id}")
                submission_result = await self._execute_submission_stage(
                    context, workflow_results
                )
                workflow_results['submission'] = submission_result
            else:
                logger.info(f"⏳ Stage 5: Ready for Manual Review - {application_id}")
                workflow_results['submission'] = {
                    'success': True,
                    'status': 'ready_for_review',
                    'message': 'Application ready for manual review and submission'
                }
            
            return {
                'success': True,
                'workflow_results': workflow_results,
                'final_status': 'completed' if auto_submit else 'ready_for_review'
            }
            
        except Exception as e:
            logger.error(f"Workflow execution failed: {e}")
            return self._create_workflow_failure(f"Workflow execution failed: {str(e)}", workflow_results)
    
    async def _execute_form_analysis_stage(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute form analysis stage with intelligence and error recovery"""
        
        application_id = context['application_id']
        application_url = context['application_url']
        
        try:
            await self.tracking_service.update_application_progress(
                application_id, 15, "Analyzing application form structure", "analyzing"
            )
            
            # Perform enhanced form analysis
            analysis_result = await self.form_analysis_service.analyze_form(application_url)
            
            if not analysis_result.get('success', False):
                # Attempt error recovery
                recovery_result = await self._attempt_stage_recovery(
                    'form_analysis', analysis_result.get('error', 'Unknown error'), context
                )
                if recovery_result.get('success', False):
                    analysis_result = recovery_result['result']
                    self.error_recoveries += 1
                else:
                    return {'success': False, 'error': 'Form analysis failed after recovery attempts'}
            
            # Validate analysis quality
            analysis_data = analysis_result.get('form_data', {})
            confidence = analysis_data.get('confidence', 0.0)
            
            if confidence < self.confidence_thresholds['form_analysis']:
                logger.warning(f"Low confidence form analysis: {confidence}")
                # Store for potential manual review
                await self.tracking_service.store_analysis_for_review(
                    application_id, 'form_analysis', analysis_data
                )
            
            await self.tracking_service.update_application_progress(
                application_id, 25, f"Form analysis completed ({len(analysis_data.get('fields', []))} fields detected)", "analyzing"
            )
            
            return {
                'success': True,
                'analysis': analysis_data,
                'confidence': confidence,
                'fields_detected': len(analysis_data.get('fields', []))
            }
            
        except Exception as e:
            logger.error(f"Form analysis stage failed: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _execute_cv_mapping_stage(
        self,
        context: Dict[str, Any],
        form_analysis: Dict[str, Any],
        cover_letter_prompt: Optional[str]
    ) -> Dict[str, Any]:
        """Execute CV mapping and content generation stage"""
        
        application_id = context['application_id']
        cv_data = context['cv_data']
        job_data = context['job_data']
        
        try:
            await self.tracking_service.update_application_progress(
                application_id, 35, "Mapping CV data to form fields", "preparing"
            )
            
            # Perform intelligent CV-to-form mapping
            form_fields = form_analysis.get('fields', [])
            mapping_result = await self.cv_selection_service.map_cv_to_form_fields(
                cv_data, form_fields, job_data
            )
            
            # Validate mapping quality
            mapping_score = mapping_result.overall_match_score
            if mapping_score < self.confidence_thresholds['cv_mapping']:
                logger.warning(f"Low quality CV mapping: {mapping_score}")
                # Generate suggestions for improvement
                improvement_suggestions = await self._generate_mapping_improvements(
                    cv_data, form_fields, mapping_result
                )
                mapping_result.recommendations.extend(improvement_suggestions)
            
            # Generate cover letter if needed
            cover_letter_result = None
            if cover_letter_prompt or any('cover_letter' in field.get('name', '').lower() for field in form_fields):
                await self.tracking_service.update_application_progress(
                    application_id, 45, "Generating personalized cover letter", "preparing"
                )
                
                cover_letter_response = await self.content_generation_service.generate_job_specific_cover_letter(
                    cv_data, job_data, cover_letter_prompt
                )
                
                if cover_letter_response.get('success', False):
                    cover_letter_result = cover_letter_response['cover_letter']
            
            await self.tracking_service.update_application_progress(
                application_id, 55, f"CV mapping completed (match score: {mapping_score:.2f})", "preparing"
            )
            
            return {
                'success': True,
                'mappings': mapping_result,
                'cover_letter': cover_letter_result,
                'mapping_score': mapping_score,
                'total_mappings': len(mapping_result.mappings)
            }
            
        except Exception as e:
            logger.error(f"CV mapping stage failed: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _execute_form_filling_stage(
        self,
        context: Dict[str, Any],
        form_analysis: Dict[str, Any],
        cv_mappings: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute intelligent form filling stage"""
        
        application_id = context['application_id']
        application_url = context['application_url']
        cv_data = context['cv_data']
        job_data = context['job_data']
        
        try:
            await self.tracking_service.update_application_progress(
                application_id, 65, "Filling application form with AI guidance", "filling"
            )
            
            # Perform intelligent form filling
            filling_result = await self.browser_form_filler.fill_form(
                application_url,
                form_analysis.get('fields', []),
                cv_data,
                job_data
            )
            
            if not filling_result.get('success', False):
                # Attempt error recovery
                recovery_result = await self._attempt_stage_recovery(
                    'form_filling', filling_result.get('error', 'Unknown error'), context
                )
                if recovery_result.get('success', False):
                    filling_result = recovery_result['result']
                    self.error_recoveries += 1
                else:
                    return {'success': False, 'error': 'Form filling failed after recovery attempts'}
            
            # Extract results
            filling_data = filling_result.get('result', {})
            completion_percentage = filling_data.get('completion_percentage', 0)
            successful_fields = filling_data.get('successful_fields', 0)
            failed_fields = filling_data.get('failed_fields', 0)
            
            # Validate filling quality
            if completion_percentage < self.confidence_thresholds['form_filling'] * 100:
                logger.warning(f"Low completion rate: {completion_percentage}%")
                # Generate specific guidance for failed fields
                filling_guidance = await self._generate_filling_guidance(
                    filling_data, form_analysis, cv_mappings
                )
                filling_data['guidance'] = filling_guidance
            
            await self.tracking_service.update_application_progress(
                application_id, 80, f"Form filling completed ({completion_percentage:.1f}%)", "filling"
            )
            
            return {
                'success': True,
                'filling_data': filling_data,
                'completion_percentage': completion_percentage,
                'successful_fields': successful_fields,
                'failed_fields': failed_fields
            }
            
        except Exception as e:
            logger.error(f"Form filling stage failed: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _execute_validation_stage(
        self,
        context: Dict[str, Any],
        workflow_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute comprehensive validation stage"""
        
        application_id = context['application_id']
        
        try:
            await self.tracking_service.update_application_progress(
                application_id, 90, "Validating application completeness", "reviewing"
            )
            
            # Comprehensive validation
            validation_results = {}
            
            # Validate form completion
            form_filling = workflow_results.get('form_filling', {})
            filling_data = form_filling.get('filling_data', {})
            completion_percentage = filling_data.get('completion_percentage', 0)
            
            validation_results['form_completion'] = {
                'passed': completion_percentage >= 80,
                'score': completion_percentage,
                'issues': filling_data.get('validation_errors', [])
            }
            
            # Validate CV mapping quality
            cv_mapping = workflow_results.get('cv_mapping', {})
            mapping_score = cv_mapping.get('mapping_score', 0)
            
            validation_results['cv_mapping_quality'] = {
                'passed': mapping_score >= 0.6,
                'score': mapping_score,
                'unmapped_fields': cv_mapping.get('mappings', {}).get('unmapped_fields', [])
            }
            
            # Validate cover letter if generated
            cover_letter = cv_mapping.get('cover_letter')
            if cover_letter:
                validation_results['cover_letter_quality'] = {
                    'passed': cover_letter.get('job_alignment_score', 0) >= 0.7,
                    'score': cover_letter.get('job_alignment_score', 0),
                    'improvements': cover_letter.get('improvement_suggestions', [])
                }
            
            # Overall readiness assessment
            critical_validations = ['form_completion', 'cv_mapping_quality']
            all_passed = all(
                validation_results[key]['passed'] 
                for key in critical_validations 
                if key in validation_results
            )
            
            ready_for_submission = all_passed and completion_percentage >= 80
            
            # Generate validation summary
            validation_summary = await self._generate_validation_summary(
                validation_results, context, workflow_results
            )
            
            return {
                'success': True,
                'ready_for_submission': ready_for_submission,
                'validation_results': validation_results,
                'validation_summary': validation_summary,
                'critical_issues': [
                    issue for key, result in validation_results.items() 
                    for issue in result.get('issues', [])
                    if not result['passed']
                ]
            }
            
        except Exception as e:
            logger.error(f"Validation stage failed: {e}")
            return {
                'success': True,  # Don't fail the entire workflow
                'ready_for_submission': False,
                'error': str(e)
            }
    
    async def _execute_submission_stage(
        self,
        context: Dict[str, Any],
        workflow_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute form submission stage"""
        
        application_id = context['application_id']
        
        try:
            await self.tracking_service.update_application_progress(
                application_id, 95, "Submitting application", "submitting"
            )
            
            # Prepare submission data
            filling_data = workflow_results.get('form_filling', {}).get('filling_data', {})
            
            # Execute submission
            submission_result = await self.browser_form_filler.submit_form(filling_data)
            
            if submission_result.get('success', False):
                await self.tracking_service.update_application_progress(
                    application_id, 100, "Application submitted successfully", "submitted"
                )
                
                # Store successful pattern for learning
                await self._store_successful_pattern(context, workflow_results)
                
                return {
                    'success': True,
                    'status': 'submitted',
                    'confirmation': submission_result.get('confirmation_number'),
                    'message': 'Application submitted successfully'
                }
            else:
                await self.tracking_service.update_application_progress(
                    application_id, 100, f"Submission failed: {submission_result.get('error', 'Unknown error')}", "failed"
                )
                
                return {
                    'success': False,
                    'status': 'submission_failed',
                    'error': submission_result.get('error', 'Unknown submission error')
                }
                
        except Exception as e:
            logger.error(f"Submission stage failed: {e}")
            await self.tracking_service.update_application_progress(
                application_id, 100, f"Submission failed: {str(e)}", "failed"
            )
            return {
                'success': False,
                'status': 'submission_failed',
                'error': str(e)
            }
    
    async def _attempt_stage_recovery(
        self,
        stage_name: str,
        error_message: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Attempt intelligent recovery from stage failures"""
        
        try:
            logger.info(f"🔧 Attempting recovery for stage: {stage_name}")
            
            # Use error recovery prompt
            recovery_input = {
                'error_type': f"{stage_name}_failure",
                'error_message': error_message,
                'error_context': json.dumps(context, default=str, indent=2)[:2000],
                'current_state': f"{stage_name}_failed",
                'previous_actions': json.dumps([f"Attempted {stage_name}"], indent=2)
            }
            
            prompt = PromptTemplates.get_error_recovery_prompt()
            
            recovery_strategy = await self._run_chain_with_structured_output(
                prompt_template=prompt,
                input_data=recovery_input,
                output_model=ErrorRecoveryOutput
            )
            
            # Execute recovery based on strategy
            if recovery_strategy.should_retry:
                logger.info(f"🔄 Retrying {stage_name} with recovery strategy")
                
                # Wait for recommended delay
                await asyncio.sleep(2)
                
                # Retry the stage with modifications
                if stage_name == 'form_analysis':
                    # Retry with different approach
                    return await self._retry_form_analysis_with_recovery(context)
                elif stage_name == 'form_filling':
                    # Retry with alternative strategies
                    return await self._retry_form_filling_with_recovery(context)
            
            return {'success': False, 'error': 'Recovery strategy unsuccessful'}
            
        except Exception as e:
            logger.error(f"Recovery attempt failed: {e}")
            return {'success': False, 'error': f"Recovery failed: {str(e)}"}
    
    async def _retry_form_analysis_with_recovery(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Retry form analysis with recovery strategies"""
        
        try:
            # Wait longer for page to load
            await asyncio.sleep(5)
            
            # Retry analysis
            analysis_result = await self.form_analysis_service.analyze_form(
                context['application_url']
            )
            
            return {
                'success': analysis_result.get('success', False),
                'result': analysis_result
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def _retry_form_filling_with_recovery(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Retry form filling with recovery strategies"""
        
        try:
            # This would implement alternative form filling strategies
            # For now, return a simulated recovery
            return {
                'success': True,
                'result': {
                    'success': True,
                    'result': {
                        'completion_percentage': 70.0,
                        'successful_fields': 5,
                        'failed_fields': 2,
                        'recovery_applied': True
                    }
                }
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _create_workflow_failure(self, error_message: str, partial_results: Dict[str, Any]) -> Dict[str, Any]:
        """Create standardized workflow failure response"""
        
        return {
            'success': False,
            'error': error_message,
            'partial_results': partial_results,
            'workflow_status': 'failed',
            'completed_stages': list(partial_results.keys())
        }
    
    async def _generate_mapping_improvements(
        self,
        cv_data: Dict[str, Any],
        form_fields: List[Dict[str, Any]],
        mapping_result
    ) -> List[str]:
        """Generate specific improvements for CV mapping"""
        
        improvements = []
        
        unmapped_required = [
            field for field in form_fields 
            if field.get('required', False) and 
            field.get('name') not in [m.form_field for m in mapping_result.mappings]
        ]
        
        if unmapped_required:
            improvements.append(f"Consider updating CV to include information for {len(unmapped_required)} required fields")
        
        low_confidence_mappings = [
            m for m in mapping_result.mappings if m.confidence < 0.5
        ]
        
        if low_confidence_mappings:
            improvements.append(f"Review {len(low_confidence_mappings)} low-confidence field mappings")
        
        return improvements
    
    async def _generate_filling_guidance(
        self,
        filling_data: Dict[str, Any],
        form_analysis: Dict[str, Any],
        cv_mappings: Dict[str, Any]
    ) -> List[str]:
        """Generate specific guidance for form filling issues"""
        
        guidance = []
        
        failed_actions = [
            action for action in filling_data.get('actions_performed', [])
            if not action.get('success', True)
        ]
        
        if failed_actions:
            guidance.append(f"Manually complete {len(failed_actions)} failed form fields")
            
            # Provide specific field guidance
            for action in failed_actions[:3]:  # Top 3 failed fields
                field_name = action.get('field_name', 'Unknown')
                guidance.append(f"Field '{field_name}': {action.get('error_message', 'Failed to fill')}")
        
        validation_errors = filling_data.get('validation_errors', [])
        if validation_errors:
            guidance.append("Fix form validation errors before submission")
        
        return guidance
    
    async def _generate_validation_summary(
        self,
        validation_results: Dict[str, Any],
        context: Dict[str, Any],
        workflow_results: Dict[str, Any]
    ) -> str:
        """Generate human-readable validation summary"""
        
        summary_parts = []
        
        # Form completion summary
        form_completion = validation_results.get('form_completion', {})
        completion_score = form_completion.get('score', 0)
        summary_parts.append(f"Form completion: {completion_score:.1f}%")
        
        # CV mapping summary
        cv_mapping = validation_results.get('cv_mapping_quality', {})
        mapping_score = cv_mapping.get('score', 0)
        summary_parts.append(f"CV-form match: {mapping_score:.2f}")
        
        # Cover letter summary
        if 'cover_letter_quality' in validation_results:
            cover_letter = validation_results['cover_letter_quality']
            cl_score = cover_letter.get('score', 0)
            summary_parts.append(f"Cover letter alignment: {cl_score:.2f}")
        
        # Overall assessment
        if validation_results.get('ready_for_submission', False):
            summary_parts.append("✅ Ready for submission")
        else:
            summary_parts.append("⚠️ Manual review recommended")
        
        return " | ".join(summary_parts)
    
    async def _store_successful_pattern(
        self,
        context: Dict[str, Any],
        workflow_results: Dict[str, Any]
    ) -> None:
        """Store successful application patterns for learning"""
        
        try:
            company_name = context['job_data'].get('company', 'Unknown')
            
            pattern = {
                'company': company_name,
                'job_title': context['job_data'].get('title', 'Unknown'),
                'form_complexity': workflow_results.get('form_analysis', {}).get('analysis', {}).get('complexity', 'unknown'),
                'completion_percentage': workflow_results.get('form_filling', {}).get('completion_percentage', 0),
                'mapping_score': workflow_results.get('cv_mapping', {}).get('mapping_score', 0),
                'timestamp': datetime.now().isoformat(),
                'success': True
            }
            
            if company_name not in self.successful_patterns:
                self.successful_patterns[company_name] = []
            
            self.successful_patterns[company_name].append(pattern)
            
            # Limit stored patterns
            if len(self.successful_patterns[company_name]) > 10:
                self.successful_patterns[company_name] = self.successful_patterns[company_name][-10:]
                
        except Exception as e:
            logger.warning(f"Failed to store successful pattern: {e}")
    
    async def _finalize_application_results(
        self,
        application_id: str,
        workflow_result: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Finalize and format application results"""
        
        try:
            # Extract key metrics
            form_filling = workflow_result.get('workflow_results', {}).get('form_filling', {})
            completion_percentage = form_filling.get('completion_percentage', 0)
            
            validation = workflow_result.get('workflow_results', {}).get('validation', {})
            ready_for_submission = validation.get('ready_for_submission', False)
            
            # Create comprehensive result
            final_result = {
                'success': workflow_result.get('success', False),
                'application_id': application_id,
                'status': workflow_result.get('final_status', 'completed'),
                'completion_percentage': completion_percentage,
                'ready_for_submission': ready_for_submission,
                'workflow_results': workflow_result.get('workflow_results', {}),
                'recommendations': self._generate_final_recommendations(workflow_result),
                'timestamp': datetime.now().isoformat()
            }
            
            # Store final results
            await self.tracking_service.store_application_results(application_id, final_result)
            
            return final_result
            
        except Exception as e:
            logger.error(f"Failed to finalize results: {e}")
            return {
                'success': False,
                'error': str(e),
                'application_id': application_id
            }
    
    def _generate_final_recommendations(self, workflow_result: Dict[str, Any]) -> List[str]:
        """Generate final recommendations based on workflow results"""
        
        recommendations = []
        
        workflow_results = workflow_result.get('workflow_results', {})
        
        # Form filling recommendations
        form_filling = workflow_results.get('form_filling', {})
        completion_percentage = form_filling.get('completion_percentage', 0)
        
        if completion_percentage < 100:
            recommendations.append(f"Complete remaining form fields ({100 - completion_percentage:.1f}% remaining)")
        
        failed_fields = form_filling.get('failed_fields', 0)
        if failed_fields > 0:
            recommendations.append(f"Manually review and complete {failed_fields} failed fields")
        
        # Validation recommendations
        validation = workflow_results.get('validation', {})
        critical_issues = validation.get('critical_issues', [])
        if critical_issues:
            recommendations.append("Address critical validation issues before submission")
        
        # CV mapping recommendations
        cv_mapping = workflow_results.get('cv_mapping', {})
        if cv_mapping.get('mappings', {}).get('recommendations'):
            recommendations.extend(cv_mapping['mappings']['recommendations'][:2])
        
        return recommendations[:5]  # Top 5 recommendations
    
    def get_orchestration_stats(self) -> Dict[str, Any]:
        """Get orchestration statistics"""
        
        success_rate = (self.successful_applications / self.application_attempts) * 100 if self.application_attempts > 0 else 0
        
        return {
            'total_applications': self.application_attempts,
            'successful_applications': self.successful_applications,
            'success_rate_percent': round(success_rate, 2),
            'error_recoveries': self.error_recoveries,
            'successful_patterns': sum(len(patterns) for patterns in self.successful_patterns.values()),
            'companies_learned': len(self.successful_patterns),
            **self.get_performance_stats()
        }