import type { JobListing } from './jobScrapingAgent';
import type { UserProfile, UserPreferences } from './userService';
import { ChatOpenAI } from '@langchain/openai';

export interface JobMatch {
  job: JobListing;
  match_score: number;
  match_breakdown: {
    skills_match: number;
    location_match: number;
    experience_match: number;
    industry_match: number;
    employment_type_match: number;
    remote_preference_match: number;
    salary_match: number;
    overall_fit: number;
  };
  match_reasons: string[];
  concerns: string[];
  recommendation: 'highly_recommended' | 'recommended' | 'consider' | 'not_recommended';
}

export interface MatchingCriteria {
  skills_weight: number;
  location_weight: number;
  experience_weight: number;
  industry_weight: number;
  employment_type_weight: number;
  remote_preference_weight: number;
  salary_weight: number;
  overall_fit_weight: number;
}

export class JobMatchingService {
  private llm: ChatOpenAI;
  private defaultWeights: MatchingCriteria = {
    skills_weight: 0.3,
    location_weight: 0.15,
    experience_weight: 0.2,
    industry_weight: 0.1,
    employment_type_weight: 0.1,
    remote_preference_weight: 0.1,
    salary_weight: 0.15,
    overall_fit_weight: 0.25
  };

  constructor() {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }

