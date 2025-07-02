interface CVAnalysisRequest {
  professionalSummary: string;
  currentTitle: string;
  skills: string[];
  githubRepos?: GitHubRepo[];
  linkedinUrl?: string;
  experience?: string;
}

interface CVAnalysis {
  summary: string;
  keySkills: string[];
  experienceLevel: string;
  industries: string[];
  suggestedJobTypes: string[];
  suggestedSalaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  improvementSuggestions: string[];
  marketabilityScore: number; // 0-100
}

interface GitHubRepo {
  id: number;
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  html_url: string;
  topics?: string[];
}

class CVAnalysisService {
  private readonly OPENAI_API_ENDPOINT = '/api/openai/analyze-cv';
  
  async analyzeCV(request: CVAnalysisRequest): Promise<CVAnalysis> {
    try {
      // For now, return mock analysis - replace with actual OpenAI call
      return this.generateMockAnalysis(request);
      
      /* 
      // Actual OpenAI implementation would look like this:
      const response = await fetch(this.OPENAI_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`CV analysis failed: ${response.statusText}`);
      }

      return await response.json();
      */
    } catch (error) {
      console.error('Error analyzing CV:', error);
      throw new Error('Failed to analyze CV. Please try again.');
    }
  }

  private generateMockAnalysis(request: CVAnalysisRequest): CVAnalysis {
    // Extract key information from the request
    const { professionalSummary, currentTitle, skills, githubRepos } = request;
    
    // Determine experience level based on title and summary
    const experienceLevel = this.determineExperienceLevel(currentTitle, professionalSummary);
    
    // Extract additional skills from GitHub repos
    const repoSkills = this.extractSkillsFromRepos(githubRepos || []);
    const allSkills = [...new Set([...skills, ...repoSkills])];
    
    // Determine suitable industries
    const industries = this.suggestIndustries(allSkills, professionalSummary);
    
    // Calculate salary range based on experience and skills
    const salaryRange = this.calculateSalaryRange(experienceLevel, allSkills);
    
    // Generate improvement suggestions
    const improvements = this.generateImprovementSuggestions(request);
    
    // Calculate marketability score
    const marketabilityScore = this.calculateMarketabilityScore(request);

    return {
      summary: this.generateSummary(request, experienceLevel),
      keySkills: allSkills.slice(0, 12), // Top 12 skills
      experienceLevel,
      industries,
      suggestedJobTypes: this.suggestJobTypes(experienceLevel),
      suggestedSalaryRange: salaryRange,
      improvementSuggestions: improvements,
      marketabilityScore
    };
  }

  private determineExperienceLevel(title: string, summary: string): string {
    const titleLower = title?.toLowerCase() || '';
    const summaryLower = summary?.toLowerCase() || '';
    
    if (titleLower.includes('senior') || titleLower.includes('lead') || titleLower.includes('principal')) {
      return 'Senior';
    }
    if (titleLower.includes('junior') || summaryLower.includes('recent graduate')) {
      return 'Junior';
    }
    if (titleLower.includes('mid') || summaryLower.includes('3-5 years')) {
      return 'Mid-level';
    }
    
    // Default based on summary content
    if (summaryLower.includes('experienced') || summaryLower.includes('expert')) {
      return 'Senior';
    }
    
    return 'Mid-level';
  }

  private extractSkillsFromRepos(repos: GitHubRepo[]): string[] {
    const skills: string[] = [];
    
    repos.forEach(repo => {
      // Add programming language
      if (repo.language) {
        skills.push(repo.language);
      }
      
      // Extract skills from repo name and description
      const text = `${repo.name} ${repo.description || ''}`.toLowerCase();
      
      // Common tech stack mappings
      const techMappings: Record<string, string[]> = {
        'react': ['React', 'JavaScript', 'JSX'],
        'vue': ['Vue.js', 'JavaScript'],
        'angular': ['Angular', 'TypeScript'],
        'node': ['Node.js', 'JavaScript'],
        'python': ['Python'],
        'django': ['Django', 'Python'],
        'flask': ['Flask', 'Python'],
        'express': ['Express.js', 'Node.js'],
        'mongodb': ['MongoDB', 'NoSQL'],
        'postgres': ['PostgreSQL', 'SQL'],
        'mysql': ['MySQL', 'SQL'],
        'redis': ['Redis', 'Caching'],
        'docker': ['Docker', 'DevOps'],
        'kubernetes': ['Kubernetes', 'DevOps'],
        'aws': ['AWS', 'Cloud Computing'],
        'tensorflow': ['TensorFlow', 'Machine Learning'],
        'pytorch': ['PyTorch', 'Machine Learning']
      };

      Object.entries(techMappings).forEach(([keyword, techSkills]) => {
        if (text.includes(keyword)) {
          skills.push(...techSkills);
        }
      });

      // Add topics if available
      if (repo.topics) {
        skills.push(...repo.topics.map(topic => 
          topic.charAt(0).toUpperCase() + topic.slice(1)
        ));
      }
    });

    return [...new Set(skills)]; // Remove duplicates
  }

