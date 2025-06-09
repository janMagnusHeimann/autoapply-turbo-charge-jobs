import { pdf } from '@react-pdf/renderer';
import { supabase } from '@/integrations/supabase/client';
import { jobAnalysisService } from './jobAnalysisService';
import { CVDocument, CV_TEMPLATES } from './pdfTemplates';
import type { 
  CVData, 
  CVGeneration, 
  CVTemplate, 
  UserProfile, 
  WorkExperience, 
  GitHubProject, 
  Publication, 
  Skill,
  JobAnalysis,
  ApplicationRecord
} from '@/types/cv';
import type { JobOpportunity } from './autonomousJobAgent';

/**
 * Dynamic CV Generation Service
 * Creates personalized PDF resumes optimized for specific job applications
 */
export class CVGenerationService {
  /**
   * Generate a complete CV for a specific job application
   */
  async generateCV(
    userId: string,
    jobOpportunity: JobOpportunity,
    templateId: string = 'technical'
  ): Promise<CVGeneration> {
    try {
      // 1. Fetch user profile and data
      const userProfile = await this.fetchUserProfile(userId);
      const experiences = await this.fetchUserExperiences(userId);
      const projects = await this.fetchGitHubProjects(userId);
      const publications = await this.fetchPublications(userId);
      const skills = await this.fetchUserSkills(userId);

      // 2. Analyze job requirements using AI
      const jobAnalysis = await jobAnalysisService.analyzeJobDescription(
        jobOpportunity.title,
        jobOpportunity.description || '',
        `Company: ${jobOpportunity.company}, Location: ${jobOpportunity.location}`
      );

      // 3. Optimize content selection using AI
      const optimizedContent = await this.optimizeContentForJob(
        userProfile,
        experiences,
        projects,
        publications,
        skills,
        jobAnalysis
      );

      // 4. Get template configuration
      const template = this.getTemplate(templateId);

      // 5. Generate PDF
      const pdfBlob = await this.generatePDF(optimizedContent, template);

      // 6. Upload PDF to storage
      const pdfUrl = await this.uploadPDF(pdfBlob, userId, jobOpportunity.id);

      // 7. Create generation record
      const cvGeneration: CVGeneration = {
        id: `cv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        jobId: jobOpportunity.id,
        templateId,
        cvData: optimizedContent,
        pdfUrl,
        optimizationMetadata: {
          analysisTime: Date.now() - performance.now(),
          selectedProjectsCount: optimizedContent.selectedProjects.length,
          selectedPublicationsCount: optimizedContent.selectedPublications.length,
          highlightedSkillsCount: optimizedContent.skills.highlighted.length,
          relevanceScore: this.calculateRelevanceScore(optimizedContent, jobAnalysis),
          customizations: optimizedContent.optimizationNotes
        },
        status: 'ready',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 8. Save to database (if available)
      await this.saveCVGeneration(cvGeneration);

      return cvGeneration;

    } catch (error) {
      console.error('Error generating CV:', error);
      throw new Error(`CV generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Optimize content selection and customization for specific job
   */
  private async optimizeContentForJob(
    userProfile: UserProfile,
    experiences: WorkExperience[],
    projects: GitHubProject[],
    publications: Publication[],
    skills: Skill[],
    jobAnalysis: JobAnalysis
  ): Promise<CVData> {
    const optimizationNotes: string[] = [];

    // 1. Score and select projects
    const scoredProjects = await jobAnalysisService.scoreProjectRelevance(projects, jobAnalysis);
    const selectedProjects = scoredProjects.slice(0, 4);
    optimizationNotes.push(`Selected ${selectedProjects.length} most relevant projects`);

    // 2. Score and select publications
    const scoredPublications = await jobAnalysisService.scorePublicationRelevance(publications, jobAnalysis);
    const selectedPublications = scoredPublications.slice(0, 3);
    if (selectedPublications.length > 0) {
      optimizationNotes.push(`Selected ${selectedPublications.length} relevant publications`);
    }

    // 3. Score and highlight skills
    const scoredSkills = jobAnalysisService.scoreSkillRelevance(skills, jobAnalysis);
    const highlightedSkills = scoredSkills
      .filter(skill => skill.isHighlighted)
      .map(skill => skill.name);
    optimizationNotes.push(`Highlighted ${highlightedSkills.length} key skills`);

    // 4. Optimize work experience
    const optimizedExperiences = await jobAnalysisService.optimizeExperienceBullets(
      experiences,
      jobAnalysis
    );
    optimizationNotes.push('Reordered experience bullets to emphasize relevance');

    // 5. Generate custom professional summary
    const summaryOptimization = await jobAnalysisService.optimizeProfessionalSummary(
      userProfile.professionalSummary,
      jobAnalysis,
      { title: userProfile.title, name: userProfile.name }
    );
    optimizationNotes.push('Customized professional summary for job requirements');

    return {
      profile: userProfile,
      experiences: optimizedExperiences,
      selectedProjects,
      selectedPublications,
      skills: {
        all: scoredSkills,
        highlighted: highlightedSkills
      },
      customSummary: summaryOptimization.optimizedContent,
      optimizationNotes
    };
  }

  /**
   * Generate PDF from CV data and template
   */
  private async generatePDF(cvData: CVData, template: CVTemplate): Promise<Blob> {
    try {
      const doc = CVDocument({ cvData, template });
      const pdfBlob = await pdf(doc).toBlob();
      return pdfBlob;
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  /**
   * Upload PDF to storage service
   */
  private async uploadPDF(pdfBlob: Blob, userId: string, jobId: string): Promise<string> {
    try {
      const fileName = `cv-${userId}-${jobId}-${Date.now()}.pdf`;
      const { data, error } = await supabase.storage
        .from('cv-pdfs')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (error) {
        throw new Error(`Storage upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('cv-pdfs')
        .getPublicUrl(fileName);

      return urlData.publicUrl;

    } catch (error) {
      console.error('PDF upload error:', error);
      // Fallback: return a data URL for demo purposes
      return URL.createObjectURL(pdfBlob);
    }
  }

  /**
   * Fetch user profile data
   */
  private async fetchUserProfile(userId: string): Promise<UserProfile> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.full_name || 'John Developer',
        email: data.email || 'john@example.com',
        phone: '+1 (555) 123-4567',
        location: 'Berlin, Germany',
        linkedinUrl: 'https://linkedin.com/in/johndeveloper',
        portfolioUrl: 'https://johndeveloper.dev',
        githubUrl: data.github_username ? `https://github.com/${data.github_username}` : 'https://github.com/johndeveloper',
        professionalSummary: 'Experienced software engineer with a passion for building scalable applications and leading high-performing teams. Proven track record of delivering complex projects on time and mentoring junior developers.',
        title: 'Senior Software Engineer'
      };
    } catch (error) {
      // Fallback mock data
      return this.getMockUserProfile();
    }
  }

  /**
   * Fetch user work experiences
   */
  private async fetchUserExperiences(userId: string): Promise<WorkExperience[]> {
    // For now, return mock data. In production, this would fetch from database
    return this.getMockExperiences();
  }

  /**
   * Fetch GitHub projects
   */
  private async fetchGitHubProjects(userId: string): Promise<GitHubProject[]> {
    // For now, return mock data. In production, this would sync from GitHub API
    return this.getMockGitHubProjects();
  }

  /**
   * Fetch academic publications
   */
  private async fetchPublications(userId: string): Promise<Publication[]> {
    // For now, return mock data. In production, this would sync from Google Scholar
    return this.getMockPublications();
  }

  /**
   * Fetch user skills
   */
  private async fetchUserSkills(userId: string): Promise<Skill[]> {
    // For now, return mock data. In production, this would fetch from database
    return this.getMockSkills();
  }

  /**
   * Get template configuration
   */
  private getTemplate(templateId: string): CVTemplate {
    const template = CV_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    return template;
  }

  /**
   * Calculate overall relevance score
   */
  private calculateRelevanceScore(cvData: CVData, jobAnalysis: JobAnalysis): number {
    let totalScore = 0;
    let itemCount = 0;

    // Score selected projects
    cvData.selectedProjects.forEach(project => {
      totalScore += project.relevanceScore || 0;
      itemCount++;
    });

    // Score selected publications
    cvData.selectedPublications.forEach(pub => {
      totalScore += pub.relevanceScore || 0;
      itemCount++;
    });

    // Score highlighted skills
    const highlightedSkills = cvData.skills.all.filter(skill => skill.isHighlighted);
    highlightedSkills.forEach(skill => {
      totalScore += skill.relevanceScore || 0;
      itemCount++;
    });

    return itemCount > 0 ? totalScore / itemCount : 0.5;
  }

  /**
   * Save CV generation to database
   */
  private async saveCVGeneration(cvGeneration: CVGeneration): Promise<void> {
    try {
      const { error } = await supabase
        .from('cv_generations')
        .insert([{
          id: cvGeneration.id,
          user_id: cvGeneration.userId,
          job_id: cvGeneration.jobId,
          template_id: cvGeneration.templateId,
          pdf_url: cvGeneration.pdfUrl,
          cv_data: cvGeneration.cvData,
          optimization_metadata: cvGeneration.optimizationMetadata,
          status: cvGeneration.status,
          created_at: cvGeneration.createdAt,
          updated_at: cvGeneration.updatedAt
        }]);

      if (error) {
        console.error('Error saving CV generation:', error);
      }
    } catch (error) {
      console.error('Database save error:', error);
      // Continue without saving - CV generation still succeeds
    }
  }

  /**
   * Create application record
   */
  async createApplicationRecord(
    userId: string,
    jobOpportunity: JobOpportunity,
    cvGenerationId: string
  ): Promise<ApplicationRecord> {
    const applicationRecord: ApplicationRecord = {
      id: `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      jobId: jobOpportunity.id,
      cvGenerationId,
      companyName: jobOpportunity.company,
      jobTitle: jobOpportunity.title,
      applicationMethod: 'website',
      status: 'draft',
      notes: `Application prepared for ${jobOpportunity.title} at ${jobOpportunity.company}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from('application_history')
        .insert([{
          id: applicationRecord.id,
          user_id: applicationRecord.userId,
          job_listing_id: applicationRecord.jobId,
          company_id: null, // Would need company mapping
          submitted_cv_url: null, // Will be updated when application is submitted
          cover_letter: null,
          submission_method: applicationRecord.applicationMethod,
          submitted_at: applicationRecord.appliedAt,
          status: applicationRecord.status,
          notes: applicationRecord.notes,
          created_at: applicationRecord.createdAt,
          updated_at: applicationRecord.updatedAt
        }]);

      if (error) {
        console.error('Error saving application record:', error);
      }
    } catch (error) {
      console.error('Database save error:', error);
    }

    return applicationRecord;
  }

  /**
   * Get available templates
   */
  getAvailableTemplates(): CVTemplate[] {
    return CV_TEMPLATES;
  }

  // Mock data methods (replace with real data fetching in production)

  private getMockUserProfile(): UserProfile {
    return {
      id: 'mock-user-id',
      name: 'Alex Schmidt',
      email: 'alex.schmidt@email.com',
      phone: '+49 30 12345678',
      location: 'Berlin, Germany',
      linkedinUrl: 'https://linkedin.com/in/alexschmidt',
      portfolioUrl: 'https://alexschmidt.dev',
      githubUrl: 'https://github.com/alexschmidt',
      professionalSummary: 'Experienced software engineer with 5+ years of expertise in full-stack development, cloud architecture, and team leadership. Passionate about building scalable applications using modern technologies and agile methodologies.',
      title: 'Senior Software Engineer'
    };
  }

  private getMockExperiences(): WorkExperience[] {
    return [
      {
        id: 'exp-1',
        company: 'TechFlow Solutions',
        position: 'Senior Software Engineer',
        location: 'Berlin, Germany',
        startDate: '2022-03',
        endDate: undefined,
        description: 'Lead development of cloud-native applications',
        achievements: [
          'Led a team of 4 engineers in redesigning the core platform architecture',
          'Reduced system response time by 40% through performance optimizations',
          'Implemented CI/CD pipeline reducing deployment time from hours to minutes',
          'Mentored 2 junior developers and conducted technical interviews'
        ],
        technologies: ['TypeScript', 'React', 'Node.js', 'AWS', 'Docker', 'PostgreSQL'],
        relevanceScore: 0.9
      },
      {
        id: 'exp-2',
        company: 'StartupX',
        position: 'Full Stack Developer',
        location: 'Munich, Germany',
        startDate: '2020-01',
        endDate: '2022-02',
        description: 'Full-stack development for fintech platform',
        achievements: [
          'Built customer-facing dashboard serving 10k+ daily active users',
          'Developed secure payment processing system with 99.9% uptime',
          'Collaborated with product team to define technical requirements',
          'Implemented automated testing reducing bugs by 60%'
        ],
        technologies: ['JavaScript', 'Vue.js', 'Python', 'Django', 'Redis', 'MongoDB'],
        relevanceScore: 0.8
      },
      {
        id: 'exp-3',
        company: 'Digital Agency Pro',
        position: 'Frontend Developer',
        location: 'Hamburg, Germany',
        startDate: '2019-06',
        endDate: '2019-12',
        description: 'Frontend development for various client projects',
        achievements: [
          'Delivered 8 client projects on time and within budget',
          'Improved page load speeds by 50% through code optimization',
          'Created reusable component library used across multiple projects'
        ],
        technologies: ['React', 'JavaScript', 'SASS', 'Webpack', 'Git'],
        relevanceScore: 0.6
      }
    ];
  }

  private getMockGitHubProjects(): GitHubProject[] {
    return [
      {
        id: 'proj-1',
        name: 'cloud-config-manager',
        description: 'A TypeScript library for managing cloud infrastructure configuration with automated deployment pipelines',
        url: 'https://github.com/alexschmidt/cloud-config-manager',
        language: 'TypeScript',
        stars: 234,
        forks: 42,
        topics: ['typescript', 'aws', 'infrastructure', 'devops'],
        technologies: ['TypeScript', 'AWS CDK', 'Docker', 'Jest'],
        impactStatement: 'Reduced infrastructure setup time by 70% for development teams',
        relevanceScore: 0.95,
        lastUpdated: '2024-01-15',
        isPrivate: false
      },
      {
        id: 'proj-2',
        name: 'react-dashboard-components',
        description: 'A comprehensive React component library for building analytics dashboards with customizable charts and data visualizations',
        url: 'https://github.com/alexschmidt/react-dashboard-components',
        language: 'TypeScript',
        stars: 156,
        forks: 28,
        topics: ['react', 'typescript', 'dashboard', 'components'],
        technologies: ['React', 'TypeScript', 'D3.js', 'Storybook'],
        impactStatement: 'Used by 50+ companies for building internal dashboards',
        relevanceScore: 0.88,
        lastUpdated: '2024-01-10',
        isPrivate: false
      },
      {
        id: 'proj-3',
        name: 'microservices-api-gateway',
        description: 'High-performance API gateway for microservices architecture with load balancing, rate limiting, and monitoring',
        url: 'https://github.com/alexschmidt/microservices-api-gateway',
        language: 'Go',
        stars: 89,
        forks: 15,
        topics: ['golang', 'microservices', 'api-gateway', 'performance'],
        technologies: ['Go', 'Redis', 'Prometheus', 'Docker'],
        impactStatement: 'Handles 1M+ requests per day with <50ms latency',
        relevanceScore: 0.82,
        lastUpdated: '2023-12-20',
        isPrivate: false
      },
      {
        id: 'proj-4',
        name: 'ml-model-deployment',
        description: 'Automated ML model deployment pipeline with A/B testing and monitoring capabilities',
        url: 'https://github.com/alexschmidt/ml-model-deployment',
        language: 'Python',
        stars: 67,
        forks: 12,
        topics: ['python', 'machine-learning', 'mlops', 'deployment'],
        technologies: ['Python', 'FastAPI', 'MLflow', 'Kubernetes'],
        impactStatement: 'Streamlined ML model deployment for data science teams',
        relevanceScore: 0.75,
        lastUpdated: '2023-11-30',
        isPrivate: false
      }
    ];
  }

  private getMockPublications(): Publication[] {
    return [
      {
        id: 'pub-1',
        title: 'Optimizing Cloud Resource Allocation Using Machine Learning Approaches',
        authors: ['Alex Schmidt', 'Dr. Maria Weber', 'Prof. Thomas Mueller'],
        venue: 'IEEE Cloud Computing Conference',
        year: 2023,
        url: 'https://ieeexplore.ieee.org/document/12345',
        keywords: ['cloud computing', 'machine learning', 'resource allocation'],
        relevanceScore: 0.9,
        citationCount: 12
      },
      {
        id: 'pub-2',
        title: 'Performance Analysis of Microservices Communication Patterns',
        authors: ['Alex Schmidt', 'Dr. Julia Fischer'],
        venue: 'ACM Symposium on Software Engineering',
        year: 2022,
        url: 'https://dl.acm.org/doi/10.1145/54321',
        keywords: ['microservices', 'performance', 'software architecture'],
        relevanceScore: 0.85,
        citationCount: 8
      }
    ];
  }

  private getMockSkills(): Skill[] {
    return [
      { id: 'skill-1', name: 'TypeScript', category: 'programming', proficiencyLevel: 'expert', yearsOfExperience: 4, relevanceScore: 0.95, isHighlighted: true },
      { id: 'skill-2', name: 'React', category: 'framework', proficiencyLevel: 'expert', yearsOfExperience: 5, relevanceScore: 0.92, isHighlighted: true },
      { id: 'skill-3', name: 'Node.js', category: 'framework', proficiencyLevel: 'advanced', yearsOfExperience: 4, relevanceScore: 0.88, isHighlighted: true },
      { id: 'skill-4', name: 'AWS', category: 'tool', proficiencyLevel: 'advanced', yearsOfExperience: 3, relevanceScore: 0.85, isHighlighted: true },
      { id: 'skill-5', name: 'Docker', category: 'tool', proficiencyLevel: 'advanced', yearsOfExperience: 3, relevanceScore: 0.82, isHighlighted: false },
      { id: 'skill-6', name: 'PostgreSQL', category: 'tool', proficiencyLevel: 'advanced', yearsOfExperience: 4, relevanceScore: 0.78, isHighlighted: false },
      { id: 'skill-7', name: 'Python', category: 'programming', proficiencyLevel: 'intermediate', yearsOfExperience: 2, relevanceScore: 0.72, isHighlighted: false },
      { id: 'skill-8', name: 'Kubernetes', category: 'tool', proficiencyLevel: 'intermediate', yearsOfExperience: 2, relevanceScore: 0.68, isHighlighted: false },
      { id: 'skill-9', name: 'Team Leadership', category: 'soft', proficiencyLevel: 'advanced', yearsOfExperience: 3, relevanceScore: 0.75, isHighlighted: false },
      { id: 'skill-10', name: 'Agile Methodology', category: 'soft', proficiencyLevel: 'expert', yearsOfExperience: 5, relevanceScore: 0.70, isHighlighted: false }
    ];
  }
}

// Export singleton instance
export const cvGenerationService = new CVGenerationService();