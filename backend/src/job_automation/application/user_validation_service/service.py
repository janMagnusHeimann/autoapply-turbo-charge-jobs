"""
User Validation Service
Application service for validating user profiles before job applications
"""

import logging
from typing import Dict, List, Any

from ...core.models import (
    UserProfile, UserPreferences, ProfileValidationResult, 
    UserProfileValidationRequest, APIResponse, ValidationStatus
)
from ...infrastructure.clients.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)


class UserValidationService:
    """Service for validating user profiles and readiness for job applications"""
    
    def __init__(self, supabase_client: SupabaseClient):
        self.supabase_client = supabase_client

    async def validate_user_profile(self, request: UserProfileValidationRequest) -> APIResponse:
        """
        Validate user profile completeness and readiness for job applications
        
        This method checks:
        1. Required profile fields
        2. Job preferences
        3. CV assets (experience, education, etc.)
        4. GitHub/Scholar integrations
        """
        try:
            logger.info(f"Validating user profile: {request.user_id}")
            
            # Fetch user data
            user_profile = await self.supabase_client.get_user_profile(request.user_id)
            user_preferences = await self.supabase_client.get_user_preferences(request.user_id)
            cv_assets = await self.supabase_client.get_user_cv_assets(request.user_id)
            
            # Perform validation
            validation_result = self._perform_validation(user_profile, user_preferences, cv_assets)
            
            # Generate user-friendly prompt based on validation
            user_prompt = self._generate_user_prompt(validation_result)
            
            return APIResponse(
                success=True,
                message="User profile validation completed",
                data={
                    "validation_result": validation_result.dict(),
                    "user_prompt": user_prompt,
                    "can_proceed": validation_result.is_valid,
                    "completion_score": validation_result.completion_score
                }
            )
            
        except Exception as e:
            logger.error(f"Error validating user profile {request.user_id}: {e}")
            return APIResponse(
                success=False,
                message="User profile validation failed",
                error=str(e)
            )

    def _perform_validation(
        self, 
        user_profile: UserProfile | None, 
        user_preferences: UserPreferences | None, 
        cv_assets: List[Dict[str, Any]]
    ) -> ProfileValidationResult:
        """Perform the actual validation logic"""
        
        missing_fields = []
        warnings = []
        recommendations = []
        completion_score = 0
        
        # Required fields for basic functionality
        required_profile_fields = ['email', 'full_name']
        required_preference_fields = ['preferred_locations', 'preferred_job_types', 'skills']
        
        total_required_fields = len(required_profile_fields) + len(required_preference_fields) + 2  # +2 for experience and education
        
        # Validate required profile fields
        if not user_profile:
            missing_fields.append('User profile not found')
            warnings.append('Please complete your basic profile information')
        else:
            for field in required_profile_fields:
                value = getattr(user_profile, field, None)
                if not value or (isinstance(value, str) and value.strip() == ''):
                    missing_fields.append(f'Profile: {field}')
                else:
                    completion_score += (1 / total_required_fields) * 40  # 40% weight for required fields

        # Validate required preferences
        if not user_preferences:
            missing_fields.append('User preferences not found')
            warnings.append('Please set up your job preferences')
        else:
            for field in required_preference_fields:
                value = getattr(user_preferences, field, None)
                if not value or (isinstance(value, list) and len(value) == 0):
                    missing_fields.append(f'Preferences: {field}')
                else:
                    completion_score += (1 / total_required_fields) * 40  # 40% weight for required fields

        # Validate CV assets
        asset_counts = self._count_cv_assets(cv_assets)
        
        if asset_counts['experience'] < 1:
            missing_fields.append('At least 1 work experience entry required')
        else:
            completion_score += (1 / total_required_fields) * 20  # 20% weight for CV assets

        if asset_counts['education'] < 1:
            missing_fields.append('At least 1 education entry required')
        else:
            completion_score += (1 / total_required_fields) * 20

        # Add recommendations for optional but beneficial fields
        self._add_recommendations(user_profile, user_preferences, asset_counts, recommendations)

        # Add warnings for missing recommended fields
        self._add_warnings(user_profile, user_preferences, asset_counts, warnings)

        # Calculate final completion score
        completion_score = min(round(completion_score), 100)

        # Add bonus points for recommended fields
        bonus_score = self._calculate_bonus_score(user_profile, user_preferences, asset_counts)
        completion_score = min(completion_score + bonus_score, 100)

        is_valid = len(missing_fields) == 0

        return ProfileValidationResult(
            is_valid=is_valid,
            missing_fields=missing_fields,
            warnings=warnings,
            recommendations=recommendations,
            completion_score=completion_score
        )

    def _count_cv_assets(self, cv_assets: List[Dict[str, Any]]) -> Dict[str, int]:
        """Count CV assets by type"""
        counts = {
            'experience': 0,
            'education': 0,
            'repositories': 0,
            'publications': 0,
            'other': 0
        }

        for asset in cv_assets:
            asset_type = asset.get('asset_type', '')
            if asset_type in counts:
                counts[asset_type] += 1

        return counts

    def _add_recommendations(
        self,
        user_profile: UserProfile | None,
        user_preferences: UserPreferences | None,
        asset_counts: Dict[str, int],
        recommendations: List[str]
    ):
        """Add recommendations for improving profile"""
        
        # GitHub integration recommendation
        if not user_profile or not user_profile.github_username:
            recommendations.append('Connect your GitHub account to showcase your code repositories')

        # Google Scholar recommendation
        if not user_profile or not user_profile.scholar_url:
            if asset_counts['publications'] == 0:
                recommendations.append('Connect Google Scholar to import your academic publications')

        # Skills recommendation
        if not user_preferences or not user_preferences.skills or len(user_preferences.skills) < 3:
            recommendations.append('Add more skills to improve job matching accuracy')

        # Salary range recommendation
        if not user_preferences or not user_preferences.min_salary or not user_preferences.max_salary:
            recommendations.append('Set salary expectations for better job filtering')

        # Industry preferences
        if not user_preferences or not user_preferences.preferred_industries or len(user_preferences.preferred_industries) == 0:
            recommendations.append('Select preferred industries to focus job search')

        # Repository recommendations
        if asset_counts['repositories'] < 3:
            recommendations.append(f'Add more GitHub repositories (current: {asset_counts["repositories"]}, recommended: 3+)')

    def _add_warnings(
        self,
        user_profile: UserProfile | None,
        user_preferences: UserPreferences | None,
        asset_counts: Dict[str, int],
        warnings: List[str]
    ):
        """Add warnings for missing recommended fields"""
        
        # Experience warnings
        if asset_counts['experience'] == 0:
            warnings.append('No work experience added. This may limit job matching quality.')

        # Education warnings
        if asset_counts['education'] == 0:
            warnings.append('No education background added. Consider adding your degrees.')

        # Skills warnings
        if not user_preferences or not user_preferences.skills or len(user_preferences.skills) < 5:
            warnings.append('Limited skills listed. Add more technical and soft skills for better matches.')

        # Location warnings
        if not user_preferences or not user_preferences.preferred_locations or len(user_preferences.preferred_locations) == 0:
            warnings.append('No preferred locations set. This may result in geographically unsuitable job matches.')

    def _calculate_bonus_score(
        self,
        user_profile: UserProfile | None,
        user_preferences: UserPreferences | None,
        asset_counts: Dict[str, int]
    ) -> int:
        """Calculate bonus points for optional fields"""
        bonus_score = 0

        # GitHub bonus
        if user_profile and user_profile.github_username:
            bonus_score += 5

        # Google Scholar bonus
        if user_profile and user_profile.scholar_url:
            bonus_score += 5

        # Rich skills bonus
        if user_preferences and user_preferences.skills and len(user_preferences.skills) >= 5:
            bonus_score += 5

        # Salary range bonus
        if user_preferences and user_preferences.min_salary and user_preferences.max_salary:
            bonus_score += 3

        # Industry preferences bonus
        if user_preferences and user_preferences.preferred_industries and len(user_preferences.preferred_industries) > 0:
            bonus_score += 3

        # CV assets bonus
        if asset_counts['repositories'] >= 3:
            bonus_score += 5
        if asset_counts['experience'] >= 2:
            bonus_score += 5
        if asset_counts['publications'] >= 1:
            bonus_score += 5
        if asset_counts['other'] >= 1:
            bonus_score += 2

        return bonus_score

    def _generate_user_prompt(self, validation_result: ProfileValidationResult) -> str:
        """Generate user-friendly prompt based on validation results"""
        
        if not validation_result.is_valid:
            prompt = '⚠️ **Profile Incomplete**\n\n'
            prompt += 'Please complete the following required fields before starting job applications:\n\n'
            prompt += '\n'.join(f'• {field}' for field in validation_result.missing_fields)
            prompt += '\n\n📝 Go to your Profile tab to complete these fields.'
            return prompt
        
        elif validation_result.completion_score < 60:
            prompt = '⚠️ **Profile Setup Recommended**\n\n'
            prompt += f'Your profile is {validation_result.completion_score}% complete. '
            prompt += 'While you can start job applications, completing more profile sections will significantly improve your results.\n\n'
            
            if validation_result.warnings:
                prompt += '**Missing recommended fields:**\n'
                prompt += '\n'.join(f'• {w}' for w in validation_result.warnings[:3])
                prompt += '\n\n'
            
            prompt += 'Do you want to continue anyway or complete your profile first?'
            return prompt
        
        elif validation_result.warnings:
            prompt = f'✅ **Profile Ready** ({validation_result.completion_score}% complete)\n\n'
            prompt += 'Your profile meets the minimum requirements. '
            
            if validation_result.recommendations:
                prompt += 'Consider these quick improvements:\n\n'
                prompt += '\n'.join(f'• {r}' for r in validation_result.recommendations[:2])
            
            return prompt
        
        else:
            return f'✅ **Excellent Profile Setup!** ({validation_result.completion_score}% complete)\n\nYou\'re ready for automated job applications.'