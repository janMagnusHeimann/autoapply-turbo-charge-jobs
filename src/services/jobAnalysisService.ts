import { OpenAI } from 'openai';
import type { 
  JobAnalysis, 
  JobRequirements, 
  WorkExperience, 
  GitHubProject, 
  Publication, 
  Skill,
  ContentOptimization 
} from '@/types/cv';

/**
 * AI-powered job analysis service that extracts requirements and optimizes CV content
 */
export class JobAnalysisService {
  private openai: OpenAI;

  constructor() {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('VITE_OPENAI_API_KEY not found. Job analysis will use fallback mode.');
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey || 'fallback',
      dangerouslyAllowBrowser: true
    });
  }

  /**
   * Analyze a job description to extract key requirements and information
   */
  async analyzeJobDescription(
    jobTitle: string, 
    jobDescription: string, 
    companyInfo?: string
  ): Promise<JobAnalysis> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      return this.createFallbackAnalysis(jobTitle, jobDescription);
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert HR analyst specializing in job requirement extraction. 
            Analyze job descriptions to extract detailed requirements, skills, and company information.
            
            Always respond with a valid JSON object containing:
            - requiredSkills: array of mandatory technical and soft skills
            - preferredSkills: array of nice-to-have skills
            - experienceLevel: "entry", "mid", "senior", "lead", or "executive"
            - industries: array of relevant industries
            - keywords: array of important keywords from the description
            - requiresResearch: boolean indicating if research/academic background is needed
            - keyPhrases: array of important phrases that should be emphasized
            - skillWeights: object mapping skills to importance scores (0-1)
            - experienceWeights: object mapping experience types to importance scores
            - companyInfo: object with size, industry, and culture arrays
            - confidence: analysis confidence score (0-1)`
          },
          {
            role: "user",
            content: `Analyze this job posting:
            
            Job Title: ${jobTitle}
            
            Job Description:
            ${jobDescription}
            
            ${companyInfo ? `Company Information: ${companyInfo}` : ''}
            
            Extract all relevant requirements, skills, and provide detailed analysis.`
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      const responseContent = response.choices[0].message.content;
      if (!responseContent) {
        throw new Error('No response from AI analysis');
      }

      const analysisResult = JSON.parse(responseContent);
      
      // Validate and structure the response
      const requirements: JobRequirements = {
        requiredSkills: analysisResult.requiredSkills || [],
        preferredSkills: analysisResult.preferredSkills || [],
        experienceLevel: analysisResult.experienceLevel || 'mid',
        industries: analysisResult.industries || [],
        keywords: analysisResult.keywords || [],
        requiresResearch: analysisResult.requiresResearch || false
      };

      const analysis: JobAnalysis = {
        jobId: `analysis-${Date.now()}`,
        requirements,
        keyPhrases: analysisResult.keyPhrases || [],
        companyInfo: {
          size: analysisResult.companyInfo?.size || 'unknown',
          industry: analysisResult.companyInfo?.industry || 'technology',
          culture: analysisResult.companyInfo?.culture || []
        },
        skillWeights: analysisResult.skillWeights || {},
        experienceWeights: analysisResult.experienceWeights || {},
        confidence: analysisResult.confidence || 0.8,
        analysisDate: new Date().toISOString()
      };

      return analysis;

    } catch (error) {
      console.error('Error analyzing job description:', error);
      return this.createFallbackAnalysis(jobTitle, jobDescription);
    }
  }

  /**
   * Score projects based on relevance to job requirements
   */
  async scoreProjectRelevance(
    projects: GitHubProject[], 
    analysis: JobAnalysis
  ): Promise<GitHubProject[]> {
    const scoredProjects = projects.map(project => {
      let score = 0;
      const { requirements, skillWeights } = analysis;
      
      // Score based on technologies used
      project.technologies.forEach(tech => {
        if (requirements.requiredSkills.includes(tech)) {
          score += (skillWeights[tech] || 0.5) * 0.4;
        }
        if (requirements.preferredSkills.includes(tech)) {
          score += (skillWeights[tech] || 0.3) * 0.2;
        }
      });

      // Score based on project description keywords
      const description = project.description.toLowerCase();
      requirements.keywords.forEach(keyword => {
        if (description.includes(keyword.toLowerCase())) {
          score += 0.1;
        }
      });

      // Bonus for recent projects
      const monthsOld = (Date.now() - new Date(project.lastUpdated).getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsOld < 12) {
        score += 0.1;
      }

      // Bonus for popular projects
      if (project.stars > 10) {
        score += Math.min(project.stars / 100, 0.2);
      }

      return {
        ...project,
        relevanceScore: Math.min(score, 1)
      };
    });

    return scoredProjects.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }

  /**
   * Score publications based on relevance to job requirements
   */
  async scorePublicationRelevance(
    publications: Publication[], 
    analysis: JobAnalysis
  ): Promise<Publication[]> {
    if (!analysis.requirements.requiresResearch) {
      return publications.map(pub => ({ ...pub, relevanceScore: 0 }));
    }

    const scoredPublications = publications.map(publication => {
      let score = 0;
      const { keywords, requirements } = analysis;
      
      // Score based on keywords in title and abstract
      const content = `${publication.title} ${publication.abstract || ''}`.toLowerCase();
      keywords.forEach(keyword => {
        if (content.includes(keyword.toLowerCase())) {
          score += 0.3;
        }
      });

      // Score based on publication keywords
      publication.keywords.forEach(pubKeyword => {
        if (requirements.keywords.some(reqKeyword => 
          reqKeyword.toLowerCase().includes(pubKeyword.toLowerCase())
        )) {
          score += 0.2;
        }
      });

      // Bonus for recent publications
      const yearsOld = new Date().getFullYear() - publication.year;
      if (yearsOld < 3) {
        score += 0.2;
      }

      // Bonus for high citation count
      if (publication.citationCount && publication.citationCount > 10) {
        score += Math.min(publication.citationCount / 100, 0.3);
      }

      return {
        ...publication,
        relevanceScore: Math.min(score, 1)
      };
    });

    return scoredPublications.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }

  /**
   * Score and highlight relevant skills
   */
  scoreSkillRelevance(skills: Skill[], analysis: JobAnalysis): Skill[] {
    const { requirements, skillWeights } = analysis;
    
    return skills.map(skill => {
      let score = 0;
      let isHighlighted = false;

      // High score for required skills
      if (requirements.requiredSkills.includes(skill.name)) {
        score = skillWeights[skill.name] || 0.9;
        isHighlighted = true;
      }
      // Medium score for preferred skills
      else if (requirements.preferredSkills.includes(skill.name)) {
        score = skillWeights[skill.name] || 0.6;
        isHighlighted = true;
      }
      // Low score for related skills
      else if (requirements.keywords.some(keyword => 
        skill.name.toLowerCase().includes(keyword.toLowerCase())
      )) {
        score = 0.3;
      }

      // Boost score based on proficiency
      const proficiencyBoost = {
        'expert': 0.2,
        'advanced': 0.15,
        'intermediate': 0.1,
        'beginner': 0.05
      };
      score += proficiencyBoost[skill.proficiencyLevel] || 0;

      return {
        ...skill,
        relevanceScore: Math.min(score, 1),
        isHighlighted
      };
    }).sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }

  /**
   * Generate optimized professional summary
   */
  async optimizeProfessionalSummary(
    originalSummary: string,
    analysis: JobAnalysis,
    userProfile: { title: string; name: string }
  ): Promise<ContentOptimization> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      return {
        originalContent: originalSummary,
        optimizedContent: originalSummary,
        changes: [],
        relevanceScore: 0.5
      };
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a professional CV writer specializing in optimizing professional summaries for specific job applications.
            
            Your task is to rewrite professional summaries to better match job requirements while maintaining authenticity.
            
            Guidelines:
            - Keep the summary to 3-4 sentences
            - Incorporate key skills and keywords from the job requirements
            - Maintain the person's actual experience and achievements
            - Use active voice and strong action words
            - Make it ATS-friendly
            
            Respond with JSON containing:
            - optimizedSummary: the rewritten summary
            - keyChanges: array of specific changes made
            - keywordsAdded: array of job-relevant keywords incorporated
            - relevanceScore: estimated relevance to job (0-1)`
          },
          {
            role: "user",
            content: `Optimize this professional summary for the given job:
            
            Original Summary:
            ${originalSummary}
            
            Job Requirements:
            - Required Skills: ${analysis.requirements.requiredSkills.join(', ')}
            - Key Phrases: ${analysis.keyPhrases.join(', ')}
            - Industry: ${analysis.companyInfo.industry}
            - Experience Level: ${analysis.requirements.experienceLevel}
            
            User Profile:
            - Current Title: ${userProfile.title}
            - Name: ${userProfile.name}
            
            Rewrite the summary to better match this specific job while keeping it authentic.`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        originalContent: originalSummary,
        optimizedContent: result.optimizedSummary || originalSummary,
        changes: (result.keyChanges || []).map((change: string) => ({
          type: 'rewrite' as const,
          description: change
        })),
        relevanceScore: result.relevanceScore || 0.7
      };

    } catch (error) {
      console.error('Error optimizing professional summary:', error);
      return {
        originalContent: originalSummary,
        optimizedContent: originalSummary,
        changes: [],
        relevanceScore: 0.5
      };
    }
  }

  /**
   * Optimize work experience bullet points
   */
  async optimizeExperienceBullets(
    experiences: WorkExperience[],
    analysis: JobAnalysis
  ): Promise<WorkExperience[]> {
    const { requirements, skillWeights, keyPhrases } = analysis;
    
    return experiences.map(experience => {
      // Score this experience's relevance
      let relevanceScore = 0;
      
      // Check technologies used
      experience.technologies.forEach(tech => {
        if (requirements.requiredSkills.includes(tech)) {
          relevanceScore += (skillWeights[tech] || 0.5) * 0.3;
        }
      });

      // Check achievement descriptions for keywords
      const allText = experience.achievements.join(' ').toLowerCase();
      requirements.keywords.forEach(keyword => {
        if (allText.includes(keyword.toLowerCase())) {
          relevanceScore += 0.1;
        }
      });

      // Reorder achievements to prioritize relevant ones
      const scoredAchievements = experience.achievements.map(achievement => {
        let achScore = 0;
        const achText = achievement.toLowerCase();
        
        requirements.keywords.forEach(keyword => {
          if (achText.includes(keyword.toLowerCase())) {
            achScore += 0.2;
          }
        });

        keyPhrases.forEach(phrase => {
          if (achText.includes(phrase.toLowerCase())) {
            achScore += 0.3;
          }
        });

        return { text: achievement, score: achScore };
      });

      const optimizedAchievements = scoredAchievements
        .sort((a, b) => b.score - a.score)
        .map(item => item.text);

      return {
        ...experience,
        achievements: optimizedAchievements,
        relevanceScore: Math.min(relevanceScore, 1)
      };
    }).sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }

  /**
   * Select optimal content for CV generation
   */
  selectOptimalContent(
    projects: GitHubProject[],
    publications: Publication[],
    maxProjects: number = 4,
    maxPublications: number = 3
  ): { selectedProjects: GitHubProject[]; selectedPublications: Publication[] } {
    // Select top projects by relevance score
    const selectedProjects = projects
      .filter(p => (p.relevanceScore || 0) > 0.2)
      .slice(0, maxProjects);

    // Select top publications by relevance score
    const selectedPublications = publications
      .filter(p => (p.relevanceScore || 0) > 0.3)
      .slice(0, maxPublications);

    return { selectedProjects, selectedPublications };
  }

  /**
   * Create fallback analysis when OpenAI is not available
   */
  private createFallbackAnalysis(jobTitle: string, jobDescription: string): JobAnalysis {
    const description = jobDescription.toLowerCase();
    
    // Extract common technical skills
    const techSkills = [
      'javascript', 'typescript', 'react', 'node.js', 'python', 'java', 
      'go', 'rust', 'swift', 'kotlin', 'docker', 'kubernetes', 'aws', 
      'gcp', 'azure', 'postgresql', 'mongodb', 'redis', 'graphql'
    ];
    
    const requiredSkills = techSkills.filter(skill => 
      description.includes(skill) || description.includes(skill.replace('.', ''))
    );

    // Determine experience level
    let experienceLevel: JobAnalysis['requirements']['experienceLevel'] = 'mid';
    if (description.includes('senior') || description.includes('lead')) {
      experienceLevel = 'senior';
    } else if (description.includes('junior') || description.includes('entry')) {
      experienceLevel = 'entry';
    } else if (description.includes('principal') || description.includes('architect')) {
      experienceLevel = 'lead';
    }

    const requirements: JobRequirements = {
      requiredSkills,
      preferredSkills: [],
      experienceLevel,
      industries: ['Technology'],
      keywords: requiredSkills,
      requiresResearch: description.includes('research') || description.includes('phd')
    };

    const skillWeights = requiredSkills.reduce((acc, skill) => {
      acc[skill] = 0.8;
      return acc;
    }, {} as Record<string, number>);

    return {
      jobId: `fallback-${Date.now()}`,
      requirements,
      keyPhrases: requiredSkills,
      companyInfo: {
        size: 'unknown',
        industry: 'Technology',
        culture: []
      },
      skillWeights,
      experienceWeights: { 'software development': 0.9 },
      confidence: 0.6,
      analysisDate: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const jobAnalysisService = new JobAnalysisService();