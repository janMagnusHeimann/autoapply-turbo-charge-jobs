"""
Enhanced CV Selection Service - LangChain-powered CV processing and intelligent field mapping

This service provides advanced AI-powered CV analysis, data extraction, and intelligent
mapping to job application form fields using semantic similarity and structured outputs.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Tuple
import json
import re
from datetime import datetime

from sentence_transformers import SentenceTransformer, util

from supabase import Client
from .langchain_services.base_service import BaseLangChainService
from .langchain_services.prompt_templates import PromptTemplates
from .langchain_services.structured_outputs import CVMappingOutput, CVFieldMapping

logger = logging.getLogger(__name__)


class EnhancedCVSelectionService(BaseLangChainService[CVMappingOutput]):
    """
    Enhanced CV selection and mapping service using LangChain and semantic similarity
    
    Features:
    - Intelligent CV data extraction with structured outputs
    - Semantic field mapping using embeddings
    - Multi-format CV processing (PDF, Word, Text)
    - Vector similarity search for optimal field matching
    - Advanced data validation and transformation
    - Caching for improved performance
    """
    
    def __init__(self, supabase_client: Client, openai_api_key: str):
        super().__init__(
            openai_api_key=openai_api_key,
            model_name="gpt-4",
            temperature=0.1,
            max_retries=3
        )
        
        self.supabase_client = supabase_client
        
        # Initialize local sentence transformer for fast similarity
        try:
            self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            logger.warning(f"Failed to load sentence transformer: {e}")
            self.sentence_model = None
        
        # Field mapping cache and patterns
        self.field_mapping_cache = {}
        self.semantic_patterns = {}
        
        # Performance tracking
        self.mapping_count = 0
        self.cache_hits = 0
        
        # Initialize common field patterns
        self._initialize_field_patterns()
        
        logger.info("Enhanced CV Selection Service initialized with semantic mapping")
    
    def _initialize_field_patterns(self):
        """Initialize common field mapping patterns"""
        self.semantic_patterns = {
            # Personal Information
            'email': ['email', 'e-mail', 'email address', 'contact email'],
            'phone': ['phone', 'telephone', 'mobile', 'cell', 'phone number', 'contact number'],
            'first_name': ['first name', 'given name', 'forename', 'firstname'],
            'last_name': ['last name', 'surname', 'family name', 'lastname'],
            'full_name': ['full name', 'name', 'your name', 'applicant name'],
            'address': ['address', 'street address', 'home address', 'location'],
            'city': ['city', 'town', 'location', 'municipality'],
            'state': ['state', 'province', 'region', 'county'],
            'zip': ['zip', 'postal code', 'postcode', 'zip code'],
            'linkedin': ['linkedin', 'linkedin profile', 'linkedin url'],
            'portfolio': ['portfolio', 'website', 'personal website', 'portfolio url'],
            
            # Professional Information
            'current_position': ['current position', 'current role', 'job title', 'position'],
            'company': ['company', 'employer', 'current employer', 'organization'],
            'experience_years': ['years of experience', 'experience', 'years experience', 'total experience'],
            'salary_expectation': ['salary', 'expected salary', 'salary expectation', 'compensation'],
            'availability': ['availability', 'start date', 'available from', 'notice period'],
            
            # Education
            'degree': ['degree', 'education', 'qualification', 'diploma'],
            'university': ['university', 'college', 'school', 'institution'],
            'graduation_year': ['graduation year', 'year graduated', 'completion year'],
            'gpa': ['gpa', 'grade point average', 'cgpa', 'grades'],
            
            # Skills and Preferences
            'skills': ['skills', 'technical skills', 'competencies', 'expertise'],
            'certifications': ['certifications', 'certificates', 'credentials'],
            'languages': ['languages', 'language skills', 'spoken languages'],
            
            # Application Specific
            'cover_letter': ['cover letter', 'motivation letter', 'personal statement'],
            'references': ['references', 'referees', 'reference contacts'],
            'additional_info': ['additional information', 'other information', 'comments']
        }
    
    async def get_generated_cv(self, cv_id: str) -> Dict[str, Any]:
        """
        Get and process generated CV data with enhanced structure
        
        Args:
            cv_id: ID of the generated CV
            
        Returns:
            Structured CV data ready for field mapping
        """
        try:
            logger.info(f"📄 Getting generated CV: {cv_id}")
            
            # Get CV data from database
            response = self.supabase_client.table('cv_generations').select('*').eq('id', cv_id).execute()
            
            if not response.data:
                raise ValueError(f"Generated CV not found: {cv_id}")
            
            cv_record = response.data[0]
            
            # Enhanced CV data processing with LangChain
            structured_data = await self._process_cv_data_with_langchain(
                cv_record.get('cv_data', {}),
                'generated'
            )
            
            # Add metadata
            structured_data.update({
                'cv_id': cv_id,
                'cv_type': 'generated',
                'job_id': cv_record.get('job_id'),
                'created_at': cv_record.get('created_at'),
                'file_path': cv_record.get('pdf_url'),
                'file_url': cv_record.get('pdf_url')
            })
            
            logger.info(f"✅ Generated CV processed successfully: {cv_id}")
            return structured_data
            
        except Exception as e:
            logger.error(f"❌ Failed to get generated CV {cv_id}: {e}")
            raise
    
    async def get_uploaded_cv(self, cv_path: str) -> Dict[str, Any]:
        """
        Get and process uploaded CV data with enhanced extraction
        
        Args:
            cv_path: Path to uploaded CV file
            
        Returns:
            Structured CV data ready for field mapping
        """
        try:
            logger.info(f"📄 Getting uploaded CV: {cv_path}")
            
            # Get CV data from database
            response = self.supabase_client.table('uploaded_cvs').select('*').eq('file_path', cv_path).execute()
            
            if not response.data:
                raise ValueError(f"Uploaded CV not found: {cv_path}")
            
            cv_record = response.data[0]
            
            # Extract and process CV content
            cv_content = await self._extract_cv_content(cv_record)
            
            # Enhanced CV data processing with LangChain
            structured_data = await self._process_cv_data_with_langchain(cv_content, 'uploaded')
            
            # Add metadata
            structured_data.update({
                'cv_id': cv_record['id'],
                'cv_type': 'uploaded',
                'filename': cv_record.get('filename'),
                'created_at': cv_record.get('created_at'),
                'file_path': cv_path,
                'file_url': cv_record.get('file_url')
            })
            
            logger.info(f"✅ Uploaded CV processed successfully: {cv_path}")
            return structured_data
            
        except Exception as e:
            logger.error(f"❌ Failed to get uploaded CV {cv_path}: {e}")
            raise
    
    async def _extract_cv_content(self, cv_record: Dict[str, Any]) -> Dict[str, Any]:
        """Extract content from uploaded CV file"""
        
        file_path = cv_record.get('file_path')
        content_type = cv_record.get('content_type', '')
        
        try:
            if 'pdf' in content_type:
                return await self._extract_pdf_content(file_path)
            elif 'word' in content_type or 'docx' in content_type:
                return await self._extract_word_content(file_path)
            elif 'text' in content_type:
                return await self._extract_text_content(file_path)
            else:
                # Try to extract from stored content if available
                return cv_record.get('extracted_content', {})
                
        except Exception as e:
            logger.error(f"Content extraction failed: {e}")
            return {'raw_text': '', 'error': str(e)}
    
    async def _extract_pdf_content(self, file_path: str) -> Dict[str, Any]:
        """Extract content from PDF file"""
        import PyPDF2
        import pdfplumber
        
        try:
            # Try pdfplumber first (better for forms)
            with pdfplumber.open(file_path) as pdf:
                text = ''
                for page in pdf.pages:
                    text += page.extract_text() + '\n'
            
            if text.strip():
                return {'raw_text': text.strip(), 'extraction_method': 'pdfplumber'}
            
            # Fallback to PyPDF2
            with open(file_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                text = ''
                for page in reader.pages:
                    text += page.extract_text() + '\n'
            
            return {'raw_text': text.strip(), 'extraction_method': 'pypdf2'}
            
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            return {'raw_text': '', 'error': str(e)}
    
    async def _extract_word_content(self, file_path: str) -> Dict[str, Any]:
        """Extract content from Word document"""
        try:
            from docx import Document
            
            doc = Document(file_path)
            text = ''
            for paragraph in doc.paragraphs:
                text += paragraph.text + '\n'
            
            return {'raw_text': text.strip(), 'extraction_method': 'python-docx'}
            
        except Exception as e:
            logger.error(f"Word extraction failed: {e}")
            return {'raw_text': '', 'error': str(e)}
    
    async def _extract_text_content(self, file_path: str) -> Dict[str, Any]:
        """Extract content from text file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                text = file.read()
            
            return {'raw_text': text.strip(), 'extraction_method': 'text'}
            
        except Exception as e:
            logger.error(f"Text extraction failed: {e}")
            return {'raw_text': '', 'error': str(e)}
    
    async def _process_cv_data_with_langchain(self, cv_data: Dict[str, Any], cv_type: str) -> Dict[str, Any]:
        """
        Process CV data using LangChain for structured extraction
        """
        try:
            # If it's raw text from uploaded file, structure it first
            if 'raw_text' in cv_data:
                structured_data = await self._structure_raw_cv_text(cv_data['raw_text'])
            else:
                # Already structured (generated CV)
                structured_data = cv_data
            
            # Enhance and validate the structured data
            enhanced_data = await self._enhance_cv_structure(structured_data)
            
            return enhanced_data
            
        except Exception as e:
            logger.error(f"CV data processing failed: {e}")
            # Return minimal structure
            return {
                'personal': {},
                'experience': [],
                'education': [],
                'skills': [],
                'error': str(e)
            }
    
    async def _structure_raw_cv_text(self, raw_text: str) -> Dict[str, Any]:
        """Structure raw CV text using LangChain"""
        
        # Create a prompt for CV structuring
        structure_prompt = """
        Extract and structure the following CV/resume text into organized sections:
        
        CV Text:
        {cv_text}
        
        Extract the following information into a structured format:
        1. Personal Information (name, email, phone, address, linkedin, etc.)
        2. Professional Experience (company, position, dates, responsibilities)
        3. Education (degree, institution, dates, GPA if mentioned)
        4. Skills (technical skills, soft skills, tools, languages)
        5. Additional Information (certifications, projects, awards, etc.)
        
        Return as structured JSON with clear sections and fields.
        """
        
        try:
            result = await self._run_chain_with_json_output(
                prompt_template=structure_prompt,
                input_data={'cv_text': raw_text[:8000]}  # Limit for token constraints
            )
            
            return result if isinstance(result, dict) else {}
            
        except Exception as e:
            logger.error(f"CV structuring failed: {e}")
            return {'raw_text': raw_text}
    
    async def _enhance_cv_structure(self, cv_data: Dict[str, Any]) -> Dict[str, Any]:
        """Enhance CV structure with additional processing"""
        
        enhanced = {
            'personal': self._extract_personal_info(cv_data),
            'experience': self._extract_experience(cv_data),
            'education': self._extract_education(cv_data),
            'skills': self._extract_skills(cv_data),
            'additional': self._extract_additional_info(cv_data)
        }
        
        return enhanced
    
    def _extract_personal_info(self, cv_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and standardize personal information"""
        
        personal = cv_data.get('personal', {})
        if not personal:
            # Try to extract from other common keys
            personal = cv_data.get('personal_info', {})
            personal.update(cv_data.get('contact', {}))
        
        # Standardize field names
        standardized = {
            'full_name': personal.get('name') or personal.get('full_name', ''),
            'email': personal.get('email', ''),
            'phone': personal.get('phone', ''),
            'location': personal.get('address') or personal.get('location', ''),
            'linkedin_url': personal.get('linkedin') or personal.get('linkedin_url', ''),
            'github_url': personal.get('github') or personal.get('github_url', ''),
            'portfolio_url': personal.get('website') or personal.get('portfolio_url', ''),
            'professional_summary': personal.get('summary') or personal.get('professional_summary', '')
        }
        
        # Extract first and last name
        full_name = standardized['full_name']
        if full_name:
            name_parts = full_name.strip().split()
            if len(name_parts) >= 2:
                standardized['first_name'] = name_parts[0]
                standardized['last_name'] = name_parts[-1]
            elif len(name_parts) == 1:
                standardized['first_name'] = name_parts[0]
                standardized['last_name'] = ''
        
        return standardized
    
    def _extract_experience(self, cv_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract and standardize work experience"""
        
        experience_data = cv_data.get('experience', [])
        if not experience_data:
            experience_data = cv_data.get('work_experience', [])
            if not experience_data:
                experience_data = cv_data.get('employment', [])
        
        standardized_exp = []
        for exp in experience_data:
            if isinstance(exp, dict):
                standardized_exp.append({
                    'company': exp.get('company', ''),
                    'position': exp.get('position') or exp.get('title', ''),
                    'start_date': exp.get('start_date') or exp.get('from', ''),
                    'end_date': exp.get('end_date') or exp.get('to', ''),
                    'current': exp.get('current', False),
                    'description': exp.get('description') or exp.get('responsibilities', ''),
                    'achievements': exp.get('achievements', [])
                })
        
        return standardized_exp
    
    def _extract_education(self, cv_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract and standardize education"""
        
        education_data = cv_data.get('education', [])
        
        standardized_edu = []
        for edu in education_data:
            if isinstance(edu, dict):
                standardized_edu.append({
                    'degree': edu.get('degree', ''),
                    'institution': edu.get('institution') or edu.get('school', ''),
                    'start_date': edu.get('start_date', ''),
                    'end_date': edu.get('end_date', ''),
                    'gpa': edu.get('gpa', ''),
                    'major': edu.get('major') or edu.get('field_of_study', '')
                })
        
        return standardized_edu
    
    def _extract_skills(self, cv_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and categorize skills"""
        
        skills_data = cv_data.get('skills', [])
        if isinstance(skills_data, dict):
            return skills_data
        
        # If it's a list, categorize
        if isinstance(skills_data, list):
            return {
                'technical': skills_data,
                'all': skills_data
            }
        
        return {'technical': [], 'all': []}
    
    def _extract_additional_info(self, cv_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract additional information"""
        
        return {
            'certifications': cv_data.get('certifications', []),
            'languages': cv_data.get('languages', []),
            'projects': cv_data.get('projects', []),
            'awards': cv_data.get('awards', []),
            'publications': cv_data.get('publications', [])
        }
    
    async def map_cv_to_form_fields(
        self,
        cv_data: Dict[str, Any],
        form_fields: List[Dict[str, Any]],
        job_context: Dict[str, Any] = None
    ) -> CVMappingOutput:
        """
        Map CV data to form fields using semantic similarity and LangChain
        
        Args:
            cv_data: Structured CV data
            form_fields: List of form fields from analysis
            job_context: Optional job context for better mapping
            
        Returns:
            Structured mapping output with confidence scores
        """
        try:
            logger.info(f"🎯 Mapping CV to {len(form_fields)} form fields")
            self.mapping_count += 1
            
            # Check cache first
            mapping_signature = self._generate_mapping_signature(cv_data, form_fields)
            cached_mapping = self._check_mapping_cache(mapping_signature)
            
            if cached_mapping:
                logger.info("📋 Using cached field mapping")
                self.cache_hits += 1
                return CVMappingOutput.parse_obj(cached_mapping)
            
            # Perform semantic mapping
            mappings = await self._perform_semantic_mapping(cv_data, form_fields, job_context)
            
            # Create mapping output
            mapping_output = CVMappingOutput(
                mappings=mappings,
                unmapped_fields=self._find_unmapped_fields(form_fields, mappings),
                missing_cv_data=self._find_missing_cv_data(form_fields, cv_data),
                overall_match_score=self._calculate_overall_match_score(mappings),
                recommendations=self._generate_mapping_recommendations(mappings, cv_data, form_fields)
            )
            
            # Cache the result
            self._cache_mapping(mapping_signature, mapping_output.dict())
            
            logger.info(f"✅ CV mapping completed with {len(mappings)} field mappings")
            return mapping_output
            
        except Exception as e:
            logger.error(f"❌ CV mapping failed: {e}")
            # Return minimal mapping
            return CVMappingOutput(
                mappings=[],
                unmapped_fields=[f['name'] for f in form_fields],
                missing_cv_data=[],
                overall_match_score=0.0,
                recommendations=[f"Mapping failed: {str(e)}"]
            )
    
    async def _perform_semantic_mapping(
        self,
        cv_data: Dict[str, Any],
        form_fields: List[Dict[str, Any]],
        job_context: Dict[str, Any] = None
    ) -> List[CVFieldMapping]:
        """Perform semantic mapping between CV data and form fields"""
        
        mappings = []
        
        # Extract all available CV values with paths
        cv_values = self._extract_cv_values_with_paths(cv_data)
        
        for field in form_fields:
            field_name = field.get('name', '')
            field_label = field.get('label', '')
            field_type = field.get('type', 'text')
            
            if not field_name:
                continue
            
            # Find best matching CV value
            best_match = await self._find_best_cv_match(
                field_name, field_label, field_type, cv_values, job_context
            )
            
            if best_match and best_match['confidence'] > 0.3:  # Minimum confidence threshold
                mappings.append(CVFieldMapping(
                    form_field=field_name,
                    cv_data_path=best_match['cv_path'],
                    mapped_value=str(best_match['value']),
                    confidence=best_match['confidence'],
                    transformation_applied=best_match.get('transformation')
                ))
        
        return mappings
    
    def _extract_cv_values_with_paths(self, cv_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract all CV values with their data paths"""
        values = []
        
        def extract_recursive(data, path_prefix=''):
            if isinstance(data, dict):
                for key, value in data.items():
                    current_path = f"{path_prefix}.{key}" if path_prefix else key
                    if isinstance(value, (str, int, float)) and value:
                        values.append({
                            'path': current_path,
                            'key': key,
                            'value': value,
                            'type': type(value).__name__
                        })
                    elif isinstance(value, (dict, list)):
                        extract_recursive(value, current_path)
            elif isinstance(data, list):
                for i, item in enumerate(data):
                    current_path = f"{path_prefix}[{i}]" if path_prefix else f"[{i}]"
                    extract_recursive(item, current_path)
        
        extract_recursive(cv_data)
        return values
    
    async def _find_best_cv_match(
        self,
        field_name: str,
        field_label: str,
        field_type: str,
        cv_values: List[Dict[str, Any]],
        job_context: Dict[str, Any] = None
    ) -> Optional[Dict[str, Any]]:
        """Find the best CV value match for a form field"""
        
        # Create field description for matching
        field_desc = f"{field_name} {field_label}".lower().strip()
        
        best_match = None
        best_score = 0.0
        
        for cv_value in cv_values:
            # Calculate semantic similarity
            similarity_score = await self._calculate_semantic_similarity(
                field_desc, cv_value['key'], cv_value['path']
            )
            
            # Apply type-based scoring
            type_score = self._calculate_type_compatibility(field_type, cv_value['type'], cv_value['value'])
            
            # Combine scores
            combined_score = (similarity_score * 0.7) + (type_score * 0.3)
            
            if combined_score > best_score:
                best_score = combined_score
                best_match = {
                    'cv_path': cv_value['path'],
                    'value': cv_value['value'],
                    'confidence': combined_score,
                    'transformation': self._determine_transformation(field_type, cv_value['value'])
                }
        
        return best_match
    
    async def _calculate_semantic_similarity(
        self,
        field_desc: str,
        cv_key: str,
        cv_path: str
    ) -> float:
        """Calculate semantic similarity between field and CV data"""
        
        # Use predefined patterns first
        for pattern_key, patterns in self.semantic_patterns.items():
            if any(pattern in field_desc for pattern in patterns):
                if pattern_key in cv_key.lower() or pattern_key in cv_path.lower():
                    return 0.9  # High confidence for pattern match
        
        # Use sentence transformer for semantic similarity
        if self.sentence_model:
            try:
                field_embedding = self.sentence_model.encode([field_desc])
                cv_embedding = self.sentence_model.encode([f"{cv_key} {cv_path}"])
                
                similarity = util.pytorch_cos_sim(field_embedding, cv_embedding).item()
                return max(0.0, similarity)
            except:
                pass
        
        # Fallback to simple string matching
        field_tokens = set(field_desc.lower().split())
        cv_tokens = set((cv_key + " " + cv_path).lower().split())
        
        if not field_tokens or not cv_tokens:
            return 0.0
        
        intersection = len(field_tokens.intersection(cv_tokens))
        union = len(field_tokens.union(cv_tokens))
        
        return intersection / union if union > 0 else 0.0
    
    def _calculate_type_compatibility(self, field_type: str, cv_type: str, cv_value: Any) -> float:
        """Calculate compatibility between field type and CV value type"""
        
        # Email field compatibility
        if field_type == 'email':
            if '@' in str(cv_value):
                return 1.0
            return 0.0
        
        # Phone field compatibility
        if field_type in ['tel', 'phone']:
            phone_pattern = re.compile(r'[\d\s\-\+\(\)]{7,}')
            if phone_pattern.match(str(cv_value)):
                return 0.9
            return 0.2
        
        # Date field compatibility
        if field_type == 'date':
            date_patterns = [
                r'\d{4}-\d{2}-\d{2}',
                r'\d{2}/\d{2}/\d{4}',
                r'\d{4}',
                r'[A-Za-z]+ \d{4}'
            ]
            for pattern in date_patterns:
                if re.search(pattern, str(cv_value)):
                    return 0.8
            return 0.1
        
        # URL field compatibility
        if field_type == 'url':
            if 'http' in str(cv_value).lower() or 'www.' in str(cv_value).lower():
                return 1.0
            return 0.3
        
        # Number field compatibility
        if field_type in ['number', 'range']:
            try:
                float(cv_value)
                return 1.0
            except:
                return 0.0
        
        # Text field compatibility (default)
        return 0.5
    
    def _determine_transformation(self, field_type: str, value: Any) -> Optional[str]:
        """Determine if any transformation is needed for the value"""
        
        if field_type == 'date':
            # Date transformation might be needed
            if isinstance(value, str) and len(value) == 4 and value.isdigit():
                return 'year_to_date'
        
        if field_type == 'phone':
            # Phone formatting
            if isinstance(value, str) and len(value) > 10:
                return 'phone_format'
        
        return None
    
    def _find_unmapped_fields(self, form_fields: List[Dict[str, Any]], mappings: List[CVFieldMapping]) -> List[str]:
        """Find form fields that weren't mapped"""
        mapped_fields = {mapping.form_field for mapping in mappings}
        all_fields = {field.get('name', '') for field in form_fields if field.get('name')}
        return list(all_fields - mapped_fields)
    
    def _find_missing_cv_data(self, form_fields: List[Dict[str, Any]], cv_data: Dict[str, Any]) -> List[str]:
        """Find required form fields that have no corresponding CV data"""
        required_fields = [
            field.get('name', '') for field in form_fields 
            if field.get('required', False) and field.get('name')
        ]
        
        missing = []
        for field_name in required_fields:
            # Check if we have any relevant CV data
            if not self._has_relevant_cv_data(field_name, cv_data):
                missing.append(field_name)
        
        return missing
    
    def _has_relevant_cv_data(self, field_name: str, cv_data: Dict[str, Any]) -> bool:
        """Check if CV has data relevant to the field"""
        field_lower = field_name.lower()
        
        # Check in common CV sections
        sections_to_check = ['personal', 'experience', 'education', 'skills']
        
        for section_name in sections_to_check:
            section = cv_data.get(section_name, {})
            if isinstance(section, dict):
                if any(field_lower in key.lower() for key in section.keys()):
                    return True
        
        return False
    
    def _calculate_overall_match_score(self, mappings: List[CVFieldMapping]) -> float:
        """Calculate overall match score"""
        if not mappings:
            return 0.0
        
        total_confidence = sum(mapping.confidence for mapping in mappings)
        return total_confidence / len(mappings)
    
    def _generate_mapping_recommendations(
        self,
        mappings: List[CVFieldMapping],
        cv_data: Dict[str, Any],
        form_fields: List[Dict[str, Any]]
    ) -> List[str]:
        """Generate recommendations for improving mapping"""
        recommendations = []
        
        low_confidence_count = sum(1 for mapping in mappings if mapping.confidence < 0.5)
        if low_confidence_count > 0:
            recommendations.append(f"Review {low_confidence_count} low-confidence field mappings")
        
        unmapped_required = [
            field for field in form_fields 
            if field.get('required', False) and field.get('name') not in [m.form_field for m in mappings]
        ]
        if unmapped_required:
            recommendations.append(f"Manually fill {len(unmapped_required)} required unmapped fields")
        
        if len(mappings) < len(form_fields) * 0.5:
            recommendations.append("Consider updating CV with more comprehensive information")
        
        return recommendations
    
    def _generate_mapping_signature(self, cv_data: Dict[str, Any], form_fields: List[Dict[str, Any]]) -> str:
        """Generate signature for mapping cache"""
        cv_values = self._extract_cv_values_with_paths(cv_data)
        cv_keys = sorted([item['path'] for item in cv_values])  # Fix: Extract paths and sort them
        form_names = sorted([f.get('name', '') for f in form_fields])
        combined = str(cv_keys) + str(form_names)
        return str(hash(combined))
    
    def _check_mapping_cache(self, signature: str) -> Optional[Dict[str, Any]]:
        """Check mapping cache"""
        if signature in self.field_mapping_cache:
            cached_data = self.field_mapping_cache[signature]
            cache_age = datetime.now() - cached_data['timestamp']
            if cache_age.total_seconds() < 3600:  # 1 hour cache
                return cached_data['mapping']
        return None
    
    def _cache_mapping(self, signature: str, mapping: Dict[str, Any]) -> None:
        """Cache mapping result"""
        self.field_mapping_cache[signature] = {
            'mapping': mapping,
            'timestamp': datetime.now()
        }
        
        # Limit cache size
        if len(self.field_mapping_cache) > 50:
            oldest_key = min(
                self.field_mapping_cache.keys(),
                key=lambda k: self.field_mapping_cache[k]['timestamp']
            )
            del self.field_mapping_cache[oldest_key]
    
    async def list_user_cvs(self, user_id: str) -> List[Dict[str, Any]]:
        """
        List all CVs (generated and uploaded) for a user with enhanced metadata
        """
        try:
            logger.info(f"🔍 Listing CVs for user: {user_id}")
            
            # Get generated CVs
            generated_response = self.supabase_client.table('cv_generations').select(
                'id, job_id, cv_data, pdf_url, created_at'
            ).eq('user_id', user_id).execute()
            
            # Get uploaded CVs
            uploaded_response = self.supabase_client.table('uploaded_cvs').select(
                'id, filename, file_path, file_url, content_type, created_at'
            ).eq('user_id', user_id).execute()
            
            cvs = []
            
            # Process generated CVs
            for cv in generated_response.data:
                cvs.append({
                    'id': cv['id'],
                    'type': 'generated',
                    'title': f"Generated CV (Job {cv.get('job_id', 'Unknown')})",
                    'filename': f"generated_cv_{cv['id']}.pdf",
                    'file_path': cv.get('pdf_url'),
                    'file_url': cv.get('pdf_url'),
                    'created_at': cv.get('created_at'),
                    'job_id': cv.get('job_id')
                })
            
            # Process uploaded CVs
            for cv in uploaded_response.data:
                cvs.append({
                    'id': cv['id'],
                    'type': 'uploaded',
                    'title': cv.get('filename', 'Uploaded CV'),
                    'filename': cv.get('filename'),
                    'file_path': cv.get('file_path'),
                    'file_url': cv.get('file_url'),
                    'created_at': cv.get('created_at'),
                    'content_type': cv.get('content_type')
                })
            
            # Sort by creation date (newest first)
            cvs.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            
            logger.info(f"✅ Found {len(cvs)} CVs for user {user_id}")
            return cvs
            
        except Exception as e:
            logger.error(f"❌ Failed to list CVs for user {user_id}: {e}")
            return []
    
    async def store_uploaded_cv(
        self,
        user_id: str,
        filename: str,
        content: bytes,
        content_type: str
    ) -> Dict[str, Any]:
        """
        Store uploaded CV with enhanced processing
        """
        try:
            logger.info(f"📁 Storing uploaded CV for user {user_id}: {filename}")
            
            # Generate unique filename
            timestamp = datetime.now().isoformat().replace(':', '-')
            safe_filename = re.sub(r'[^a-zA-Z0-9.-]', '_', filename)
            unique_filename = f"{user_id}_{timestamp}_{safe_filename}"
            
            # Save file (this would typically be to cloud storage)
            file_path = f"/uploads/{unique_filename}"
            
            # TODO: Save to actual storage (S3, GCS, etc.)
            # For now, we'll simulate this
            
            # Store metadata in database
            cv_data = {
                'user_id': user_id,
                'filename': filename,
                'file_path': file_path,
                'content_type': content_type,
                'file_size': len(content),
                'created_at': datetime.now().isoformat()
            }
            
            response = self.supabase_client.table('uploaded_cvs').insert(cv_data).execute()
            
            if response.data:
                stored_cv = response.data[0]
                logger.info(f"✅ CV stored successfully: {stored_cv['id']}")
                return stored_cv
            else:
                raise Exception("Failed to store CV data")
                
        except Exception as e:
            logger.error(f"❌ Failed to store uploaded CV: {e}")
            raise
    
    def get_mapping_stats(self) -> Dict[str, Any]:
        """Get mapping statistics"""
        cache_hit_rate = (self.cache_hits / self.mapping_count) * 100 if self.mapping_count > 0 else 0
        
        return {
            'total_mappings': self.mapping_count,
            'cache_hits': self.cache_hits,
            'cache_hit_rate_percent': round(cache_hit_rate, 2),
            'cached_mappings': len(self.field_mapping_cache),
            'semantic_patterns': len(self.semantic_patterns),
            **self.get_performance_stats()
        }