  private suggestIndustries(skills: string[], summary: string): string[] {
    const industries: string[] = [];
    const skillsLower = skills.map(s => s.toLowerCase());
    const summaryLower = summary?.toLowerCase() || '';

    // Technology/Software
    if (skillsLower.some(s => ['javascript', 'python', 'react', 'node.js'].includes(s))) {
      industries.push('Technology', 'Software Development');
    }

    // Fintech
    if (summaryLower.includes('fintech') || summaryLower.includes('finance') || 
        skillsLower.some(s => ['blockchain', 'cryptocurrency'].includes(s))) {
      industries.push('Fintech', 'Financial Services');
    }

    // E-commerce
    if (summaryLower.includes('e-commerce') || summaryLower.includes('ecommerce') ||
        skillsLower.some(s => ['shopify', 'magento'].includes(s))) {
      industries.push('E-commerce', 'Retail Technology');
    }

    // Healthcare
    if (summaryLower.includes('healthcare') || summaryLower.includes('medical')) {
      industries.push('Healthcare Technology', 'Digital Health');
    }

    // AI/ML
    if (skillsLower.some(s => ['tensorflow', 'pytorch', 'machine learning', 'ai'].includes(s))) {
      industries.push('Artificial Intelligence', 'Machine Learning', 'Data Science');
    }

    // Default industries if none detected
    if (industries.length === 0) {
      industries.push('Technology', 'Software Development', 'Startups');
    }

    return industries.slice(0, 6); // Limit to 6 industries
  }

  private calculateSalaryRange(experienceLevel: string, skills: string[]): { min: number; max: number; currency: string } {
    let baseMin = 50000;
    let baseMax = 80000;

    // Adjust based on experience level
    switch (experienceLevel) {
      case 'Junior':
        baseMin = 45000;
        baseMax = 65000;
        break;
      case 'Mid-level':
        baseMin = 60000;
        baseMax = 85000;
        break;
      case 'Senior':
        baseMin = 80000;
        baseMax = 120000;
        break;
    }

    // Skill premiums
    const premiumSkills = [
      'React', 'Vue.js', 'Angular', 'Node.js', 'Python', 'Go', 'Rust',
      'AWS', 'Docker', 'Kubernetes', 'Machine Learning', 'AI', 'Blockchain'
    ];

    const skillBonus = skills.filter(skill => 
      premiumSkills.includes(skill)
    ).length * 3000;

    return {
      min: Math.round(baseMin + skillBonus),
      max: Math.round(baseMax + skillBonus),
      currency: 'EUR'
    };
  }

  private suggestJobTypes(experienceLevel: string): string[] {
    const baseTypes = ['full-time'];
    
    if (experienceLevel === 'Senior') {
      baseTypes.push('contract', 'consulting');
    }
    
    if (experienceLevel !== 'Junior') {
      baseTypes.push('part-time');
    }

    return baseTypes;
  }

  private generateSummary(request: CVAnalysisRequest, experienceLevel: string): string {
    const { currentTitle, skills, githubRepos } = request;
    
    const topSkills = skills.slice(0, 3).join(', ');
    const repoCount = githubRepos?.length || 0;
    
    let summary = `Based on your profile as a ${currentTitle || 'software professional'}, you demonstrate ${experienceLevel.toLowerCase()} level expertise`;
    
    if (topSkills) {
      summary += ` with strong skills in ${topSkills}`;
    }
    
    if (repoCount > 0) {
      summary += `. Your ${repoCount} GitHub repositories showcase practical experience with modern development practices`;
    }
    
    summary += '. Your background suggests good alignment with technology roles';
    
    // Add specific insights based on skills
    if (skills.some(s => ['React', 'Vue.js', 'Angular'].includes(s))) {
      summary += ', particularly in frontend development';
    }
    
    if (skills.some(s => ['Node.js', 'Python', 'Go'].includes(s))) {
      summary += ', with strong backend capabilities';
    }
    
    if (skills.some(s => ['AWS', 'Docker', 'Kubernetes'].includes(s))) {
      summary += ', and solid DevOps knowledge';
    }
    
    summary += '.';
    
    return summary;
  }

