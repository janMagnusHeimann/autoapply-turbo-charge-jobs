import { pdf } from '@react-pdf/renderer';
import { supabase } from '@/integrations/supabase/client';
import { jobAnalysisService } from './jobAnalysisService';
import { CVDocument, CV_TEMPLATES } from './pdfTemplates';
import { UserService } from './userService';
import type {
  CVData,
  CVGeneration,
  CVTemplate,
  UserProfile,
  WorkExperience,
  Education,
  GitHubProject,
  Publication,
  Skill,
  JobAnalysis,
  ApplicationRecord,
  JobOpportunity
} from '@/types/cv';

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
      console.log('CV Generation: Starting CV generation for user:', userId);
      console.log('CV Generation: Job opportunity:', jobOpportunity);
      
      // Track missing data for user feedback
      const missingDataWarnings: string[] = [];
      
      // 1. Fetch user profile and data with error handling
      const userProfile = await this.fetchUserProfile(userId);
      console.log('User profile fetched:', userProfile?.name);
      
      const experiences = await this.fetchUserExperiences(userId);
      console.log('Experiences fetched:', experiences?.length || 0);
      
      // Ensure experiences have required properties
      const validExperiences = experiences.map(exp => ({
        ...exp,
        technologies: exp.technologies || exp.skills || [],
        achievements: exp.achievements || (exp.description ? [exp.description] : []),
        skills: exp.skills || []
      }));
      
      const projects = await this.fetchGitHubProjects(userId);
      console.log('Projects fetched:', projects?.length || 0);
      if (projects.length === 0) {
        missingDataWarnings.push('No GitHub projects found. Connect your GitHub account or add projects manually to showcase your work.');
      }
      
      const publications = await this.fetchPublications(userId);
      console.log('Publications fetched:', publications?.length || 0);
      if (publications.length === 0) {
        missingDataWarnings.push('No publications found. Connect your Google Scholar account or add publications manually to highlight your research.');
      }
      
      const skills = await this.fetchUserSkills(userId);
      console.log('Skills fetched:', skills?.length || 0);
      if (skills.length === 0) {
        missingDataWarnings.push('No skills found. Update your preferences to include your technical skills.');
      }
      
      const education = await this.fetchUserEducation(userId);
      console.log('Education fetched:', education?.length || 0);
      if (education.length === 0) {
        missingDataWarnings.push('No education found. Add your educational background to strengthen your CV.');
      }
      
      if (validExperiences.length === 0) {
        missingDataWarnings.push('No work experience found. Add your professional experience to strengthen your CV.');
      }
      
      // Check for incomplete profile
      if (!userProfile.professionalSummary || userProfile.professionalSummary.includes('Experienced professional with expertise')) {
        missingDataWarnings.push('Professional summary is generic. Update your profile with a personalized summary.');
      }
      
      if (!userProfile.phone && !userProfile.linkedinUrl && !userProfile.githubUrl) {
        missingDataWarnings.push('Contact information is incomplete. Add phone number, LinkedIn, or GitHub URL to your profile.');
      }

      // 2. Analyze job requirements using AI
      const jobAnalysis = await jobAnalysisService.analyzeJobDescription(
        jobOpportunity.title,
        jobOpportunity.description || '',
        `Company: ${jobOpportunity.company || 'Company'}, Location: ${jobOpportunity.location || 'Location'}`
      );

      // 3. Optimize content selection using AI
      const optimizedContent = await this.optimizeContentForJob(
        userProfile,
        validExperiences,
        education,
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
          customizations: optimizedContent.optimizationNotes,
          missingDataWarnings: missingDataWarnings
        },
        status: 'ready',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 8. Save to database (if available)
      await this.saveCVGeneration(cvGeneration);
      
      // 9. Log warnings for missing data (these will be shown to user via metadata)
      if (missingDataWarnings.length > 0) {
        console.warn('CV Generation completed with missing data:', missingDataWarnings);
      }

      return cvGeneration;

    } catch (error) {
      console.error('Error generating CV:', error);
      
      // Check if error is due to insufficient data
      if (missingDataWarnings && missingDataWarnings.length > 0) {
        const missingDataError = new Error(
          `CV generation completed but with limited data. To improve your CV, please:\n\n${missingDataWarnings.map(w => `• ${w}`).join('\n')}`
        );
        missingDataError.name = 'InsufficientDataError';
        throw missingDataError;
      }
      
      throw new Error(`CV generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Optimize content selection and customization for specific job
   */
  private async optimizeContentForJob(
    userProfile: UserProfile,
    experiences: WorkExperience[],
    education: Education[],
    projects: GitHubProject[],
    publications: Publication[],
    skills: Skill[],
    jobAnalysis: JobAnalysis
  ): Promise<CVData> {
    const optimizationNotes: string[] = [];

    // Ensure all arrays are defined
    const safeProjects = Array.isArray(projects) ? projects : [];
    const safePublications = Array.isArray(publications) ? publications : [];
    const safeSkills = Array.isArray(skills) ? skills : [];
    const safeExperiences = Array.isArray(experiences) ? experiences : [];

    // 1. Score and select projects
    let selectedProjects: GitHubProject[] = [];
    try {
      const scoredProjects = await jobAnalysisService.scoreProjectRelevance(safeProjects, jobAnalysis);
      selectedProjects = Array.isArray(scoredProjects) ? scoredProjects.slice(0, 4) : safeProjects.slice(0, 4);
    } catch (error) {
      console.error('Error scoring projects:', error);
      selectedProjects = safeProjects.slice(0, 4);
    }
    optimizationNotes.push(`Selected ${selectedProjects.length} most relevant projects`);

    // 2. Score and select publications
    let selectedPublications: Publication[] = [];
    try {
      const scoredPublications = await jobAnalysisService.scorePublicationRelevance(safePublications, jobAnalysis);
      selectedPublications = Array.isArray(scoredPublications) ? scoredPublications.slice(0, 3) : safePublications.slice(0, 3);
    } catch (error) {
      console.error('Error scoring publications:', error);
      selectedPublications = safePublications.slice(0, 3);
    }
    if (selectedPublications.length > 0) {
      optimizationNotes.push(`Selected ${selectedPublications.length} relevant publications`);
    }

    // 3. Score and highlight skills
    let scoredSkills: Skill[] = [];
    let highlightedSkills: string[] = [];
    try {
      scoredSkills = jobAnalysisService.scoreSkillRelevance(safeSkills, jobAnalysis);
      if (Array.isArray(scoredSkills)) {
        highlightedSkills = scoredSkills
          .filter(skill => skill && skill.isHighlighted)
          .map(skill => skill.name)
          .filter(name => name); // Remove any undefined names
      } else {
        scoredSkills = safeSkills;
        highlightedSkills = safeSkills.slice(0, 5).map(skill => skill.name).filter(name => name);
      }
    } catch (error) {
      console.error('Error scoring skills:', error);
      scoredSkills = safeSkills;
      highlightedSkills = safeSkills.slice(0, 5).map(skill => skill.name).filter(name => name);
    }
    optimizationNotes.push(`Highlighted ${highlightedSkills.length} key skills`);

    // 4. Optimize work experience
    let optimizedExperiences: WorkExperience[] = [];
    try {
      optimizedExperiences = await jobAnalysisService.optimizeExperienceBullets(
        safeExperiences,
        jobAnalysis
      );
      if (!Array.isArray(optimizedExperiences)) {
        optimizedExperiences = safeExperiences;
      }
    } catch (error) {
      console.error('Error optimizing experiences:', error);
      optimizedExperiences = safeExperiences;
    }
    optimizationNotes.push('Reordered experience bullets to emphasize relevance');

    // 5. Generate custom professional summary
    let customSummary = userProfile.professionalSummary;
    try {
      const summaryOptimization = await jobAnalysisService.optimizeProfessionalSummary(
        userProfile.professionalSummary,
        jobAnalysis,
        { title: userProfile.title, name: userProfile.name }
      );
      customSummary = summaryOptimization?.optimizedContent || userProfile.professionalSummary;
    } catch (error) {
      console.error('Error optimizing summary:', error);
      customSummary = userProfile.professionalSummary;
    }
    optimizationNotes.push('Customized professional summary for job requirements');

    return {
      profile: userProfile,
      experiences: optimizedExperiences,
      education: education || [],
      selectedProjects,
      selectedPublications,
      skills: {
        all: scoredSkills,
        highlighted: highlightedSkills
      },
      customSummary,
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
    // In development mode or if storage fails, use blob URL for immediate functionality
    if (import.meta.env.DEV) {
      const dataUrl = URL.createObjectURL(pdfBlob);
      console.log('Development mode: Using blob URL for PDF:', dataUrl);
      return dataUrl;
    }

    try {
      // Clean the jobId to make it a valid filename
      const cleanJobId = jobId.replace(/[^a-zA-Z0-9-_]/g, '_');
      const fileName = `cv-${userId}-${cleanJobId}-${Date.now()}.pdf`;
      
      const { data, error } = await supabase.storage
        .from('cv-pdfs')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true  // Allow overwrite
        });

      if (error) {
        console.warn('Storage upload failed, using fallback:', error.message);
        // Fallback: return a blob URL
        const dataUrl = URL.createObjectURL(pdfBlob);
        return dataUrl;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('cv-pdfs')
        .getPublicUrl(fileName);

      console.log('PDF uploaded successfully to storage');
      return urlData.publicUrl;

    } catch (error) {
      console.warn('PDF upload error, using fallback:', error);
      // Fallback: return a blob URL for immediate functionality
      const dataUrl = URL.createObjectURL(pdfBlob);
      return dataUrl;
    }
  }

  /**
   * Fetch user profile data from the correct user_profiles table
   */
  private async fetchUserProfile(userId: string): Promise<UserProfile> {
    try {
      console.log('CV Generation: Fetching user profile for userId:', userId);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('CV Generation: User profile not found, creating basic profile with saved social links');
          // User profile doesn't exist, try to create one with social links from localStorage
          return await this.createBasicUserProfile(userId);
        }
        console.error('Error fetching user profile from database:', error);
        throw error;
      }

      console.log('CV Generation: User profile data found:', data);

      const userProfile = {
        id: data.user_id,
        name: data.full_name || 'Professional User',
        email: data.email || 'user@example.com',
        phone: data.phone || undefined,
        location: data.location || 'Global',
        linkedinUrl: data.linkedin_url || undefined,
        portfolioUrl: data.portfolio_url || undefined,
        githubUrl: data.github_url || undefined,
        twitterUrl: data.twitter_url || undefined,
        mediumUrl: data.medium_url || undefined,
        blogUrl: data.blog_url || undefined,
        youtubeUrl: data.youtube_url || undefined,
        behanceUrl: data.behance_url || undefined,
        dribbbleUrl: data.dribbble_url || undefined,
        stackoverflowUrl: data.stackoverflow_url || undefined,
        professionalSummary: data.professional_summary || 'Experienced professional with expertise in modern technologies and a proven track record of delivering high-quality solutions.',
        title: data.current_title || 'Software Professional'
      };

      console.log('CV Generation: Using real user profile data:', userProfile);
      return userProfile;
    } catch (error) {
      console.error('CV Generation: Error fetching user profile, creating basic profile:', error);
      // Create basic profile instead of using mock data
      return await this.createBasicUserProfile(userId);
    }
  }



  /**
   * Create a basic user profile if one doesn't exist, incorporating saved social links
   */
  private async createBasicUserProfile(userId: string): Promise<UserProfile> {
    try {
      // Try to get saved social links from localStorage
      const savedSocialLinks = localStorage.getItem(`socialLinks_${userId}`);
      const socialLinks = savedSocialLinks ? JSON.parse(savedSocialLinks) : {};
      
      console.log('CV Generation: Found saved social links:', socialLinks);

      // Create basic user profile with social links
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          email: 'user@example.com', // Will be updated from auth context
          full_name: 'Professional User',
          phone: null,
          location: 'Global',
          linkedin_url: socialLinks.linkedin || null,
          github_url: socialLinks.github || null,
          portfolio_url: socialLinks.portfolio || null,
          twitter_url: socialLinks.x || null,
          medium_url: socialLinks.medium || null,
          blog_url: socialLinks.blog || null,
          youtube_url: socialLinks.youtube || null,
          behance_url: socialLinks.behance || null,
          dribbble_url: socialLinks.dribbble || null,
          stackoverflow_url: socialLinks.stackoverflow || null,
          professional_summary: 'Experienced professional with expertise in modern technologies and a proven track record of delivering high-quality solutions.',
          current_title: 'Software Professional',
          years_of_experience: null
        })
        .select()
        .single();

      if (error) {
        console.error('CV Generation: Error creating user profile:', error);
        // Return a basic profile without saving to database
        return {
          id: userId,
          name: 'Professional User',
          email: 'user@example.com',
          phone: undefined,
          location: 'Global',
          linkedinUrl: socialLinks.linkedin || undefined,
          portfolioUrl: socialLinks.portfolio || undefined,
          githubUrl: socialLinks.github || undefined,
          twitterUrl: socialLinks.x || undefined,
          mediumUrl: socialLinks.medium || undefined,
          blogUrl: socialLinks.blog || undefined,
          youtubeUrl: socialLinks.youtube || undefined,
          behanceUrl: socialLinks.behance || undefined,
          dribbbleUrl: socialLinks.dribbble || undefined,
          stackoverflowUrl: socialLinks.stackoverflow || undefined,
          professionalSummary: 'Experienced professional with expertise in modern technologies and a proven track record of delivering high-quality solutions.',
          title: 'Software Professional'
        };
      }

      console.log('CV Generation: Created new user profile:', data);

      return {
        id: data.user_id,
        name: data.full_name || 'Professional User',
        email: data.email,
        phone: data.phone || undefined,
        location: data.location || 'Global',
        linkedinUrl: data.linkedin_url || undefined,
        portfolioUrl: data.portfolio_url || undefined,
        githubUrl: data.github_url || undefined,
        twitterUrl: data.twitter_url || undefined,
        mediumUrl: data.medium_url || undefined,
        blogUrl: data.blog_url || undefined,
        youtubeUrl: data.youtube_url || undefined,
        behanceUrl: data.behance_url || undefined,
        dribbbleUrl: data.dribbble_url || undefined,
        stackoverflowUrl: data.stackoverflow_url || undefined,
        professionalSummary: data.professional_summary || 'Experienced professional with expertise in modern technologies and a proven track record of delivering high-quality solutions.',
        title: data.current_title || 'Software Professional'
      };
    } catch (error) {
      console.error('CV Generation: Error creating basic user profile:', error);
      // Return a basic profile without saving to database
      return {
        id: userId,
        name: 'Professional User',
        email: 'user@example.com',
        phone: undefined,
        location: 'Global',
        linkedinUrl: undefined,
        portfolioUrl: undefined,
        githubUrl: undefined,
        twitterUrl: undefined,
        mediumUrl: undefined,
        blogUrl: undefined,
        youtubeUrl: undefined,
        behanceUrl: undefined,
        dribbbleUrl: undefined,
        stackoverflowUrl: undefined,
        professionalSummary: 'Experienced professional with expertise in modern technologies and a proven track record of delivering high-quality solutions.',
        title: 'Software Professional'
      };
    }
  }

  /**
   * Fetch user work experiences from cv_assets table
   */
  private async fetchUserExperiences(userId: string): Promise<WorkExperience[]> {
    try {
      console.log('CV Generation: Fetching user experiences for userId:', userId);
      
      const { data, error } = await supabase
        .from('cv_assets')
        .select('*')
        .eq('user_id', userId)
        .eq('asset_type', 'experience')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('CV Generation: Error fetching user experiences from database:', error);
        throw error;
      }

      console.log('CV Generation: User experiences data found:', data);

      const experiences: WorkExperience[] = (data || []).map(asset => {
        const metadata = asset.metadata as any || {};
        return {
          id: asset.id,
          company: metadata.company || 'Company',
          position: asset.title || 'Position',
          location: metadata.location || 'Location',
          startDate: metadata.startDate || '',
          endDate: metadata.current ? null : (metadata.endDate || ''),
          current: metadata.current || false,
          description: asset.description || '',
          achievements: [asset.description || ''],
          skills: asset.tags || [],
          relevanceScore: 0.5
        };
      });

      if (experiences.length > 0) {
        console.log('CV Generation: Using real user experiences:', experiences);
        return experiences;
      } else {
        console.log('CV Generation: No user experiences found, returning empty array');
        return [];
      }
    } catch (error) {
      console.error('CV Generation: Error fetching user experiences:', error);
      return [];
    }
  }

  /**
   * Fetch GitHub projects from selected_repositories table (GitHub integration)
   */
  private async fetchGitHubProjects(userId: string): Promise<GitHubProject[]> {
    try {
      console.log('CV Generation: Fetching GitHub projects for userId:', userId);
      
      // First try to get explicitly selected repositories
      const { data: selectedData, error: selectedError } = await supabase
        .from('selected_repositories')
        .select('*')
        .eq('user_id', userId)
        .eq('is_selected', true)
        .order('stars_count', { ascending: false });

      if (selectedError) {
        console.error('CV Generation: Error fetching selected repositories:', selectedError);
        throw selectedError;
      }
      
      console.log('CV Generation: Selected repositories query result:', selectedData?.length || 0, 'repositories');
      console.log('CV Generation: Selected repositories data:', selectedData);

      if (selectedData && selectedData.length > 0) {
        // Use selected repositories with user descriptions
        const projects: GitHubProject[] = selectedData.map(repo => ({
          id: repo.github_repo_id.toString(),
          name: repo.repo_name,
          description: repo.user_description || repo.repo_description || '',
          url: repo.repo_url,
          language: repo.programming_languages?.[0] || '',
          stars: repo.stars_count || 0,
          forks: repo.forks_count || 0,
          topics: repo.topics || [],
          technologies: repo.programming_languages || [],
          impactStatement: repo.user_description ? `Custom achievement: ${repo.user_description}` : undefined,
          relevanceScore: 0.8, // Higher relevance for manually selected repos
          lastUpdated: repo.updated_at || new Date().toISOString(),
          isPrivate: repo.is_private || false
        }));

        console.log(`Found ${projects.length} selected GitHub repositories for CV`);
        return projects;
      }

      // If no selected repos, try to get any repositories from the table
      const { data: allData, error: allError } = await supabase
        .from('selected_repositories')
        .select('*')
        .eq('user_id', userId)
        .order('stars_count', { ascending: false })
        .limit(5); // Take top 5 by stars

      if (allError) throw allError;

      console.log('CV Generation: All repositories query result:', allData?.length || 0, 'repositories');
      console.log('CV Generation: All repositories data:', allData);

      if (allData && allData.length > 0) {
        const projects: GitHubProject[] = allData.map(repo => ({
          id: repo.github_repo_id.toString(),
          name: repo.repo_name,
          description: repo.user_description || repo.repo_description || '',
          url: repo.repo_url,
          language: repo.programming_languages?.[0] || '',
          stars: repo.stars_count || 0,
          forks: repo.forks_count || 0,
          topics: repo.topics || [],
          technologies: repo.programming_languages || [],
          impactStatement: repo.user_description ? `Custom achievement: ${repo.user_description}` : undefined,
          relevanceScore: 0.6, // Lower relevance for auto-selected repos
          lastUpdated: repo.updated_at || new Date().toISOString(),
          isPrivate: repo.is_private || false
        }));

        console.log(`No selected repos found, using top ${projects.length} GitHub repositories for CV`);
        return projects;
      }

      // If no GitHub repositories at all, try cv_assets as fallback
      const { data: assetData, error: assetError } = await supabase
        .from('cv_assets')
        .select('*')
        .eq('user_id', userId)
        .eq('asset_type', 'repository')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!assetError && assetData && assetData.length > 0) {
        const projects: GitHubProject[] = assetData.map(asset => {
          const metadata = asset.metadata as any || {};
          return {
            id: metadata.github_id?.toString() || asset.id,
            name: asset.title,
            description: asset.description || '',
            url: asset.external_url || '',
            language: metadata.language || '',
            stars: metadata.stars || 0,
            forks: metadata.forks || 0,
            topics: metadata.topics || [],
            technologies: asset.tags?.filter(tag => tag !== 'github') || [],
            relevanceScore: 0.5,
            lastUpdated: metadata.updated_at || asset.updated_at || new Date().toISOString(),
            isPrivate: metadata.is_private || false
          };
        });

        console.log(`Using ${projects.length} repositories from cv_assets for CV`);
        return projects;
      }

      // Final fallback: check localStorage for development
      console.log('CV Generation: Checking localStorage for GitHub repositories...');
      const localData = localStorage.getItem('selected_repositories');
      if (localData) {
        try {
          const savedRepos = JSON.parse(localData);
          const selectedRepos = savedRepos.filter((repo: any) => repo.is_selected === true);
          if (selectedRepos.length > 0) {
            const projects: GitHubProject[] = selectedRepos.map((repo: any) => ({
              id: repo.github_repo_id?.toString() || Math.random().toString(),
              name: repo.repo_name || 'Repository',
              description: repo.user_description || repo.repo_description || '',
              url: repo.repo_url || '',
              language: repo.programming_languages?.[0] || '',
              stars: repo.stars_count || 0,
              forks: repo.forks_count || 0,
              topics: repo.topics || [],
              technologies: repo.programming_languages || [],
              impactStatement: repo.user_description ? `Custom achievement: ${repo.user_description}` : undefined,
              relevanceScore: 0.8,
              lastUpdated: repo.updated_at || new Date().toISOString(),
              isPrivate: repo.is_private || false
            }));
            console.log(`CV Generation: Using ${projects.length} repositories from localStorage`);
            return projects;
          }
        } catch (error) {
          console.error('Error parsing localStorage GitHub data:', error);
        }
      }

      console.log('CV Generation: No GitHub repositories found in database or localStorage');
      return [];
    } catch (error) {
      console.error('Error fetching GitHub projects:', error);
      return [];
    }
  }

  /**
   * Fetch academic publications from selected_publications table (Google Scholar integration)
   */
  private async fetchPublications(userId: string): Promise<Publication[]> {
    try {
      console.log('CV Generation: Fetching user publications for userId:', userId);
      
      // In development mode, try localStorage first to get real data
      if (import.meta.env.DEV) {
        console.log('CV Generation: Development mode - checking localStorage first...');
        const localData = localStorage.getItem('selected_publications');
        if (localData) {
          try {
            const savedPubs = JSON.parse(localData);
            const selectedPubs = savedPubs.filter((pub: any) => pub.is_selected === true);
            if (selectedPubs.length > 0) {
              const publications: Publication[] = selectedPubs.map((pub: any) => ({
                id: pub.id || Math.random().toString(),
                title: pub.title || 'Publication Title',
                authors: pub.authors || [],
                venue: pub.publication_venue || pub.venue || '',
                year: pub.publication_year || pub.year || new Date().getFullYear(),
                url: pub.scholar_link || pub.pdf_link || pub.url || '',
                abstract: pub.user_description || pub.abstract || '',
                citation: `${pub.title}. ${pub.authors?.join(', ')}. ${pub.publication_venue}, ${pub.publication_year}.`,
                citationCount: pub.citation_count || 0,
                keywords: pub.keywords || [],
                relevanceScore: 0.8
              }));
              console.log(`CV Generation: Using ${publications.length} publications from localStorage (dev mode)`);
              return publications;
            }
          } catch (error) {
            console.error('Error parsing localStorage publications data:', error);
          }
        }
      }
      
      // Get selected publications from Google Scholar integration
      const { data: selectedData, error: selectedError } = await supabase
        .from('selected_publications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_selected', true)
        .order('publication_year', { ascending: false });

      if (selectedError) {
        console.error('CV Generation: Error fetching selected publications:', selectedError);
        // Don't throw error - fall through to localStorage fallback
        console.log('CV Generation: Database query failed, will try localStorage fallback...');
      }

      console.log('CV Generation: Selected publications data found:', selectedData);
      console.log('CV Generation: Publication titles:', selectedData?.map(pub => pub.title));

      if (!selectedError && selectedData && selectedData.length > 0) {
        const publications: Publication[] = selectedData.map(pub => ({
          id: pub.id,
          title: pub.title,
          authors: pub.authors || [],
          venue: pub.publication_venue || '',
          year: pub.publication_year || new Date().getFullYear(),
          url: pub.scholar_link || pub.pdf_link || '',
          abstract: pub.abstract || '',
          citation: `${pub.title}. ${pub.authors?.join(', ')}. ${pub.publication_venue}, ${pub.publication_year}.`,
          citationCount: pub.citation_count || 0,
          keywords: pub.keywords || [],
          relevanceScore: 0.8 // Higher relevance for manually selected publications
        }));

        console.log(`CV Generation: Using ${publications.length} selected publications for CV`);
        return publications;
      }

      // If no selected publications, try to get any publications from the table
      const { data: allData, error: allError } = await supabase
        .from('selected_publications')
        .select('*')
        .eq('user_id', userId)
        .order('publication_year', { ascending: false })
        .limit(5); // Take top 5 most recent

      if (allError) {
        console.error('CV Generation: Error fetching all publications:', allError);
        throw allError;
      }

      if (allData && allData.length > 0) {
        const publications: Publication[] = allData.map(pub => ({
          id: pub.id,
          title: pub.title,
          authors: pub.authors || [],
          venue: pub.publication_venue || '',
          year: pub.publication_year || new Date().getFullYear(),
          url: pub.scholar_link || pub.pdf_link || '',
          abstract: pub.abstract || '',
          citation: `${pub.title}. ${pub.authors?.join(', ')}. ${pub.publication_venue}, ${pub.publication_year}.`,
          citationCount: pub.citation_count || 0,
          keywords: pub.keywords || [],
          relevanceScore: 0.6 // Lower relevance for auto-selected publications
        }));

        console.log(`CV Generation: No selected publications found, using top ${publications.length} recent publications for CV`);
        return publications;
      }

      // If no publications at all, try cv_assets as fallback
      const { data: assetData, error: assetError } = await supabase
        .from('cv_assets')
        .select('*')
        .eq('user_id', userId)
        .eq('asset_type', 'publication')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!assetError && assetData && assetData.length > 0) {
        const publications: Publication[] = assetData.map(asset => {
          const metadata = asset.metadata as any || {};
          return {
            id: asset.id,
            title: asset.title,
            authors: metadata.authors || [],
            venue: metadata.venue || '',
            year: metadata.year || new Date().getFullYear(),
            url: asset.external_url || '',
            abstract: asset.description || '',
            citation: metadata.citation || '',
            citationCount: metadata.citations || 0,
            keywords: metadata.keywords || [],
            relevanceScore: 0.5
          };
        });

        console.log(`CV Generation: Using ${publications.length} publications from cv_assets for CV`);
        return publications;
      }

      // Final fallback: check localStorage for development
      console.log('CV Generation: Checking localStorage for publications...');
      const localData = localStorage.getItem('selected_publications');
      if (localData) {
        try {
          const savedPubs = JSON.parse(localData);
          const selectedPubs = savedPubs.filter((pub: any) => pub.is_selected === true);
          if (selectedPubs.length > 0) {
            const publications: Publication[] = selectedPubs.map((pub: any) => ({
              id: pub.id || Math.random().toString(),
              title: pub.title || 'Publication Title',
              authors: pub.authors || [],
              venue: pub.publication_venue || pub.venue || '',
              year: pub.publication_year || pub.year || new Date().getFullYear(),
              url: pub.scholar_link || pub.pdf_link || pub.url || '',
              abstract: pub.user_description || pub.abstract || '',
              citation: `${pub.title}. ${pub.authors?.join(', ')}. ${pub.publication_venue}, ${pub.publication_year}.`,
              citationCount: pub.citation_count || 0,
              keywords: pub.keywords || [],
              relevanceScore: 0.8
            }));
            console.log(`CV Generation: Using ${publications.length} publications from localStorage`);
            return publications;
          }
        } catch (error) {
          console.error('Error parsing localStorage publications data:', error);
        }
      }

      console.log('CV Generation: No publications found in database or localStorage');
      return [];
    } catch (error) {
      console.error('CV Generation: Error fetching publications:', error);
      return [];
    }
  }

  /**
   * Fetch user education from cv_assets table
   */
  private async fetchUserEducation(userId: string): Promise<Education[]> {
    try {
      console.log('CV Generation: Fetching user education for userId:', userId);
      
      const { data, error } = await supabase
        .from('cv_assets')
        .select('*')
        .eq('user_id', userId)
        .eq('asset_type', 'education')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('CV Generation: Error fetching user education from database:', error);
        throw error;
      }

      console.log('CV Generation: User education data found:', data);

      const education: Education[] = (data || []).map(asset => {
        const metadata = asset.metadata as any || {};
        return {
          id: asset.id,
          institution: metadata.institution || asset.title || 'Institution',
          degree: metadata.degree || asset.title || 'Degree',
          field: metadata.field || asset.description || 'Field of Study',
          location: metadata.location || 'Location',
          startDate: metadata.startDate || '',
          endDate: metadata.current ? undefined : (metadata.endDate || ''),
          gpa: metadata.gpa || undefined,
          honors: metadata.honors || [],
          relevantCourses: asset.tags || [],
          activities: metadata.activities || [],
          relevanceScore: 0.5
        };
      });

      if (education.length > 0) {
        console.log('CV Generation: Using real user education:', education);
        return education;
      } else {
        console.log('CV Generation: No user education found');
        return [];
      }
    } catch (error) {
      console.error('CV Generation: Error fetching user education:', error);
      return [];
    }
  }

  /**
   * Fetch user skills from user preferences
   */
  private async fetchUserSkills(userId: string): Promise<Skill[]> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('skills')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      const skillsArray = data?.skills || [];
      const skills: Skill[] = skillsArray.map((skillName: string, index: number) => ({
        id: `skill-${index}`,
        name: skillName,
        category: this.categorizeSkill(skillName),
        proficiency: 'intermediate', // Default proficiency
        relevanceScore: 0.5,
        isHighlighted: false
      }));

      return skills.length > 0 ? skills : this.createBasicSkills();
    } catch (error) {
      console.error('Error fetching user skills:', error);
      return this.createBasicSkills();
    }
  }

  /**
   * Helper method to categorize skills
   */
  private categorizeSkill(skillName: string): string {
    const skill = skillName.toLowerCase();
    
    if (['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c++', 'c#', 'php', 'ruby'].some(lang => skill.includes(lang))) {
      return 'Programming Languages';
    } else if (['react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt', 'express', 'fastapi', 'django', 'flask'].some(fw => skill.includes(fw))) {
      return 'Frameworks';
    } else if (['aws', 'gcp', 'azure', 'docker', 'kubernetes', 'terraform', 'jenkins'].some(cloud => skill.includes(cloud))) {
      return 'Cloud & DevOps';
    } else if (['postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch'].some(db => skill.includes(db))) {
      return 'Databases';
    } else {
      return 'Other';
    }
  }

  /**
   * Create basic skills set for users without preferences
   */
  private createBasicSkills(): Skill[] {
    const basicSkills = [
      'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'HTML/CSS', 'Git', 'SQL'
    ];
    
    return basicSkills.map((skillName, index) => ({
      id: `skill-${index}`,
      name: skillName,
      category: this.categorizeSkill(skillName),
      proficiency: 'intermediate',
      relevanceScore: 0.5,
      isHighlighted: false
    }));
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
    if (Array.isArray(cvData.selectedProjects)) {
      cvData.selectedProjects.forEach(project => {
        if (project && typeof project.relevanceScore === 'number') {
          totalScore += project.relevanceScore;
          itemCount++;
        }
      });
    }

    // Score selected publications
    if (Array.isArray(cvData.selectedPublications)) {
      cvData.selectedPublications.forEach(pub => {
        if (pub && typeof pub.relevanceScore === 'number') {
          totalScore += pub.relevanceScore;
          itemCount++;
        }
      });
    }

    // Score highlighted skills
    if (cvData.skills && Array.isArray(cvData.skills.all)) {
      const highlightedSkills = cvData.skills.all.filter(skill => skill && skill.isHighlighted);
      highlightedSkills.forEach(skill => {
        if (skill && typeof skill.relevanceScore === 'number') {
          totalScore += skill.relevanceScore;
          itemCount++;
        }
      });
    }

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
    // Generate a proper UUID for the application record
    const applicationId = crypto.randomUUID();
    
    // Generate a clean UUID for jobId since the original might have invalid characters
    const cleanJobId = crypto.randomUUID();
    
    const applicationRecord: ApplicationRecord = {
      id: applicationId,
      userId,
      jobId: cleanJobId, // Use clean UUID instead of original job ID
      cvGenerationId,
      companyName: jobOpportunity.company,
      jobTitle: jobOpportunity.title,
      applicationMethod: 'website',
      status: 'draft',
      notes: `Application prepared for ${jobOpportunity.title} at ${jobOpportunity.company}. Original job ID: ${jobOpportunity.id}`,
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

  // Sample data methods for professional CVs when user data isn't available

  // Note: Work experiences are now fetched from user_profiles cv_assets table
  // No fallback experiences are provided - users should add their own

  // Note: GitHub projects are now fetched from selected_repositories table
  // Sample projects are created when no real projects exist
  private getDeprecatedMockGitHubProjects(): GitHubProject[] {
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

  // Note: Publications are now fetched from selected_publications table
  // Sample publications are created when no real publications exist
  private getDeprecatedMockPublications(): Publication[] {
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

  // Note: Skills are now fetched from user_preferences table
  // Basic skills are created when no preferences exist
  private getDeprecatedMockSkills(): Skill[] {
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