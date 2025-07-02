interface GitHubRepo {
  id: number;
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  html_url: string;
  topics?: string[];
  size: number;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  visibility: string;
}

interface GitHubUser {
  login: string;
  id: number;
  name: string | null;
  email: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  public_repos: number;
  followers: number;
  following: number;
}

class GitHubRepoService {
  private readonly GITHUB_API_BASE = 'https://api.github.com';
  
  async getUserRepos(username: string): Promise<GitHubRepo[]> {
    try {
      // For now, return mock data - replace with actual GitHub API call
      return this.getMockRepos(username);
      
      /* 
      // Actual GitHub API implementation would look like this:
      const response = await fetch(`${this.GITHUB_API_BASE}/users/${username}/repos?sort=updated&per_page=20`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'job-automation-app'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      return await response.json();
      */
    } catch (error) {
      console.error('Error fetching GitHub repos:', error);
      return this.getMockRepos(username);
    }
  }

  async getUserProfile(username: string): Promise<GitHubUser | null> {
    try {
      // For now, return mock data - replace with actual GitHub API call
      return this.getMockUser(username);
      
      /* 
      // Actual GitHub API implementation would look like this:
      const response = await fetch(`${this.GITHUB_API_BASE}/users/${username}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'job-automation-app'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      return await response.json();
      */
    } catch (error) {
      console.error('Error fetching GitHub user:', error);
      return this.getMockUser(username);
    }
  }

  extractSkillsFromRepos(repos: GitHubRepo[]): string[] {
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
        'express': ['Express.js', 'Node.js'],
        'fastapi': ['FastAPI', 'Python'],
        'django': ['Django', 'Python'],
        'flask': ['Flask', 'Python'],
        'spring': ['Spring Boot', 'Java'],
        'laravel': ['Laravel', 'PHP'],
        'rails': ['Ruby on Rails', 'Ruby'],
        'next': ['Next.js', 'React'],
        'nuxt': ['Nuxt.js', 'Vue.js'],
        'gatsby': ['Gatsby', 'React'],
        'svelte': ['Svelte', 'JavaScript'],
        'mongodb': ['MongoDB', 'NoSQL'],
        'postgres': ['PostgreSQL', 'SQL'],
        'mysql': ['MySQL', 'SQL'],
        'redis': ['Redis', 'Caching'],
        'elasticsearch': ['Elasticsearch', 'Search'],
        'docker': ['Docker', 'DevOps'],
        'kubernetes': ['Kubernetes', 'DevOps', 'Container Orchestration'],
        'terraform': ['Terraform', 'Infrastructure as Code'],
        'aws': ['AWS', 'Cloud Computing'],
        'azure': ['Azure', 'Cloud Computing'],
        'gcp': ['Google Cloud', 'Cloud Computing'],
        'firebase': ['Firebase', 'Backend as a Service'],
        'supabase': ['Supabase', 'Backend as a Service'],
        'graphql': ['GraphQL', 'API'],
        'rest': ['REST API', 'API Design'],
        'grpc': ['gRPC', 'API'],
        'websocket': ['WebSocket', 'Real-time'],
        'mqtt': ['MQTT', 'IoT'],
        'tensorflow': ['TensorFlow', 'Machine Learning'],
        'pytorch': ['PyTorch', 'Machine Learning'],
        'scikit': ['Scikit-learn', 'Machine Learning'],
        'pandas': ['Pandas', 'Data Analysis'],
        'numpy': ['NumPy', 'Data Science'],
        'jupyter': ['Jupyter', 'Data Science'],
        'blockchain': ['Blockchain', 'Web3'],
        'ethereum': ['Ethereum', 'Smart Contracts'],
        'solidity': ['Solidity', 'Smart Contracts'],
        'web3': ['Web3', 'Blockchain'],
        'tailwind': ['Tailwind CSS', 'CSS Framework'],
        'bootstrap': ['Bootstrap', 'CSS Framework'],
        'sass': ['Sass', 'CSS Preprocessor'],
        'less': ['Less', 'CSS Preprocessor'],
        'webpack': ['Webpack', 'Build Tools'],
        'vite': ['Vite', 'Build Tools'],
        'babel': ['Babel', 'JavaScript Compiler'],
        'eslint': ['ESLint', 'Code Quality'],
        'prettier': ['Prettier', 'Code Formatting'],
        'jest': ['Jest', 'Testing'],
        'cypress': ['Cypress', 'E2E Testing'],
        'playwright': ['Playwright', 'E2E Testing'],
        'storybook': ['Storybook', 'Component Documentation']
      };

      Object.entries(techMappings).forEach(([keyword, techSkills]) => {
        if (text.includes(keyword)) {
          skills.push(...techSkills);
        }
      });