  private generateImprovementSuggestions(request: CVAnalysisRequest): string[] {
    const suggestions: string[] = [];
    const { skills, githubRepos, linkedinUrl } = request;
    
    // GitHub suggestions
    if (!githubRepos || githubRepos.length === 0) {
      suggestions.push('Add GitHub repositories to showcase your coding skills');
    } else if (githubRepos.length < 3) {
      suggestions.push('Add more GitHub projects to demonstrate diverse technical skills');
    }
    
    // Skills suggestions
    if (skills.length < 8) {
      suggestions.push('Expand your skills list to include more technologies and tools');
    }
    
    // Modern tech stack suggestions
    const modernSkills = ['TypeScript', 'React', 'Docker', 'AWS', 'GraphQL'];
    const missingModernSkills = modernSkills.filter(skill => !skills.includes(skill));
    
    if (missingModernSkills.length > 2) {
      suggestions.push(`Consider learning modern technologies like ${missingModernSkills.slice(0, 2).join(' or ')}`);
    }
    
    // LinkedIn suggestion
    if (!linkedinUrl) {
      suggestions.push('Add your LinkedIn profile to increase professional visibility');
    }
    
    // Project descriptions
    if (githubRepos && githubRepos.some(repo => !repo.description)) {
      suggestions.push('Add descriptions to your GitHub repositories to explain their purpose and impact');
    }
    
    return suggestions.slice(0, 4); // Limit to 4 suggestions
  }

  private calculateMarketabilityScore(request: CVAnalysisRequest): number {
    let score = 60; // Base score
    
    const { skills, githubRepos, professionalSummary, linkedinUrl } = request;
    
    // Skills scoring (max 25 points)
    const inDemandSkills = [
      'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 
      'AWS', 'Docker', 'Kubernetes', 'GraphQL', 'MongoDB'
    ];
    const matchingSkills = skills.filter(skill => inDemandSkills.includes(skill));
    score += Math.min(matchingSkills.length * 2.5, 25);
    
    // GitHub activity (max 15 points)
    if (githubRepos && githubRepos.length > 0) {
      score += Math.min(githubRepos.length * 3, 15);
      
      // Bonus for recent activity
      const recentRepos = githubRepos.filter(repo => {
        const lastUpdate = new Date(repo.updated_at);
        const monthsAgo = new Date();
        monthsAgo.setMonth(monthsAgo.getMonth() - 6);
        return lastUpdate > monthsAgo;
      });
      
      if (recentRepos.length > 0) {
        score += 5;
      }
    }
    
    // Professional summary quality (max 10 points)
    if (professionalSummary && professionalSummary.length > 100) {
      score += 10;
    } else if (professionalSummary && professionalSummary.length > 50) {
      score += 5;
    }
    
    // LinkedIn presence (5 points)
    if (linkedinUrl) {
      score += 5;
    }
    
    return Math.min(Math.round(score), 100);
  }

  // Utility method to get skill suggestions based on current skills
  getSkillSuggestions(currentSkills: string[]): string[] {
    const allSkills = [
      'JavaScript', 'TypeScript', 'React', 'Vue.js', 'Angular', 'Node.js',
      'Python', 'Java', 'Go', 'Rust', 'PHP', 'C++', 'C#',
      'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes',
      'MongoDB', 'PostgreSQL', 'Redis', 'MySQL',
      'GraphQL', 'REST APIs', 'Microservices',
      'Git', 'CI/CD', 'Jenkins', 'GitHub Actions',
      'Machine Learning', 'AI', 'Data Science', 'TensorFlow', 'PyTorch',
      'Agile', 'Scrum', 'Project Management'
    ];
    
    return allSkills
      .filter(skill => !currentSkills.includes(skill))
      .slice(0, 10);
  }
}

export const cvAnalysisService = new CVAnalysisService();
export type { CVAnalysis, CVAnalysisRequest, GitHubRepo };