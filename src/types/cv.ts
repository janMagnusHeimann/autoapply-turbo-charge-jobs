// Core CV Data Types and Interfaces for Dynamic CV Generation

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  professionalSummary: string;
  title: string; // Current/desired job title
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  location?: string;
  startDate: string; // YYYY-MM format
  endDate?: string; // YYYY-MM format, null if current
  description: string;
  achievements: string[]; // Bullet points
  technologies: string[]; // Tech stack used
  relevanceScore?: number; // 0-1, calculated by AI
}

export interface GitHubProject {
  id: string;
  name: string;
  description: string;
  url: string;
  language: string;
  stars: number;
  forks: number;
  topics: string[]; // GitHub topics/tags
  readme?: string; // README content for analysis
  technologies: string[]; // Extracted tech stack
  impactStatement?: string; // AI-generated impact description
  relevanceScore?: number; // 0-1, calculated by AI
  lastUpdated: string;
  isPrivate: boolean;
}

export interface Publication {
  id: string;
  title: string;
  authors: string[];
  venue: string; // Journal/Conference name
  year: number;
  url?: string;
  citation?: string;
  abstract?: string;
  keywords: string[];
  relevanceScore?: number; // 0-1, calculated by AI
  citationCount?: number;
}

export interface Skill {
  id: string;
  name: string;
  category: 'programming' | 'framework' | 'tool' | 'soft' | 'domain';
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsOfExperience?: number;
  relevanceScore?: number; // 0-1, calculated by AI
  isHighlighted?: boolean; // Whether to emphasize in CV
}

export interface CVData {
  profile: UserProfile;
  experiences: WorkExperience[];
  selectedProjects: GitHubProject[];
  selectedPublications: Publication[];
  skills: {
    all: Skill[];
    highlighted: string[]; // Skill names to emphasize
  };
  customSummary: string; // AI-generated job-specific summary
  optimizationNotes: string[]; // Why certain items were selected
}

export interface JobRequirements {
  requiredSkills: string[];
  preferredSkills: string[];
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  industries: string[];
  keywords: string[];
  requiresResearch: boolean; // Whether to include publications
  location?: string;
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
}

export interface CVTemplate {
  id: string;
  name: string;
  type: 'premium' | 'technical' | 'academic' | 'creative' | 'compact' | 'executive';
  description: string;
  maxPages: number;
  sections: {
    showProjects: boolean;
    showPublications: boolean;
    projectsFirst: boolean; // Projects before experience
    maxProjects: number;
    maxPublications: number;
  };
  styling: {
    primaryColor: string;
    accentColor: string;
    fontSize: number;
    fontFamily: string;
    headerStyle: 'classic' | 'modern' | 'minimal' | 'centered';
  };
}

export interface CVGeneration {
  id: string;
  userId: string;
  jobId?: string; // Job this CV was created for
  templateId: string;
  cvData: CVData;
  pdfUrl: string; // Generated PDF URL
  optimizationMetadata: {
    analysisTime: number; // Time taken for AI analysis
    selectedProjectsCount: number;
    selectedPublicationsCount: number;
    highlightedSkillsCount: number;
    relevanceScore: number; // Overall job match score
    customizations: string[]; // List of optimizations made
  };
  status: 'generating' | 'ready' | 'error';
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationRecord {
  id: string;
  userId: string;
  jobId: string;
  cvGenerationId: string;
  companyName: string;
  jobTitle: string;
  applicationMethod: 'email' | 'website' | 'linkedin' | 'other';
  appliedAt?: string;
  status: 'draft' | 'applied' | 'viewed' | 'interviewed' | 'rejected' | 'offered';
  notes?: string;
  followUpDate?: string;
  responseReceived?: boolean;
  interviewDates?: string[];
  createdAt: string;
  updatedAt: string;
}

// AI Analysis Types
export interface JobAnalysis {
  jobId: string;
  requirements: JobRequirements;
  keyPhrases: string[];
  companyInfo: {
    size: string;
    industry: string;
    culture: string[];
  };
  skillWeights: Record<string, number>; // Skill importance (0-1)
  experienceWeights: Record<string, number>; // Experience type importance
  confidence: number; // Analysis confidence (0-1)
  analysisDate: string;
}

export interface ContentOptimization {
  originalContent: string;
  optimizedContent: string;
  changes: {
    type: 'keyword_emphasis' | 'rewrite' | 'reorder' | 'trim';
    description: string;
  }[];
  relevanceScore: number;
}

// PDF Generation Types
export interface PDFGenerationOptions {
  template: CVTemplate;
  cvData: CVData;
  outputPath?: string;
  includeLinks: boolean;
  optimizeForATS: boolean; // Applicant Tracking System optimization
}

export interface PDFSection {
  type: 'header' | 'summary' | 'experience' | 'projects' | 'publications' | 'skills' | 'education';
  title: string;
  content: any;
  order: number;
  isVisible: boolean;
}

// GitHub Integration Types
export interface GitHubIntegration {
  userId: string;
  accessToken: string;
  username: string;
  lastSyncAt: string;
  repositories: GitHubProject[];
  syncStatus: 'idle' | 'syncing' | 'error';
  errorMessage?: string;
}

// Scholar Integration Types
export interface ScholarIntegration {
  userId: string;
  scholarId: string;
  lastSyncAt: string;
  publications: Publication[];
  syncStatus: 'idle' | 'syncing' | 'error';
  errorMessage?: string;
}

// Utility Types
export type CVSectionType = 'header' | 'summary' | 'experience' | 'projects' | 'publications' | 'skills' | 'education';

export interface CVMetrics {
  totalApplications: number;
  responseRate: number;
  interviewRate: number;
  averageRelevanceScore: number;
  mostUsedSkills: string[];
  mostSelectedProjects: string[];
  templateUsage: Record<string, number>;
}

// Error Types
export interface CVGenerationError {
  code: 'INVALID_DATA' | 'PDF_GENERATION_FAILED' | 'AI_ANALYSIS_FAILED' | 'TEMPLATE_NOT_FOUND';
  message: string;
  details?: any;
}

// Configuration Types
export interface CVGenerationConfig {
  aiModel: string;
  maxTokens: number;
  temperature: number;
  pdfStorage: {
    provider: 'supabase' | 's3' | 'local';
    bucket?: string;
    basePath?: string;
  };
  templates: CVTemplate[];
  defaultTemplate: string;
  features: {
    enableGitHubSync: boolean;
    enableScholarSync: boolean;
    enableAIOptimization: boolean;
    enableMultipleTemplates: boolean;
  };
}