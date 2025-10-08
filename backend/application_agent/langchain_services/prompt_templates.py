"""
Standardized Prompt Templates for LangChain Agents

This module provides consistent, optimized prompts for all AI agents
in the application automation system.
"""

from langchain.prompts import PromptTemplate, ChatPromptTemplate
from langchain.prompts.few_shot import FewShotPromptTemplate


class PromptTemplates:
    """Collection of standardized prompt templates"""

    # Form Analysis Prompts
    FORM_ANALYSIS_SYSTEM = """You are an expert web form analyst specialized in job application forms. 
Your job is to analyze HTML content and extract detailed information about form structure, fields, and complexity.

You must provide structured, accurate analysis with confidence scores for each element identified."""

    FORM_ANALYSIS_HUMAN = """Analyze this job application form HTML and provide detailed analysis:

HTML Content:
{html_content}

Form Elements Found:
{form_elements}

URL: {url}
Total Fields Detected: {total_fields}

You MUST respond with a valid JSON object that matches this exact format. Do not include any additional text, explanations, or markdown formatting. Only return the JSON:

{format_instructions}

If no form is present in the HTML, return:
{{
  "form_type": "no_form_detected",
  "complexity": "simple",
  "estimated_time_minutes": 0,
  "fields": [],
  "multi_step": false,
  "file_uploads_required": [],
  "captcha_present": false,
  "special_requirements": ["No form elements detected"],
  "confidence": 1.0
}}

Be thorough and accurate in your field detection and classification. Return ONLY valid JSON."""

    # CV Field Mapping Prompts
    CV_MAPPING_SYSTEM = """You are an expert at mapping CV/resume data to job application form fields. 
Your expertise includes understanding semantic relationships between CV content and form requirements.

You must create accurate, confident mappings while identifying gaps and providing recommendations."""

    CV_MAPPING_HUMAN = """Map the provided CV data to the job application form fields:

FORM FIELDS:
{form_fields}

CV DATA:
{cv_data}

JOB CONTEXT:
Title: {job_title}
Company: {company_name}
Description: {job_description}

You MUST respond with a valid JSON object that matches this exact format. Do not include any additional text, explanations, or markdown formatting. Only return the JSON:

{format_instructions}

If no mappings can be created, return:
{{
  "mappings": [],
  "unmapped_fields": [],
  "missing_cv_data": [],
  "overall_match_score": 0.0,
  "recommendations": ["No mappings could be created"]
}}

Focus on accuracy and provide fallback options where appropriate. Return ONLY valid JSON."""

    # Form Filling Strategy Prompts
    FORM_FILLING_SYSTEM = """You are an expert web automation strategist specializing in intelligent form filling.
Your role is to create step-by-step strategies for filling job application forms accurately and efficiently.

Consider form complexity, field dependencies, validation requirements, and error recovery."""

    FORM_FILLING_HUMAN = """Create a form filling strategy for this job application:

FORM ANALYSIS:
{form_analysis}

FIELD MAPPINGS:
{field_mappings}

CURRENT FORM STATE:
{current_state}

Provide a detailed strategy including:
1. Optimal field filling order
2. Validation checkpoints
3. Error recovery procedures
4. Screenshot points for verification
5. Submission readiness criteria
6. Risk assessment and mitigation

Consider multi-step forms, dependent fields, and potential validation issues."""

    # Cover Letter Generation Prompts
    COVER_LETTER_SYSTEM = """You are an expert career counselor and professional writer specializing in personalized cover letters.
Your expertise includes understanding job requirements, company culture, and crafting compelling narratives.

Write engaging, authentic cover letters that showcase relevant experience and genuine interest."""

    COVER_LETTER_HUMAN = """Write a personalized cover letter for this job application:

JOB DETAILS:
Title: {job_title}
Company: {company_name}
Description: {job_description}
Requirements: {job_requirements}

CANDIDATE PROFILE:
{cv_data}

USER INSTRUCTIONS:
{cover_letter_prompt}

COMPANY RESEARCH:
{company_info}

Create a compelling cover letter that:
1. Opens with a strong, personalized hook
2. Demonstrates clear understanding of the role and company
3. Highlights most relevant experience and achievements
4. Shows genuine enthusiasm and cultural fit
5. Includes a confident closing with clear next steps
6. Maintains professional yet engaging tone
7. Stays within 250-400 words

Focus on quality over quantity and ensure authenticity."""

    # Job Analysis Prompts
    JOB_ANALYSIS_SYSTEM = """You are an expert job market analyst and recruiter with deep understanding of job requirements,
company needs, and candidate-role fit assessment.

Extract and analyze key job information to guide application strategy."""

    JOB_ANALYSIS_HUMAN = """Analyze this job posting for application optimization:

JOB POSTING:
Title: {job_title}
Company: {company_name}
Description: {job_description}
Requirements: {requirements}

COMPANY CONTEXT:
{company_info}

Provide comprehensive analysis including:
1. Core job requirements (must-haves vs nice-to-haves)
2. Key skills and experience needed
3. Company culture and values alignment
4. Role seniority and career level
5. Industry context and trends
6. Application strategy recommendations
7. Red flags or special considerations

Focus on actionable insights for tailoring the application."""

    # Error Recovery Prompts
    ERROR_RECOVERY_SYSTEM = """You are an expert troubleshooter specializing in web automation and form filling errors.
Your expertise includes diagnosing issues, suggesting solutions, and implementing recovery strategies.

Provide practical, actionable recovery recommendations with confidence assessments."""

    ERROR_RECOVERY_HUMAN = """Analyze this error and provide recovery strategy:

ERROR DETAILS:
Type: {error_type}
Message: {error_message}
Context: {error_context}

CURRENT STATE:
{current_state}

PREVIOUS ACTIONS:
{previous_actions}

Provide recovery analysis including:
1. Root cause analysis
2. Immediate recovery actions
3. Alternative approaches
4. Success probability estimates
5. Prevention strategies for future
6. Escalation criteria

Focus on practical solutions with clear success indicators."""

    # Quality Assessment Prompts
    QUALITY_ASSESSMENT_SYSTEM = """You are an expert content reviewer specializing in job application materials.
Your expertise includes evaluating cover letters, form responses, and overall application quality.

Provide constructive, actionable feedback with specific improvement suggestions."""

    QUALITY_ASSESSMENT_HUMAN = """Assess the quality of this job application content:

CONTENT TYPE: {content_type}
CONTENT: {content}

JOB CONTEXT:
{job_context}

EVALUATION CRITERIA:
{criteria}

Provide detailed quality assessment including:
1. Overall quality score and reasoning
2. Strengths and positive elements
3. Areas for improvement with specific suggestions
4. Grammar and language quality
5. Relevance to job requirements
6. Professional tone and presentation
7. Personalization and authenticity

Be constructive and provide actionable recommendations."""

    @classmethod
    def get_form_analysis_prompt(cls) -> ChatPromptTemplate:
        """Get form analysis prompt template"""
        return ChatPromptTemplate.from_messages([
            ("system", cls.FORM_ANALYSIS_SYSTEM),
            ("human", cls.FORM_ANALYSIS_HUMAN)
        ])

    @classmethod
    def get_cv_mapping_prompt(cls) -> ChatPromptTemplate:
        """Get CV mapping prompt template"""
        return ChatPromptTemplate.from_messages([
            ("system", cls.CV_MAPPING_SYSTEM),
            ("human", cls.CV_MAPPING_HUMAN)
        ])

    @classmethod
    def get_form_filling_prompt(cls) -> ChatPromptTemplate:
        """Get form filling strategy prompt template"""
        return ChatPromptTemplate.from_messages([
            ("system", cls.FORM_FILLING_SYSTEM),
            ("human", cls.FORM_FILLING_HUMAN)
        ])

    @classmethod
    def get_cover_letter_prompt(cls) -> ChatPromptTemplate:
        """Get cover letter generation prompt template"""
        return ChatPromptTemplate.from_messages([
            ("system", cls.COVER_LETTER_SYSTEM),
            ("human", cls.COVER_LETTER_HUMAN)
        ])

    @classmethod
    def get_job_analysis_prompt(cls) -> ChatPromptTemplate:
        """Get job analysis prompt template"""
        return ChatPromptTemplate.from_messages([
            ("system", cls.JOB_ANALYSIS_SYSTEM),
            ("human", cls.JOB_ANALYSIS_HUMAN)
        ])

    @classmethod
    def get_error_recovery_prompt(cls) -> ChatPromptTemplate:
        """Get error recovery prompt template"""
        return ChatPromptTemplate.from_messages([
            ("system", cls.ERROR_RECOVERY_SYSTEM),
            ("human", cls.ERROR_RECOVERY_HUMAN)
        ])

    @classmethod
    def get_quality_assessment_prompt(cls) -> ChatPromptTemplate:
        """Get quality assessment prompt template"""
        return ChatPromptTemplate.from_messages([
            ("system", cls.QUALITY_ASSESSMENT_SYSTEM),
            ("human", cls.QUALITY_ASSESSMENT_HUMAN)
        ])