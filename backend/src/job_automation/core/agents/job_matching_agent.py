"""
Job Matching Agent - Matches jobs to user preferences using AI
"""

from typing import Dict, Any, List
from .base_agent import BaseAgent
import logging

logger = logging.getLogger(__name__)

class JobMatchingAgent(BaseAgent):
    """
    Matches jobs to user preferences using AI
    Provides compatibility scores and reasoning
    """
    
    def __init__(self, **kwargs):
        super().__init__(name="JobMatchingAgent", **kwargs)
    
    async def observe(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Observe jobs and user preferences"""
        return {
            "jobs": task["jobs"],
            "user_preferences": task["user_preferences"],
            "total_jobs": len(task["jobs"])
        }
    
    async def orient(self, observation: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze matching criteria"""
        preferences = observation["user_preferences"]
        
        # Define matching dimensions
        dimensions = {
            "skills_match": self._get_skills_analyzer(preferences),
            "location_match": self._get_location_analyzer(preferences),
            "experience_match": self._get_experience_analyzer(preferences),
            "role_match": self._get_role_analyzer(preferences),
            "company_match": self._get_company_analyzer(preferences)
        }
        
        # Calculate weights
        weights = self._calculate_weights(preferences)
        
        return {
            "matching_dimensions": dimensions,
            "weight_distribution": weights
        }
    
    async def decide(self, orientation: Dict[str, Any]) -> Dict[str, Any]:
        """Score and rank jobs"""
        jobs = self.state.observation["jobs"]
        dimensions = orientation["matching_dimensions"]
        weights = orientation["weight_distribution"]
        
        scored_jobs = []
        
        for job in jobs:
            # Calculate dimension scores
            scores = {}
            for dim_name, dim_analyzer in dimensions.items():
                scores[dim_name] = dim_analyzer(job)
            
            # Calculate weighted total score
            total_score = sum(
                scores[dim] * weights[dim] 
                for dim in scores
            )
            
            # Get AI reasoning for match
            reasoning = await self._get_match_reasoning(
                job, 
                scores, 
                self.state.observation["user_preferences"]
            )
            
            scored_jobs.append({
                **job,
                "match_score": round(total_score, 1),
                "dimension_scores": {k: round(v, 1) for k, v in scores.items()},
                "match_reasoning": reasoning,
                "recommendation": self._get_recommendation(total_score)
            })
        
        # Sort by match score
        scored_jobs.sort(key=lambda x: x["match_score"], reverse=True)
        
        return {
            "action": "return_matches",
            "matched_jobs": scored_jobs,
            "matching_criteria": list(dimensions.keys())
        }
    
    async def act(self, decision: Dict[str, Any]) -> Dict[str, Any]:
        """Return matched jobs with scores"""
        return {
            "status": "success",
            "matched_jobs": decision["matched_jobs"],
            "total_matched": len(decision["matched_jobs"]),
            "matching_criteria": decision["matching_criteria"]
        }
    
    def _get_skills_analyzer(self, preferences: Dict[str, Any]):
        """Create skills matching analyzer"""
        user_skills = [skill.lower() for skill in preferences.get("skills", [])]
        
        def analyze_skills(job: Dict[str, Any]) -> float:
            if not user_skills:
                return 50.0  # Neutral score if no skills specified
            
            # Extract skills from job
            job_text = f"{job.get('title', '')} {job.get('description', '')}".lower()
            
            # Count matching skills
            matching_skills = sum(1 for skill in user_skills if skill in job_text)
            
            if len(user_skills) == 0:
                return 50.0
            
            # Calculate percentage match
            score = (matching_skills / len(user_skills)) * 100
            return min(score, 100.0)
        
        return analyze_skills
    
    def _get_location_analyzer(self, preferences: Dict[str, Any]):
        """Create location matching analyzer"""
        preferred_locations = [loc.lower() for loc in preferences.get("locations", [])]
        remote_preferred = any("remote" in loc.lower() for loc in preferred_locations)
        
        def analyze_location(job: Dict[str, Any]) -> float:
            job_location = job.get("location", "").lower()
            
            # Perfect match for remote jobs if remote preferred
            if remote_preferred and ("remote" in job_location or "anywhere" in job_location):
                return 100.0
            
            # Check for location matches
            for pref_loc in preferred_locations:
                if pref_loc in job_location or job_location in pref_loc:
                    return 90.0
            
            # If job is remote and user has any location preference
            if "remote" in job_location and preferred_locations:
                return 80.0
            
            # Default score if no preference or unclear location
            if not preferred_locations:
                return 50.0
            
            return 20.0  # Location mismatch
        
        return analyze_location
    
    def _get_experience_analyzer(self, preferences: Dict[str, Any]):
        """Create experience level matching analyzer"""
        user_experience = preferences.get("experience_years", 0)
        user_level = preferences.get("experience_level", "").lower()
        
        def analyze_experience(job: Dict[str, Any]) -> float:
            job_title = job.get("title", "").lower()
            job_description = job.get("description", "").lower()
            
            # Experience level indicators
            if "senior" in job_title or "senior" in job_description:
                required_exp = 5
            elif "lead" in job_title or "lead" in job_description:
                required_exp = 7
            elif "junior" in job_title or "junior" in job_description:
                required_exp = 1
            elif "intern" in job_title or "intern" in job_description:
                required_exp = 0
            else:
                required_exp = 3  # Default mid-level
            
            # Score based on experience match
            exp_diff = abs(user_experience - required_exp)
            
            if exp_diff == 0:
                return 100.0
            elif exp_diff <= 1:
                return 90.0
            elif exp_diff <= 2:
                return 75.0
            elif exp_diff <= 3:
                return 60.0
            else:
                return 40.0
        
        return analyze_experience
    
    def _get_role_analyzer(self, preferences: Dict[str, Any]):
        """Create role matching analyzer"""
        desired_roles = [role.lower() for role in preferences.get("desired_roles", [])]
        
        def analyze_role(job: Dict[str, Any]) -> float:
            if not desired_roles:
                return 50.0  # Neutral if no role preference
            
            job_title = job.get("title", "").lower()
            
            # Check for exact role matches
            for role in desired_roles:
                if role in job_title:
                    return 95.0
            
            # Check for partial matches
            role_keywords = ["engineer", "developer", "analyst", "manager", "designer"]
            for keyword in role_keywords:
                if keyword in job_title and any(keyword in role for role in desired_roles):
                    return 70.0
            
            return 30.0  # No clear role match
        
        return analyze_role
    
    def _get_company_analyzer(self, preferences: Dict[str, Any]):
        """Create company matching analyzer"""
        preferred_industries = preferences.get("industries", [])
        company_size_pref = preferences.get("company_size", [])
        
        def analyze_company(job: Dict[str, Any]) -> float:
            # Basic company scoring
            # In a real implementation, this would check against company database
            return 50.0  # Neutral score for now
        
        return analyze_company
    
    def _calculate_weights(self, preferences: Dict[str, Any]) -> Dict[str, float]:
        """Calculate dimension weights based on user preferences"""
        # Default weights
        weights = {
            "skills_match": 0.35,
            "location_match": 0.25,
            "experience_match": 0.20,
            "role_match": 0.15,
            "company_match": 0.05
        }
        
        # Adjust weights based on user preferences
        if preferences.get("locations") and any("remote" not in loc.lower() for loc in preferences["locations"]):
            weights["location_match"] = 0.3  # Increase if specific location required
            weights["skills_match"] = 0.3
        
        if len(preferences.get("skills", [])) > 5:
            weights["skills_match"] = 0.4  # Increase if many skills specified
            weights["location_match"] = 0.2
        
        return weights
    
    async def _get_match_reasoning(self, job: Dict[str, Any], scores: Dict[str, float], preferences: Dict[str, Any]) -> str:
        """Get AI reasoning for job match"""
        if not self.llm_client:
            return self._get_simple_reasoning(job, scores, preferences)
        
        try:
            prompt = f"""
            Job: {job.get('title', 'Unknown')} at {job.get('company', 'Unknown')}
            Location: {job.get('location', 'Not specified')}
            Description: {job.get('description', 'No description')[:300]}
            
            User Preferences:
            - Skills: {', '.join(preferences.get('skills', []))}
            - Locations: {', '.join(preferences.get('locations', []))}
            - Experience: {preferences.get('experience_years', 0)} years
            - Desired roles: {', '.join(preferences.get('desired_roles', []))}
            
            Match Scores:
            - Skills: {scores.get('skills_match', 0):.1f}%
            - Location: {scores.get('location_match', 0):.1f}%
            - Experience: {scores.get('experience_match', 0):.1f}%
            - Role: {scores.get('role_match', 0):.1f}%
            
            Provide a brief (2-3 sentences) explanation of why this job matches or doesn't match the user's preferences.
            """
            
            reasoning = await self.llm_client.generate(prompt)
            return reasoning.strip()
            
        except Exception as e:
            logger.error(f"AI reasoning failed: {e}")
            return self._get_simple_reasoning(job, scores, preferences)
    
    def _get_simple_reasoning(self, job: Dict[str, Any], scores: Dict[str, float], preferences: Dict[str, Any]) -> str:
        """Generate simple reasoning without AI"""
        total_score = sum(scores.values()) / len(scores)
        
        if total_score >= 80:
            return f"Excellent match! This {job.get('title', 'position')} aligns well with your skills and preferences."
        elif total_score >= 60:
            return f"Good match. This {job.get('title', 'position')} meets most of your criteria with some minor gaps."
        elif total_score >= 40:
            return f"Partial match. This {job.get('title', 'position')} has potential but may require additional considerations."
        else:
            return f"Limited match. This {job.get('title', 'position')} doesn't align closely with your current preferences."
    
    def _get_recommendation(self, score: float) -> str:
        """Get recommendation based on match score"""
        if score >= 80:
            return "Highly Recommended"
        elif score >= 60:
            return "Recommended"
        elif score >= 40:
            return "Consider"
        else:
            return "Not Recommended" 