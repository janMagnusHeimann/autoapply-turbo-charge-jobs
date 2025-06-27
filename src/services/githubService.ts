import { Octokit } from "@octokit/rest";
import { supabase } from "@/integrations/supabase/client";
import { saveToSupabaseService, loadFromSupabaseService } from "./supabaseService";
import EncryptionService from "@/utils/encryption";

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  created_at: string;
  updated_at: string;
  topics: string[];
  private: boolean;
}

export interface SelectedRepository {
  id?: string;
  user_id: string;
  github_repo_id: number;
  repo_name: string;
  repo_full_name: string;
  repo_url: string;
  repo_description: string | null;
  user_description: string;
  programming_languages: string[];
  topics: string[];
  stars_count: number;
  forks_count: number;
  is_private: boolean;
  is_selected: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
}

export class GitHubService {
  private static readonly CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
  private static readonly REDIRECT_URI = `${window.location.origin}/auth/github/callback`;
  private static readonly BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  private static isConfigured(): boolean {
    return !!(this.CLIENT_ID && 
              this.CLIENT_ID !== 'your_github_client_id_here');
  }

  /**
   * Initiates GitHub OAuth flow
   */
  static initiateOAuth(): void {
    if (!this.isConfigured()) {
      throw new Error('GitHub OAuth is not configured. Please set VITE_GITHUB_CLIENT_ID in your .env file.');
    }

    const params = new URLSearchParams({
      client_id: this.CLIENT_ID,
      redirect_uri: this.REDIRECT_URI,
      scope: 'user:email,public_repo',
      state: crypto.randomUUID(), // CSRF protection
    });

    window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for access token
   * Note: In production, this should be handled by your backend to keep CLIENT_SECRET secure
   */
  static async exchangeCodeForToken(code: string): Promise<string> {
    try {
      // Use backend proxy to avoid CORS issues and keep client secret secure
      const response = await fetch(`${this.BACKEND_URL}/api/github-oauth/token`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.CLIENT_ID,
          code,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(`GitHub OAuth error: ${errorData.detail || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
      }

      return data.access_token;
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      throw error;
    }
  }

  /**
   * Gets GitHub user information
   */
  static async getUser(accessToken: string): Promise<GitHubUser> {
    try {
      const octokit = new Octokit({ auth: accessToken });
      const { data } = await octokit.rest.users.getAuthenticated();
      
      return {
        login: data.login,
        id: data.id,
        avatar_url: data.avatar_url,
        name: data.name,
        company: data.company,
        blog: data.blog,
        location: data.location,
        email: data.email,
        bio: data.bio,
        public_repos: data.public_repos,
        followers: data.followers,
        following: data.following,
      };
    } catch (error) {
      console.error('Error fetching GitHub user:', error);
      throw error;
    }
  }

  /**
   * Gets user's repositories
   */
  static async getUserRepositories(accessToken: string, username?: string): Promise<GitHubRepository[]> {
    try {
      const octokit = new Octokit({ auth: accessToken });
      
      const { data } = await octokit.rest.repos.listForAuthenticatedUser({
        visibility: 'public',
        sort: 'updated',
        per_page: 100,
      });

      return data.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        created_at: repo.created_at,
        updated_at: repo.updated_at,
        topics: repo.topics || [],
        private: repo.private,
      }));
    } catch (error) {
      console.error('Error fetching repositories:', error);
      throw error;
    }
  }

  /**
   * Stores GitHub access token securely with encryption
   */
  static async storeGitHubToken(userId: string, accessToken: string, githubUser: GitHubUser): Promise<void> {
    try {
      // In development mode with bypass auth, just store in localStorage
      if (import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === 'true') {
        localStorage.setItem('github_access_token', accessToken);
        localStorage.setItem('github_user_data', JSON.stringify(githubUser));
        console.log('Development mode: Stored GitHub data in localStorage');
        return;
      }

      // Update user profile with GitHub username
      const { error: profileError } = await supabase
        .from('users')
        .update({ 
          github_username: githubUser.login,
        })
        .eq('id', userId);

      if (profileError) {
        throw profileError;
      }

      // Encrypt the access token before storing
      let encryptedToken: any = null;
      
      if (EncryptionService.isEncryptionSupported()) {
        try {
          encryptedToken = await EncryptionService.encrypt(accessToken, userId);
          console.log('✅ GitHub token encrypted successfully');
        } catch (encryptionError) {
          console.warn('⚠️ Token encryption failed, falling back to unencrypted storage:', encryptionError);
          // Fall back to storing without encryption if encryption fails
        }
      } else {
        console.warn('⚠️ Encryption not supported in this environment, storing token without encryption');
      }

      // Store encrypted token and user data
      const { error: tokenError } = await supabase
        .from('user_preferences')
        .update({
          github_access_token: encryptedToken ? JSON.stringify(encryptedToken) : accessToken,
          github_user_data: githubUser,
          github_token_encrypted: !!encryptedToken, // Flag to indicate if token is encrypted
        })
        .eq('user_id', userId);

      if (tokenError) {
        throw tokenError;
      }
    } catch (error) {
      console.error('Error storing GitHub token:', error);
      throw error;
    }
  }

  /**
   * Gets stored GitHub access token with decryption
   */
  static async getGitHubToken(userId: string): Promise<string | null> {
    try {
      // In development mode with bypass auth, get from localStorage
      if (import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === 'true') {
        const token = localStorage.getItem('github_access_token');
        return token;
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .select('github_access_token, github_token_encrypted')
        .eq('user_id', userId)
        .single();

      if (error) {
        throw error;
      }

      if (!data?.github_access_token) {
        return null;
      }

      // Check if the token is encrypted
      if (data.github_token_encrypted && EncryptionService.isEncryptionSupported()) {
        try {
          const encryptedData = JSON.parse(data.github_access_token);
          const decryptedToken = await EncryptionService.decrypt(encryptedData, userId);
          console.log('✅ GitHub token decrypted successfully');
          return decryptedToken;
        } catch (decryptionError) {
          console.error('❌ Failed to decrypt GitHub token:', decryptionError);
          // If decryption fails, return null to force re-authentication
          return null;
        }
      }

      // Return unencrypted token (for backward compatibility)
      return data.github_access_token;
    } catch (error) {
      console.error('Error getting GitHub token:', error);
      return null;
    }
  }

  /**
   * Syncs repositories to user's CV assets
   */
  static async syncRepositoriesToProfile(userId: string, repositories: GitHubRepository[]): Promise<void> {
    try {
      // First, remove existing repository assets
      const { error: deleteError } = await supabase
        .from('cv_assets')
        .delete()
        .eq('user_id', userId)
        .eq('asset_type', 'repository');

      if (deleteError) {
        throw deleteError;
      }

      // Insert new repository assets
      const repositoryAssets = repositories
        .filter(repo => !repo.private) // Only sync public repos
        .map(repo => ({
          user_id: userId,
          asset_type: 'repository',
          title: repo.name,
          description: repo.description || `${repo.language || 'Project'} repository`,
          external_url: repo.html_url,
          tags: [
            ...(repo.language ? [repo.language] : []),
            ...repo.topics,
            'github',
          ],
          metadata: {
            github_id: repo.id,
            full_name: repo.full_name,
            language: repo.language,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            created_at: repo.created_at,
            updated_at: repo.updated_at,
            topics: repo.topics,
          },
        }));

      if (repositoryAssets.length > 0) {
        const { error: insertError } = await supabase
          .from('cv_assets')
          .insert(repositoryAssets);

        if (insertError) {
          throw insertError;
        }
      }

      console.log(`Synced ${repositoryAssets.length} repositories to profile`);
    } catch (error) {
      console.error('Error syncing repositories to profile:', error);
      throw error;
    }
  }

  /**
   * Disconnects GitHub account
   */
  static async disconnectGitHub(userId: string): Promise<void> {
    try {
      // Remove GitHub data from user profile
      const { error: profileError } = await supabase
        .from('users')
        .update({ 
          github_username: null,
        })
        .eq('id', userId);

      if (profileError) {
        throw profileError;
      }

      // Remove GitHub token and data from preferences
      const { error: prefsError } = await supabase
        .from('user_preferences')
        .update({
          github_access_token: null,
          github_user_data: null,
          github_token_encrypted: false,
        })
        .eq('user_id', userId);

      if (prefsError) {
        throw prefsError;
      }

      // Remove repository assets
      const { error: assetsError } = await supabase
        .from('cv_assets')
        .delete()
        .eq('user_id', userId)
        .eq('asset_type', 'repository');

      if (assetsError) {
        throw assetsError;
      }
    } catch (error) {
      console.error('Error disconnecting GitHub:', error);
      throw error;
    }
  }

  /**
   * Checks if user has connected GitHub
   */
  static async isGitHubConnected(userId: string): Promise<boolean> {
    try {
      // In development mode with bypass auth, check localStorage
      if (import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === 'true') {
        const token = localStorage.getItem('github_access_token');
        return !!token;
      }

      const { data, error } = await supabase
        .from('users')
        .select('github_username')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      return !!data?.github_username;
    } catch (error) {
      console.error('Error checking GitHub connection:', error);
      return false;
    }
  }

  /**
   * Gets repository statistics for display
   */
  static getRepositoryStats(repositories: GitHubRepository[]) {
    const languages = repositories.reduce((acc, repo) => {
      if (repo.language) {
        acc[repo.language] = (acc[repo.language] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const totalStars = repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0);
    const totalForks = repositories.reduce((sum, repo) => sum + repo.forks_count, 0);

    return {
      totalRepos: repositories.length,
      languages: Object.entries(languages)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
      totalStars,
      totalForks,
      topRepos: repositories
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 5),
    };
  }

  /**
   * Gets user's selected repositories with descriptions
   */
  static async getSelectedRepositories(userId: string): Promise<SelectedRepository[]> {
    try {
      // In development mode with bypass auth, try Supabase first, then localStorage
      if (import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === 'true') {
        // Try to load from Supabase first, then fallback to localStorage
        const supabaseData = await loadFromSupabaseService<SelectedRepository>('selected_repositories', userId);
        if (supabaseData !== null) {
          console.log('📥 Loaded from Supabase database');
          return supabaseData;
        }
        
        // Fallback to localStorage
        const saved = localStorage.getItem('selected_repositories');
        const localData = saved ? JSON.parse(saved) : [];
        console.log('📱 Loaded from localStorage:', localData.length, 'repositories');
        console.log('📱 Sample data:', localData.slice(0, 2));
        return localData;
      }

      const { data, error } = await supabase
        .from('selected_repositories')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching selected repositories:', error);
      throw error;
    }
  }

  /**
   * Saves or updates selected repositories with user descriptions
   */
  static async saveSelectedRepositories(userId: string, repositories: SelectedRepository[]): Promise<void> {
    try {
      // In development mode with bypass auth, use localStorage and also try Supabase
      if (import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === 'true') {
        localStorage.setItem('selected_repositories', JSON.stringify(repositories));
        console.log(`Development mode: Saved ${repositories.length} selected repositories to localStorage`);
        
        // Also try to save to Supabase using service client
        const saved = await saveToSupabaseService('selected_repositories', repositories, userId);
        if (saved) {
          console.log('✅ Also saved to Supabase database');
        } else {
          console.log('⚠️ Supabase save failed, using localStorage only');
        }
        return;
      }

      // First, get existing selected repositories
      const { data: existing } = await supabase
        .from('selected_repositories')
        .select('github_repo_id')
        .eq('user_id', userId);

      const existingIds = new Set(existing?.map(r => r.github_repo_id) || []);
      const newIds = new Set(repositories.map(r => r.github_repo_id));

      // Delete repositories that are no longer selected
      const toDelete = [...existingIds].filter(id => !newIds.has(id));
      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('selected_repositories')
          .delete()
          .eq('user_id', userId)
          .in('github_repo_id', toDelete);

        if (deleteError) {
          throw deleteError;
        }
      }

      // Upsert selected repositories
      if (repositories.length > 0) {
        const repositoryData = repositories.map(repo => ({
          user_id: userId,
          github_repo_id: repo.github_repo_id,
          repo_name: repo.repo_name,
          repo_full_name: repo.repo_full_name,
          repo_url: repo.repo_url,
          repo_description: repo.repo_description,
          user_description: repo.user_description,
          programming_languages: repo.programming_languages,
          topics: repo.topics,
          stars_count: repo.stars_count,
          forks_count: repo.forks_count,
          is_private: repo.is_private,
          is_selected: repo.is_selected,
        }));

        const { error: upsertError } = await supabase
          .from('selected_repositories')
          .upsert(repositoryData, {
            onConflict: 'user_id,github_repo_id',
            ignoreDuplicates: false
          });

        if (upsertError) {
          throw upsertError;
        }
      }

      console.log(`Saved ${repositories.length} selected repositories for user ${userId}`);
    } catch (error) {
      console.error('Error saving selected repositories:', error);
      throw error;
    }
  }

  /**
   * Gets repositories with selection status and user descriptions
   */
  static async getRepositoriesWithSelectionStatus(userId: string, githubRepositories: GitHubRepository[]): Promise<(GitHubRepository & { isSelected: boolean; userDescription: string })[]> {
    try {
      const selectedRepos = await this.getSelectedRepositories(userId);
      console.log(`🔍 Loading selection status for ${githubRepositories.length} repos, found ${selectedRepos.length} saved selections`);
      
      const selectedMap = new Map(selectedRepos.map(repo => [repo.github_repo_id, repo]));

      const result = githubRepositories.map(repo => {
        const savedRepo = selectedMap.get(repo.id);
        const isSelected = savedRepo?.is_selected === true;
        const userDescription = savedRepo?.user_description || '';
        
        if (isSelected) {
          console.log(`✅ Repo ${repo.name} is selected with description: "${userDescription.substring(0, 50)}..."`);
        }
        
        return {
          ...repo,
          isSelected,
          userDescription,
        };
      });

      console.log(`📊 Final result: ${result.filter(r => r.isSelected).length} selected repositories`);
      return result;
    } catch (error) {
      console.error('Error getting repositories with selection status:', error);
      return githubRepositories.map(repo => ({
        ...repo,
        isSelected: false,
        userDescription: '',
      }));
    }
  }

  /**
   * Updates a single repository's selection status and description
   */
  static async updateRepositorySelection(
    userId: string,
    repository: GitHubRepository,
    isSelected: boolean,
    userDescription: string
  ): Promise<void> {
    try {
      const repositoryData: Omit<SelectedRepository, 'id' | 'created_at' | 'updated_at'> = {
        user_id: userId,
        github_repo_id: repository.id,
        repo_name: repository.name,
        repo_full_name: repository.full_name,
        repo_url: repository.html_url,
        repo_description: repository.description,
        user_description: userDescription,
        programming_languages: repository.language ? [repository.language] : [],
        topics: repository.topics,
        stars_count: repository.stargazers_count,
        forks_count: repository.forks_count,
        is_private: repository.private,
        is_selected: isSelected,
      };

      if (!isSelected) {
        // If deselecting, remove from database
        const { error } = await supabase
          .from('selected_repositories')
          .delete()
          .eq('user_id', userId)
          .eq('github_repo_id', repository.id);

        if (error) {
          throw error;
        }
      } else {
        // If selecting, upsert to database
        const { error } = await supabase
          .from('selected_repositories')
          .upsert(repositoryData, {
            onConflict: 'user_id,github_repo_id',
            ignoreDuplicates: false
          });

        if (error) {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error updating repository selection:', error);
      throw error;
    }
  }

  /**
   * Gets count of selected repositories for user
   */
  static async getSelectedRepositoryCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('selected_repositories')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_selected', true);

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting selected repository count:', error);
      return 0;
    }
  }
}