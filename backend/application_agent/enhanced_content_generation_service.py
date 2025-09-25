"""
Enhanced Content Generation Service - LangChain-powered cover letter and content generation

This service provides advanced AI-powered content generation including personalized
cover letters, job analysis, and quality assurance with multi-agent architecture.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional
import json
import re
from datetime import datetime

from .langchain_services.base_service import BaseLangChainService
from .langchain_services.prompt_templates import PromptTemplates
from .langchain_services.structured_outputs import (
    CoverLetterOutput, JobAnalysis, QualityAssessment
)

logger = logging.getLogger(__name__)


class EnhancedContentGenerationService(BaseLangChainService[CoverLetterOutput]):
    """
    Enhanced content generation service using LangChain multi-agent architecture
    
    Features:
    - Deep job analysis and requirement extraction
    - Personalized cover letter generation with multiple strategies
    - Company research integration and culture matching
    - Multi-round content improvement with quality assurance
    - Tone and style adaptation based on company/role
    - A/B testing framework for content optimization
    """
    
    def __init__(self, openai_api_key: str):
        super().__init__(
            openai_api_key=openai_api_key,
            model_name="gpt-4",
            temperature=0.7,  # Higher temperature for creative writing
            max_retries=3
        )
        
        # Content generation cache and patterns
        self.company_research_cache = {}
        self.writing_patterns = {}
        
        # Performance tracking
        self.generation_count = 0
        self.quality_improvements = 0
        
        # Initialize writing patterns and styles
        self._initialize_writing_patterns()
        
        logger.info("Enhanced Content Generation Service initialized with multi-agent architecture")
    
    def _initialize_writing_patterns(self):
        """Initialize writing patterns and style templates"""
        
        self.writing_patterns = {
            # Industry-specific patterns
            'technology': {
                'keywords': ['innovative', 'scalable', 'cutting-edge', 'agile', 'data-driven'],
                'tone': 'professional_enthusiastic',
                'focus': 'technical_achievements'
            },
            'finance': {
                'keywords': ['analytical', 'strategic', 'risk management', 'compliance', 'ROI'],
                'tone': 'professional_conservative',
                'focus': 'quantified_results'
            },
            'healthcare': {
                'keywords': ['patient-focused', 'regulatory', 'quality improvement', 'collaborative'],
                'tone': 'professional_caring',
                'focus': 'impact_on_people'
            },
            'startup': {
                'keywords': ['entrepreneurial', 'fast-paced', 'adaptable', 'growth-minded'],
                'tone': 'energetic_professional',
                'focus': 'versatility'
            },
            'nonprofit': {
                'keywords': ['mission-driven', 'community-focused', 'impact-oriented', 'collaborative'],
                'tone': 'passionate_professional',
                'focus': 'social_impact'
            }
        }
    
    async def generate_job_specific_cover_letter(
        self,
        cv_data: Dict[str, Any],
        job_data: Dict[str, Any],
        user_instructions: Optional[str] = None,
        company_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate a personalized cover letter using multi-agent approach
        
        Args:
            cv_data: Structured CV data
            job_data: Job posting information
            user_instructions: Custom instructions from user
            company_info: Additional company research data
            
        Returns:
            Dictionary containing cover letter and metadata
        """
        try:
            logger.info(f"📝 Generating cover letter for {job_data.get('company', 'Unknown')} - {job_data.get('title', 'Unknown')}")
            self.generation_count += 1
            
            # Step 1: Comprehensive job analysis
            job_analysis = await self._analyze_job_requirements(job_data, company_info)
            
            # Step 2: Company research and culture analysis
            company_analysis = await self._analyze_company_culture(job_data, company_info)
            
            # Step 3: CV-Job alignment analysis
            alignment_analysis = await self._analyze_cv_job_alignment(cv_data, job_analysis)
            
            # Step 4: Generate initial cover letter
            initial_cover_letter = await self._generate_initial_cover_letter(
                cv_data, job_analysis, company_analysis, alignment_analysis, user_instructions
            )
            
            # Step 5: Quality assessment and improvement
            improved_cover_letter = await self._improve_cover_letter_quality(
                initial_cover_letter, job_analysis, cv_data
            )
            
            # Step 6: Final validation and formatting
            final_result = await self._finalize_cover_letter(
                improved_cover_letter, job_data, cv_data
            )
            
            logger.info(f"✅ Cover letter generated successfully - {final_result.word_count} words")
            return {
                'success': True,
                'cover_letter': final_result.dict(),
                'job_analysis': job_analysis.dict(),
                'company_analysis': company_analysis,
                'alignment_score': alignment_analysis.get('overall_score', 0.0)
            }
            
        except Exception as e:
            logger.error(f"❌ Cover letter generation failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'cover_letter': self._create_fallback_cover_letter(cv_data, job_data).dict()
            }
    
    async def _analyze_job_requirements(
        self,
        job_data: Dict[str, Any],
        company_info: Optional[Dict[str, Any]] = None
    ) -> JobAnalysis:
        """Analyze job requirements using AI to extract key insights"""
        
        # Prepare job analysis input
        job_description = job_data.get('description', '')
        job_title = job_data.get('title', '')
        company_name = job_data.get('company', '')
        requirements = job_data.get('requirements', [])
        
        # Convert requirements list to string if needed
        if isinstance(requirements, list):
            requirements = '\n'.join(requirements)
        
        input_data = {
            'job_title': job_title,
            'company_name': company_name,
            'job_description': job_description[:4000],  # Limit for token constraints
            'requirements': requirements[:2000],
            'company_info': json.dumps(company_info or {}, indent=2)[:1000]
        }
        
        # Use job analysis prompt
        prompt = PromptTemplates.get_job_analysis_prompt()
        
        # Generate analysis
        analysis = await self._run_chain_with_structured_output(
            prompt_template=prompt,
            input_data=input_data,
            output_model=JobAnalysis,
            use_memory=False
        )
        
        return analysis
    
    async def _analyze_company_culture(
        self,
        job_data: Dict[str, Any],
        company_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Analyze company culture and values for tone matching"""
        
        company_name = job_data.get('company', '')
        
        # Check cache first
        if company_name in self.company_research_cache:
            cached_data = self.company_research_cache[company_name]
            cache_age = datetime.now() - cached_data['timestamp']
            if cache_age.total_seconds() < 86400:  # 24 hours cache
                return cached_data['analysis']
        
        try:
            # Analyze company culture from available information
            company_description = ''
            if company_info:
                company_description = company_info.get('description', '')
            
            # If no company info, try to infer from job posting
            job_description = job_data.get('description', '')
            
            # Extract culture indicators
            culture_analysis = await self._extract_company_culture_indicators(
                company_name, company_description, job_description
            )
            
            # Cache the analysis
            self.company_research_cache[company_name] = {
                'analysis': culture_analysis,
                'timestamp': datetime.now()
            }
            
            return culture_analysis
            
        except Exception as e:
            logger.warning(f"Company culture analysis failed: {e}")
            return {
                'culture_type': 'professional',
                'values': ['professionalism', 'quality', 'teamwork'],
                'tone_preference': 'professional_neutral',
                'industry': 'general'
            }
    
    async def _extract_company_culture_indicators(
        self,
        company_name: str,
        company_description: str,
        job_description: str
    ) -> Dict[str, Any]:
        """Extract company culture indicators using AI analysis"""
        
        # Create culture analysis prompt
        culture_prompt = """
        Analyze the company culture and values based on the available information:
        
        Company: {company_name}
        Company Description: {company_description}
        Job Posting Context: {job_description}
        
        Extract and analyze:
        1. Company culture type (startup, corporate, creative, traditional, etc.)
        2. Core values and principles
        3. Communication style and tone preferences
        4. Industry context and norms
        5. Work environment indicators
        6. Innovation vs stability orientation
        
        Provide insights that would help tailor a cover letter tone and content approach.
        Return as structured JSON with culture indicators.
        """
        
        input_data = {
            'company_name': company_name,
            'company_description': company_description[:2000],
            'job_description': job_description[:3000]
        }
        
        try:
            result = await self._run_chain_with_json_output(
                prompt_template=culture_prompt,
                input_data=input_data
            )
            
            # Standardize the result
            return {
                'culture_type': result.get('culture_type', 'professional'),
                'values': result.get('values', []),
                'tone_preference': result.get('tone_preference', 'professional_neutral'),
                'industry': result.get('industry', 'general'),
                'innovation_focus': result.get('innovation_focus', 'balanced'),
                'formality_level': result.get('formality_level', 'medium')
            }
            
        except Exception as e:
            logger.error(f"Culture analysis failed: {e}")
            return {
                'culture_type': 'professional',
                'values': ['professionalism', 'quality'],
                'tone_preference': 'professional_neutral',
                'industry': 'general'
            }
    
    async def _analyze_cv_job_alignment(
        self,
        cv_data: Dict[str, Any],
        job_analysis: JobAnalysis
    ) -> Dict[str, Any]:
        """Analyze alignment between CV and job requirements"""
        
        try:
            # Extract CV highlights
            cv_skills = cv_data.get('skills', {}).get('technical', [])
            cv_experience = cv_data.get('experience', [])
            cv_education = cv_data.get('education', [])
            
            # Calculate skill alignment
            job_requirements = job_analysis.key_requirements + job_analysis.preferred_qualifications
            skill_matches = []
            
            for skill in cv_skills:
                if any(skill.lower() in req.lower() for req in job_requirements):
                    skill_matches.append(skill)
            
            # Calculate experience alignment
            relevant_experience = []
            for exp in cv_experience:
                exp_description = exp.get('description', '') + ' ' + exp.get('position', '')
                if any(keyword in exp_description.lower() for keyword in [
                    word.lower() for req in job_requirements for word in req.split()[:3]
                ]):
                    relevant_experience.append(exp)
            
            # Calculate overall alignment score
            skill_score = len(skill_matches) / max(len(cv_skills), 1)
            experience_score = len(relevant_experience) / max(len(cv_experience), 1)
            overall_score = (skill_score + experience_score) / 2
            
            return {
                'overall_score': min(overall_score, 1.0),
                'skill_matches': skill_matches,
                'relevant_experience': relevant_experience,
                'alignment_strengths': self._identify_alignment_strengths(
                    cv_data, job_analysis
                ),
                'experience_years': len(cv_experience),
                'education_match': self._check_education_match(cv_education, job_analysis)
            }
            
        except Exception as e:
            logger.error(f"CV-Job alignment analysis failed: {e}")
            return {
                'overall_score': 0.5,
                'skill_matches': [],
                'relevant_experience': [],
                'alignment_strengths': [],
                'experience_years': 0,
                'education_match': False
            }
    
    def _identify_alignment_strengths(
        self,
        cv_data: Dict[str, Any],
        job_analysis: JobAnalysis
    ) -> List[str]:
        """Identify key alignment strengths to highlight"""
        
        strengths = []
        
        # Check for direct skill matches
        cv_skills = cv_data.get('skills', {}).get('technical', [])
        for requirement in job_analysis.key_requirements:
            if any(skill.lower() in requirement.lower() for skill in cv_skills):
                strengths.append(f"Strong technical background in {requirement}")
        
        # Check for industry experience
        cv_experience = cv_data.get('experience', [])
        if cv_experience and job_analysis.industry:
            for exp in cv_experience:
                if job_analysis.industry.lower() in exp.get('description', '').lower():
                    strengths.append(f"Relevant {job_analysis.industry} industry experience")
                    break
        
        # Check for leadership experience
        leadership_keywords = ['lead', 'manage', 'director', 'senior', 'head']
        for exp in cv_experience:
            position = exp.get('position', '').lower()
            if any(keyword in position for keyword in leadership_keywords):
                strengths.append("Leadership and management experience")
                break
        
        return strengths[:3]  # Top 3 strengths
    
    def _check_education_match(
        self,
        cv_education: List[Dict[str, Any]],
        job_analysis: JobAnalysis
    ) -> bool:
        """Check if education matches job requirements"""
        
        if not cv_education:
            return False
        
        # Check for degree level match
        education_keywords = ['bachelor', 'master', 'phd', 'degree']
        requirements_text = ' '.join(job_analysis.key_requirements).lower()
        
        for edu in cv_education:
            degree = edu.get('degree', '').lower()
            if any(keyword in degree for keyword in education_keywords):
                if any(keyword in requirements_text for keyword in education_keywords):
                    return True
        
        return False
    
    async def _generate_initial_cover_letter(
        self,
        cv_data: Dict[str, Any],
        job_analysis: JobAnalysis,
        company_analysis: Dict[str, Any],
        alignment_analysis: Dict[str, Any],
        user_instructions: Optional[str] = None
    ) -> CoverLetterOutput:
        """Generate initial cover letter using comprehensive analysis"""
        
        # Prepare generation input
        personal = cv_data.get('personal', {})
        
        input_data = {
            'job_title': job_analysis.role_focus,
            'company_name': job_analysis.company_culture,
            'job_description': ' '.join(job_analysis.key_requirements),
            'job_requirements': ' '.join(job_analysis.preferred_qualifications),
            'cv_data': json.dumps({
                'name': personal.get('full_name', ''),
                'experience': cv_data.get('experience', [])[:3],  # Top 3 experiences
                'skills': cv_data.get('skills', {}).get('technical', [])[:10],  # Top 10 skills
                'education': cv_data.get('education', [])[:2]  # Top 2 education entries
            }, indent=2),
            'cover_letter_prompt': user_instructions or 'Create a compelling, personalized cover letter',
            'company_info': json.dumps(company_analysis, indent=2),
            'alignment_strengths': json.dumps(alignment_analysis.get('alignment_strengths', []))
        }
        
        # Use cover letter generation prompt
        prompt = PromptTemplates.get_cover_letter_prompt()
        
        # Generate cover letter
        cover_letter = await self._run_chain_with_structured_output(
            prompt_template=prompt,
            input_data=input_data,
            output_model=CoverLetterOutput,
            use_memory=True  # Use memory for consistency
        )
        
        # Enhance with calculated metrics
        cover_letter.word_count = len(cover_letter.content.split())
        cover_letter.personalization_score = min(alignment_analysis.get('overall_score', 0.5) + 0.2, 1.0)
        cover_letter.job_alignment_score = alignment_analysis.get('overall_score', 0.5)
        
        return cover_letter
    
    async def _improve_cover_letter_quality(
        self,
        initial_cover_letter: CoverLetterOutput,
        job_analysis: JobAnalysis,
        cv_data: Dict[str, Any]
    ) -> CoverLetterOutput:
        """Improve cover letter quality using AI feedback and iteration"""
        
        try:
            # Step 1: Quality assessment
            quality_assessment = await self._assess_content_quality(
                initial_cover_letter, job_analysis, cv_data
            )
            
            # Step 2: Generate improvements if needed
            if quality_assessment.overall_score < 0.8:
                improved_content = await self._generate_improved_content(
                    initial_cover_letter, quality_assessment, job_analysis
                )
                
                # Update cover letter with improvements
                initial_cover_letter.content = improved_content
                initial_cover_letter.improvement_suggestions = quality_assessment.improvement_areas
                self.quality_improvements += 1
            
            return initial_cover_letter
            
        except Exception as e:
            logger.error(f"Quality improvement failed: {e}")
            return initial_cover_letter
    
    async def _assess_content_quality(
        self,
        cover_letter: CoverLetterOutput,
        job_analysis: JobAnalysis,
        cv_data: Dict[str, Any]
    ) -> QualityAssessment:
        """Assess cover letter quality using AI evaluation"""
        
        input_data = {
            'content_type': 'cover_letter',
            'content': cover_letter.content,
            'job_context': json.dumps({
                'title': job_analysis.role_focus,
                'requirements': job_analysis.key_requirements,
                'industry': job_analysis.industry
            }, indent=2),
            'criteria': json.dumps([
                'grammar_and_language',
                'relevance_to_job',
                'personalization_level',
                'professional_tone',
                'compelling_narrative',
                'appropriate_length'
            ])
        }
        
        # Use quality assessment prompt
        prompt = PromptTemplates.get_quality_assessment_prompt()
        
        # Generate assessment
        assessment = await self._run_chain_with_structured_output(
            prompt_template=prompt,
            input_data=input_data,
            output_model=QualityAssessment,
            use_memory=False
        )
        
        return assessment
    
    async def _generate_improved_content(
        self,
        original_cover_letter: CoverLetterOutput,
        quality_assessment: QualityAssessment,
        job_analysis: JobAnalysis
    ) -> str:
        """Generate improved content based on quality feedback"""
        
        improvement_prompt = """
        Improve this cover letter based on the quality assessment feedback:
        
        Original Cover Letter:
        {original_content}
        
        Quality Assessment:
        - Overall Score: {overall_score}/1.0
        - Grammar Score: {grammar_score}/1.0
        - Relevance Score: {relevance_score}/1.0
        - Personalization Score: {personalization_score}/1.0
        
        Improvement Areas:
        {improvement_areas}
        
        Strengths to Maintain:
        {strengths}
        
        Job Context:
        {job_context}
        
        Generate an improved version that addresses the improvement areas while maintaining the strengths.
        Keep the same general structure but enhance clarity, relevance, and impact.
        Maintain professional tone and appropriate length (250-400 words).
        """
        
        input_data = {
            'original_content': original_cover_letter.content,
            'overall_score': quality_assessment.overall_score,
            'grammar_score': quality_assessment.grammar_score,
            'relevance_score': quality_assessment.relevance_score,
            'personalization_score': quality_assessment.personalization_score,
            'improvement_areas': '\n'.join(quality_assessment.improvement_areas),
            'strengths': '\n'.join(quality_assessment.strengths),
            'job_context': json.dumps({
                'role': job_analysis.role_focus,
                'industry': job_analysis.industry,
                'key_requirements': job_analysis.key_requirements[:3]
            }, indent=2)
        }
        
        try:
            result = await self._run_chain_with_json_output(
                prompt_template=improvement_prompt,
                input_data=input_data
            )
            
            # Extract improved content
            if isinstance(result, dict) and 'improved_content' in result:
                return result['improved_content']
            elif isinstance(result, str):
                return result
            else:
                return original_cover_letter.content
                
        except Exception as e:
            logger.error(f"Content improvement failed: {e}")
            return original_cover_letter.content
    
    async def _finalize_cover_letter(
        self,
        cover_letter: CoverLetterOutput,
        job_data: Dict[str, Any],
        cv_data: Dict[str, Any]
    ) -> CoverLetterOutput:
        """Finalize cover letter with formatting and final validation"""
        
        try:
            # Ensure proper formatting
            content = cover_letter.content.strip()
            
            # Add proper greeting if missing
            if not content.startswith('Dear'):
                company_name = job_data.get('company', 'Hiring Manager')
                content = f"Dear {company_name} Team,\n\n{content}"
            
            # Add proper closing if missing
            if not any(closing in content.lower() for closing in ['sincerely', 'best regards', 'regards']):
                personal_name = cv_data.get('personal', {}).get('full_name', 'Applicant')
                content += f"\n\nSincerely,\n{personal_name}"
            
            # Update content
            cover_letter.content = content
            cover_letter.word_count = len(content.split())
            
            # Validate length
            if cover_letter.word_count < 150:
                cover_letter.improvement_suggestions.append("Cover letter may be too short - consider adding more specific examples")
            elif cover_letter.word_count > 500:
                cover_letter.improvement_suggestions.append("Cover letter may be too long - consider condensing for better impact")
            
            return cover_letter
            
        except Exception as e:
            logger.error(f"Cover letter finalization failed: {e}")
            return cover_letter
    
    def _create_fallback_cover_letter(
        self,
        cv_data: Dict[str, Any],
        job_data: Dict[str, Any]
    ) -> CoverLetterOutput:
        """Create a basic fallback cover letter"""
        
        personal = cv_data.get('personal', {})
        name = personal.get('full_name', 'Applicant')
        company = job_data.get('company', 'your organization')
        title = job_data.get('title', 'this position')
        
        fallback_content = f"""Dear {company} Team,

I am writing to express my strong interest in the {title} position at {company}. Based on my background and experience, I believe I would be a valuable addition to your team.

My professional experience has equipped me with the skills and knowledge necessary to excel in this role. I am particularly drawn to {company}'s commitment to excellence and would welcome the opportunity to contribute to your continued success.

I have attached my resume for your review and would appreciate the opportunity to discuss how my experience aligns with your needs. Thank you for considering my application.

Sincerely,
{name}"""
        
        return CoverLetterOutput(
            content=fallback_content,
            word_count=len(fallback_content.split()),
            tone="professional",
            key_points_covered=["interest in position", "relevant experience", "company appreciation"],
            personalization_score=0.3,
            job_alignment_score=0.3,
            improvement_suggestions=["Generated as fallback - consider regenerating with proper job analysis"]
        )
    
    async def generate_follow_up_email(
        self,
        application_data: Dict[str, Any],
        days_since_application: int = 7
    ) -> Dict[str, Any]:
        """Generate follow-up email for job application"""
        
        try:
            follow_up_prompt = """
            Generate a professional follow-up email for a job application:
            
            Application Details:
            - Company: {company}
            - Position: {position}
            - Days since application: {days_since}
            - Application date: {application_date}
            
            Create a polite, professional follow-up email that:
            1. Reiterates interest in the position
            2. Briefly reminds them of your qualifications
            3. Asks about the status of the application
            4. Maintains enthusiasm without being pushy
            5. Provides clear next steps
            
            Keep it concise (under 150 words) and professional.
            """
            
            input_data = {
                'company': application_data.get('company_name', 'the company'),
                'position': application_data.get('job_title', 'the position'),
                'days_since': days_since_application,
                'application_date': application_data.get('application_date', 'recently')
            }
            
            result = await self._run_chain_with_json_output(
                prompt_template=follow_up_prompt,
                input_data=input_data
            )
            
            return {
                'success': True,
                'follow_up_email': result.get('email_content', ''),
                'subject_line': result.get('subject_line', f"Following up on {input_data['position']} application"),
                'recommended_timing': f"Send {days_since_application} days after application"
            }
            
        except Exception as e:
            logger.error(f"Follow-up email generation failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def generate_interview_preparation(
        self,
        job_data: Dict[str, Any],
        cv_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate interview preparation materials"""
        
        try:
            prep_prompt = """
            Generate comprehensive interview preparation materials:
            
            Job Details:
            {job_data}
            
            Candidate Background:
            {cv_summary}
            
            Generate:
            1. Likely interview questions (10-15 questions)
            2. Suggested answers framework for top 5 questions
            3. Questions to ask the interviewer (5-7 questions)
            4. Key strengths to highlight
            5. Potential weaknesses and how to address them
            6. Company research talking points
            
            Focus on practical, actionable advice.
            """
            
            # Prepare CV summary
            personal = cv_data.get('personal', {})
            cv_summary = {
                'experience_years': len(cv_data.get('experience', [])),
                'key_skills': cv_data.get('skills', {}).get('technical', [])[:5],
                'education': [edu.get('degree', '') for edu in cv_data.get('education', [])][:2],
                'current_role': cv_data.get('experience', [{}])[0].get('position', '') if cv_data.get('experience') else ''
            }
            
            input_data = {
                'job_data': json.dumps(job_data, indent=2),
                'cv_summary': json.dumps(cv_summary, indent=2)
            }
            
            result = await self._run_chain_with_json_output(
                prompt_template=prep_prompt,
                input_data=input_data
            )
            
            return {
                'success': True,
                'interview_prep': result
            }
            
        except Exception as e:
            logger.error(f"Interview preparation generation failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_generation_stats(self) -> Dict[str, Any]:
        """Get content generation statistics"""
        
        improvement_rate = (self.quality_improvements / self.generation_count) * 100 if self.generation_count > 0 else 0
        
        return {
            'total_generations': self.generation_count,
            'quality_improvements': self.quality_improvements,
            'improvement_rate_percent': round(improvement_rate, 2),
            'cached_companies': len(self.company_research_cache),
            'writing_patterns': len(self.writing_patterns),
            **self.get_performance_stats()
        }