      // Add topics if available
      if (repo.topics) {
        skills.push(...repo.topics.map(topic => 
          topic.charAt(0).toUpperCase() + topic.slice(1).replace(/-/g, ' ')
        ));
      }
    });

    return [...new Set(skills)]; // Remove duplicates
  }

  getRepoInsights(repos: GitHubRepo[]): {
    totalStars: number;
    mostUsedLanguages: { language: string; count: number }[];
    recentActivityCount: number;
    totalSize: number;
    avgStarsPerRepo: number;
  } {
    const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
    const totalSize = repos.reduce((sum, repo) => sum + repo.size, 0);
    
    // Count languages
    const languageCounts: Record<string, number> = {};
    repos.forEach(repo => {
      if (repo.language) {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
      }
    });
    
    const mostUsedLanguages = Object.entries(languageCounts)
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Recent activity (updated in last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentActivityCount = repos.filter(repo => {
      const lastUpdate = new Date(repo.updated_at);
      return lastUpdate > sixMonthsAgo;
    }).length;
    
    return {
      totalStars,
      mostUsedLanguages,
      recentActivityCount,
      totalSize,
      avgStarsPerRepo: repos.length > 0 ? Math.round(totalStars / repos.length * 10) / 10 : 0
    };
  }

  private getMockRepos(username: string): GitHubRepo[] {
    const baseDate = new Date();
    baseDate.setMonth(baseDate.getMonth() - 2);
    
    return [
      {
        id: 1,
        name: 'job-automation-platform',
        description: 'AI-powered job discovery and application automation platform built with React and Python',
        language: 'TypeScript',
        stargazers_count: 15,
        updated_at: new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        html_url: `https://github.com/${username}/job-automation-platform`,
        topics: ['react', 'typescript', 'ai', 'automation', 'job-search'],
        size: 2048,
        forks_count: 3,
        open_issues_count: 2,
        default_branch: 'main',
        visibility: 'public'
      },
      {
        id: 2,
        name: 'react-dashboard',
        description: 'Modern React dashboard with TypeScript, Tailwind CSS, and Chart.js integration',
        language: 'JavaScript',
        stargazers_count: 8,
        updated_at: new Date(baseDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        html_url: `https://github.com/${username}/react-dashboard`,
        topics: ['react', 'dashboard', 'tailwindcss', 'chartjs'],
        size: 1024,
        forks_count: 1,
        open_issues_count: 0,
        default_branch: 'main',
        visibility: 'public'
      },
      {
        id: 3,
        name: 'python-api-server',
        description: 'FastAPI server with PostgreSQL, Redis caching, and comprehensive API documentation',
        language: 'Python',
        stargazers_count: 12,
        updated_at: new Date(baseDate.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        html_url: `https://github.com/${username}/python-api-server`,
        topics: ['fastapi', 'python', 'postgresql', 'redis', 'api'],
        size: 1536,
        forks_count: 2,
        open_issues_count: 1,
        default_branch: 'main',
        visibility: 'public'
      },
      {
        id: 4,
        name: 'docker-microservices',
        description: 'Microservices architecture with Docker, Kubernetes, and CI/CD pipeline',
        language: 'Go',
        stargazers_count: 6,
        updated_at: new Date(baseDate.getTime() + 35 * 24 * 60 * 60 * 1000).toISOString(),
        html_url: `https://github.com/${username}/docker-microservices`,
        topics: ['docker', 'kubernetes', 'microservices', 'go', 'devops'],
        size: 768,
        forks_count: 0,
        open_issues_count: 3,
        default_branch: 'main',
        visibility: 'public'
      },
      {
        id: 5,
        name: 'ml-data-pipeline',
        description: 'Machine learning data pipeline using TensorFlow, Pandas, and Apache Airflow',
        language: 'Python',
        stargazers_count: 20,
        updated_at: new Date(baseDate.getTime() + 42 * 24 * 60 * 60 * 1000).toISOString(),
        html_url: `https://github.com/${username}/ml-data-pipeline`,
        topics: ['machine-learning', 'tensorflow', 'pandas', 'airflow', 'data-science'],
        size: 2560,
        forks_count: 5,
        open_issues_count: 1,
        default_branch: 'main',
        visibility: 'public'
      }
    ];
  }

  private getMockUser(username: string): GitHubUser {
    return {
      login: username,
      id: 12345,
      name: 'Development User',
      email: 'dev@example.com',
      bio: 'Full-stack developer passionate about AI and automation',
      company: 'Tech Startup',
      location: 'Berlin, Germany',
      blog: 'https://dev-blog.example.com',
      public_repos: 25,
      followers: 50,
      following: 30
    };
  }

  // Utility to extract username from GitHub URL
  extractUsernameFromUrl(githubUrl: string): string | null {
    try {
      const url = new URL(githubUrl);
      if (url.hostname === 'github.com') {
        const pathParts = url.pathname.split('/').filter(part => part.length > 0);
        return pathParts[0] || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  // Rate limiting helper
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const githubRepoService = new GitHubRepoService();
export type { GitHubRepo, GitHubUser };