    this.llm = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: 'gpt-4o-mini',
      temperature: 0.2,
      maxTokens: 2000,
    });
  }

  /**
   * Calculate skills match percentage
   */
  private calculateSkillsMatch(job: JobListing, userPreferences: UserPreferences): number {
    const userSkills = userPreferences.skills.map(s => s.toLowerCase());
    const jobRequirements = [
      ...job.requirements,
      ...job.nice_to_have,
      ...(job.technologies || [])
    ].map(r => r.toLowerCase());

    if (userSkills.length === 0 || jobRequirements.length === 0) {
      return 0.5; // Neutral if no data
    }

    let matchCount = 0;
    let totalRelevantRequirements = 0;

    for (const requirement of jobRequirements) {
      totalRelevantRequirements++;
      
      // Check for exact matches
      if (userSkills.some(skill => requirement.includes(skill) || skill.includes(requirement))) {
        matchCount++;
        continue;
      }

      // Check for related technologies (simplified)
      const relatedTechs = this.getRelatedTechnologies(requirement);
      if (relatedTechs.some(tech => userSkills.includes(tech))) {
        matchCount += 0.7; // Partial match for related technologies
      }
    }

    return Math.min(matchCount / Math.max(totalRelevantRequirements, 1), 1);
  }

  /**
   * Get related technologies for skill matching
   */
  private getRelatedTechnologies(skill: string): string[] {
    const relatedTechMap: Record<string, string[]> = {
      'javascript': ['js', 'typescript', 'ts', 'node', 'nodejs', 'react', 'vue', 'angular'],
      'typescript': ['javascript', 'js', 'ts', 'node', 'nodejs'],
      'python': ['django', 'flask', 'fastapi', 'pandas', 'numpy'],
      'react': ['javascript', 'typescript', 'jsx', 'nextjs', 'gatsby'],
      'node': ['nodejs', 'javascript', 'typescript', 'express'],
      'aws': ['cloud', 'ec2', 's3', 'lambda', 'docker', 'kubernetes'],
      'docker': ['kubernetes', 'containerization', 'devops'],
      'sql': ['mysql', 'postgresql', 'database', 'mongodb']
    };

    const lowerSkill = skill.toLowerCase();
    for (const [key, related] of Object.entries(relatedTechMap)) {
      if (lowerSkill.includes(key)) {
        return related;
      }
    }
    return [];
  }

  /**
   * Calculate location match percentage
   */
  private calculateLocationMatch(job: JobListing, userPreferences: UserPreferences): number {
    if (job.remote_type === 'remote' || userPreferences.preferred_remote === 'remote') {
      return 1.0; // Perfect match for remote work
    }

    if (job.remote_type === 'hybrid' && userPreferences.preferred_remote === 'hybrid') {
      return 0.9;
    }

    const userLocations = userPreferences.preferred_locations.map(l => l.toLowerCase());
    const jobLocation = job.location.toLowerCase();

    // Check for exact matches
    if (userLocations.some(loc => jobLocation.includes(loc) || loc.includes(jobLocation))) {
      return 0.8;
    }

    // Check for same country/region (simplified)
    const commonLocations = ['berlin', 'munich', 'hamburg', 'cologne', 'frankfurt'];
    const isGermanJob = commonLocations.some(city => jobLocation.includes(city));
    const hasGermanPreference = userLocations.some(loc => 
      commonLocations.some(city => loc.includes(city))
    );

    if (isGermanJob && hasGermanPreference) {
      return 0.6;
    }

    return 0.3; // Low match if no location compatibility
  }

  /**
   * Calculate experience level match
   */
  private calculateExperienceMatch(job: JobListing, userProfile: UserProfile): number {
    // This is simplified - in reality you'd analyze user's experience more thoroughly
    const experienceLevels = {
      'entry': 1,
      'mid': 2,
      'senior': 3,
      'lead': 4,
      'executive': 5
    };

    // For now, assume mid-level based on profile completeness
    const userLevel = userProfile.professional_summary ? 2 : 1;
    const jobLevel = experienceLevels[job.experience_level] || 2;

    const diff = Math.abs(userLevel - jobLevel);
    if (diff === 0) return 1.0;
    if (diff === 1) return 0.8;
    if (diff === 2) return 0.5;
    return 0.2;
  }

  /**
   * Calculate industry match
   */
  private calculateIndustryMatch(job: JobListing, userPreferences: UserPreferences): number {
    if (userPreferences.preferred_industries.length === 0) {
      return 0.5; // Neutral if no preference
    }

    // Check if company industry matches user preferences
    // Note: We'd need company industry data for this to work properly
    return 0.7; // Placeholder - assume reasonable match
  }

  /**
   * Calculate employment type match
   */
  private calculateEmploymentTypeMatch(job: JobListing, userPreferences: UserPreferences): number {
    if (userPreferences.preferred_job_types.includes(job.employment_type)) {
      return 1.0;
    }

    // Partial matches
    if (job.employment_type === 'contract' && userPreferences.preferred_job_types.includes('full-time')) {
      return 0.6;
    }

    return 0.3;
  }

  /**
   * Calculate remote preference match
   */
  private calculateRemoteMatch(job: JobListing, userPreferences: UserPreferences): number {
    if (job.remote_type === userPreferences.preferred_remote) {
      return 1.0;
    }

    // Flexible matching
    if (userPreferences.preferred_remote === 'any') {
      return 0.9;
    }

    if (job.remote_type === 'hybrid' && 
        (userPreferences.preferred_remote === 'remote' || userPreferences.preferred_remote === 'on-site')) {
      return 0.7;
    }

    return 0.4;
  }

  /**
   * Calculate salary match
   */
  private calculateSalaryMatch(job: JobListing, userPreferences: UserPreferences): number {
    if (!job.salary_min || !job.salary_max || !userPreferences.min_salary || !userPreferences.max_salary) {
      return 0.7; // Neutral if salary info is missing
    }

    const jobMinSalary = job.salary_min;
    const jobMaxSalary = job.salary_max;
    const userMinSalary = userPreferences.min_salary;
    const userMaxSalary = userPreferences.max_salary;

    // Check for overlap
    if (jobMaxSalary >= userMinSalary && jobMinSalary <= userMaxSalary) {
      // Calculate overlap percentage
      const overlapMin = Math.max(jobMinSalary, userMinSalary);
      const overlapMax = Math.min(jobMaxSalary, userMaxSalary);
      const overlapSize = overlapMax - overlapMin;
      const userRangeSize = userMaxSalary - userMinSalary;
      
      return Math.min(overlapSize / userRangeSize, 1.0);
    }

    // No overlap - calculate distance penalty
    if (jobMaxSalary < userMinSalary) {
      const gap = userMinSalary - jobMaxSalary;
      const penalty = gap / userMinSalary;
      return Math.max(0.2, 1 - penalty);
    }

    if (jobMinSalary > userMaxSalary) {
      // Job pays more than expected - not necessarily bad
      return 0.8;
    }

    return 0.5;
  }

  /**
   * Use AI to calculate overall fit score
   */
  private async calculateOverallFit(job: JobListing, userProfile: UserProfile, userPreferences: UserPreferences): Promise<{ score: number; reasons: string[]; concerns: string[] }> {
    try {
      const prompt = `You are an expert career advisor. Analyze the fit between a job listing and a candidate's profile.

CANDIDATE PROFILE:
Name: ${userProfile.full_name}
Skills: ${userPreferences.skills.join(', ')}
Preferred Industries: ${userPreferences.preferred_industries.join(', ')}
Preferred Locations: ${userPreferences.preferred_locations.join(', ')}
Remote Preference: ${userPreferences.preferred_remote}
Salary Range: ${userPreferences.min_salary}-${userPreferences.max_salary} ${userPreferences.currency}
Professional Summary: ${userProfile.professional_summary || 'Not provided'}

JOB LISTING:
Title: ${job.title}
Company: ${job.company_name}
Description: ${job.description.slice(0, 500)}...
Requirements: ${job.requirements.join(', ')}
Nice to Have: ${job.nice_to_have.join(', ')}
Location: ${job.location}
Remote Type: ${job.remote_type}
Employment Type: ${job.employment_type}
Experience Level: ${job.experience_level}
Technologies: ${job.technologies?.join(', ') || 'Not specified'}
Salary: ${job.salary_min && job.salary_max ? `${job.salary_min}-${job.salary_max} ${job.currency}` : 'Not specified'}

Analyze the overall fit and return a JSON object:
{
  "overall_fit_score": 0.85,
  "fit_reasons": ["Strong technical skills match", "Good salary alignment"],
  "concerns": ["Location might be challenging", "Senior role might be stretch"],
  "recommendation": "recommended"
}

Score should be 0.0-1.0. Recommendation should be one of: highly_recommended, recommended, consider, not_recommended`;

      const response = await this.llm.invoke(prompt);
      const content = response.content as string;
      
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          return {
            score: Math.min(Math.max(analysis.overall_fit_score || 0.5, 0), 1),
            reasons: analysis.fit_reasons || [],
            concerns: analysis.concerns || []
          };
        }
      } catch (parseError) {
        console.warn('Failed to parse AI analysis:', parseError);
      }

      // Fallback to simple analysis
      return {
        score: 0.6,
        reasons: ['Basic compatibility analysis'],
        concerns: ['AI analysis unavailable']
      };

    } catch (error) {
      console.error('Error in AI overall fit analysis:', error);
      return {
        score: 0.5,
        reasons: ['Unable to perform detailed analysis'],
        concerns: ['Analysis service unavailable']
      };
    }
  }

  /**
   * Calculate comprehensive job match score
   */
  async calculateJobMatch(job: JobListing, userProfile: UserProfile, userPreferences: UserPreferences, weights?: Partial<MatchingCriteria>): Promise<JobMatch> {
    const finalWeights = { ...this.defaultWeights, ...weights };

    // Calculate individual match scores
    const skillsMatch = this.calculateSkillsMatch(job, userPreferences);
    const locationMatch = this.calculateLocationMatch(job, userPreferences);
    const experienceMatch = this.calculateExperienceMatch(job, userProfile);
    const industryMatch = this.calculateIndustryMatch(job, userPreferences);
    const employmentTypeMatch = this.calculateEmploymentTypeMatch(job, userPreferences);
    const remoteMatch = this.calculateRemoteMatch(job, userPreferences);
    const salaryMatch = this.calculateSalaryMatch(job, userPreferences);

    // Get AI-powered overall fit analysis
    const overallFit = await this.calculateOverallFit(job, userProfile, userPreferences);

    // Calculate weighted overall score
    const overallScore = 
      (skillsMatch * finalWeights.skills_weight) +
      (locationMatch * finalWeights.location_weight) +
      (experienceMatch * finalWeights.experience_weight) +
      (industryMatch * finalWeights.industry_weight) +
      (employmentTypeMatch * finalWeights.employment_type_weight) +
      (remoteMatch * finalWeights.remote_preference_weight) +
      (salaryMatch * finalWeights.salary_weight) +
      (overallFit.score * finalWeights.overall_fit_weight);

    // Determine recommendation level
    let recommendation: JobMatch['recommendation'];
    if (overallScore >= 0.8) recommendation = 'highly_recommended';
    else if (overallScore >= 0.65) recommendation = 'recommended';
    else if (overallScore >= 0.4) recommendation = 'consider';
    else recommendation = 'not_recommended';

    // Compile match reasons
    const matchReasons: string[] = [];
    if (skillsMatch > 0.7) matchReasons.push(`Strong skills match (${Math.round(skillsMatch * 100)}%)`);
    if (locationMatch > 0.8) matchReasons.push(`Excellent location fit`);
    if (salaryMatch > 0.7) matchReasons.push(`Good salary alignment`);
    if (remoteMatch > 0.8) matchReasons.push(`Perfect remote work match`);
    matchReasons.push(...overallFit.reasons);

    return {
      job,
      match_score: Math.round(overallScore * 100) / 100,
      match_breakdown: {
        skills_match: Math.round(skillsMatch * 100) / 100,
        location_match: Math.round(locationMatch * 100) / 100,
        experience_match: Math.round(experienceMatch * 100) / 100,
        industry_match: Math.round(industryMatch * 100) / 100,
        employment_type_match: Math.round(employmentTypeMatch * 100) / 100,
        remote_preference_match: Math.round(remoteMatch * 100) / 100,
        salary_match: Math.round(salaryMatch * 100) / 100,
        overall_fit: Math.round(overallFit.score * 100) / 100
      },
      match_reasons: matchReasons,
      concerns: overallFit.concerns,
      recommendation
    };
  }

  /**
   * Match multiple jobs and sort by score
   */
  async matchJobs(jobs: JobListing[], userProfile: UserProfile, userPreferences: UserPreferences, weights?: Partial<MatchingCriteria>): Promise<JobMatch[]> {
    const matches: JobMatch[] = [];

    console.log(`🎯 Calculating match scores for ${jobs.length} jobs...`);

    for (const job of jobs) {
      try {
        const match = await this.calculateJobMatch(job, userProfile, userPreferences, weights);
        matches.push(match);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error matching job ${job.title}:`, error);
        // Add a basic match with low score if analysis fails
        matches.push({
          job,
          match_score: 0.3,
          match_breakdown: {
            skills_match: 0.3,
            location_match: 0.3,
            experience_match: 0.3,
            industry_match: 0.3,
            employment_type_match: 0.3,
            remote_preference_match: 0.3,
            salary_match: 0.3,
            overall_fit: 0.3
          },
          match_reasons: ['Analysis failed - basic compatibility assumed'],
          concerns: ['Unable to perform detailed matching'],
          recommendation: 'consider'
        });
      }
    }

    // Sort by match score (highest first)
    matches.sort((a, b) => b.match_score - a.match_score);

    console.log(`✅ Job matching completed. Top match: ${matches[0]?.job.title} (${matches[0]?.match_score})`);

    return matches;
  }

  /**
   * Get matching statistics
   */
  getMatchingStats(matches: JobMatch[]): {
    total_jobs: number;
    highly_recommended: number;
    recommended: number;
    consider: number;
    not_recommended: number;
    average_score: number;
    top_skills: string[];
  } {
    const stats = {
      total_jobs: matches.length,
      highly_recommended: matches.filter(m => m.recommendation === 'highly_recommended').length,
      recommended: matches.filter(m => m.recommendation === 'recommended').length,
      consider: matches.filter(m => m.recommendation === 'consider').length,
      not_recommended: matches.filter(m => m.recommendation === 'not_recommended').length,
      average_score: matches.length > 0 ? matches.reduce((sum, m) => sum + m.match_score, 0) / matches.length : 0,
      top_skills: this.extractTopSkills(matches)
    };

    return stats;
  }

  private extractTopSkills(matches: JobMatch[]): string[] {
    const skillCount: Record<string, number> = {};

    matches.forEach(match => {
      [...match.job.requirements, ...(match.job.technologies || [])].forEach(skill => {
        const normalizedSkill = skill.toLowerCase().trim();
        skillCount[normalizedSkill] = (skillCount[normalizedSkill] || 0) + 1;
      });
    });

    return Object.entries(skillCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([skill]) => skill);
  }
}

export const jobMatchingService = new JobMatchingService();