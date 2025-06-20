import { useState, useEffect } from "react";
import { 
  Github, 
  ExternalLink, 
  Star, 
  GitFork, 
  Calendar, 
  RefreshCw, 
  Unlink, 
  Code, 
  TrendingUp,
  Save,
  CheckCircle,
  Circle,
  Info,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { GitHubService, GitHubRepository, GitHubUser } from "@/services/githubService";
import { UserService } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SelectiveGitHubIntegrationProps {
  onRepositoriesSync?: () => void;
}

interface RepositoryWithSelection extends GitHubRepository {
  isSelected: boolean;
  userDescription: string;
}

export const SelectiveGitHubIntegration = ({ onRepositoriesSync }: SelectiveGitHubIntegrationProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Connection states
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Data states
  const [repositories, setRepositories] = useState<RepositoryWithSelection[]>([]);
  const [githubUser, setGitHubUser] = useState<GitHubUser | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  
  // UI states
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    checkConnection();
  }, [user]);

  // Listen for GitHub connection events to auto-refresh
  useEffect(() => {
    const handleGitHubConnected = (event: CustomEvent) => {
      console.log('🔄 GitHub connected event received, refreshing data...');
      toast({
        title: "GitHub Connected!",
        description: `Successfully connected and synced ${event.detail.repositoryCount} repositories.`,
      });
      
      // Refresh the connection status and data
      setTimeout(() => {
        checkConnection();
      }, 1000); // Small delay to ensure backend processing is complete
    };

    window.addEventListener('github-connected', handleGitHubConnected as EventListener);
    
    return () => {
      window.removeEventListener('github-connected', handleGitHubConnected as EventListener);
    };
  }, []);

  useEffect(() => {
    const selected = repositories.filter(repo => repo.isSelected);
    setSelectedCount(selected.length);
    
    // Check if there are unsaved changes by comparing with saved state
    checkForUnsavedChanges();
  }, [repositories]);

  const checkConnection = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const connected = await GitHubService.isGitHubConnected(user.id);
      setIsConnected(connected);

      if (connected) {
        await loadGitHubData();
      }
    } catch (error) {
      console.error('Error checking GitHub connection:', error);
      toast({
        title: "Connection Error",
        description: "Failed to check GitHub connection status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadGitHubData = async () => {
    if (!user) return;

    try {
      console.log('🔄 Loading GitHub data for user:', user.id);
      const token = await GitHubService.getGitHubToken(user.id);
      if (!token) {
        console.log('❌ No GitHub token found');
        return;
      }

      console.log('✅ GitHub token found, fetching repositories...');
      // Load GitHub user data and repositories
      const [githubUserData, allRepos] = await Promise.all([
        GitHubService.getUser(token),
        GitHubService.getUserRepositories(token)
      ]);

      console.log(`📦 Fetched ${allRepos.length} repositories from GitHub`);
      // Get repositories with selection status
      const reposWithSelection = await GitHubService.getRepositoriesWithSelectionStatus(user.id, allRepos);

      console.log(`🎯 Final repositories with selection:`, reposWithSelection.filter(r => r.isSelected).length, 'selected');
      setGitHubUser(githubUserData);
      setRepositories(reposWithSelection);
      setStats(GitHubService.getRepositoryStats(allRepos));
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error loading GitHub data:', error);
      toast({
        title: "Error loading GitHub data",
        description: "Failed to fetch your GitHub information. Please try reconnecting.",
        variant: "destructive",
      });
    }
  };

  const checkForUnsavedChanges = async () => {
    if (!user || repositories.length === 0) return;
    
    try {
      const savedRepos = await GitHubService.getSelectedRepositories(user.id);
      const savedMap = new Map(savedRepos.map(repo => [repo.github_repo_id, repo]));
      
      const hasChanges = repositories.some(repo => {
        const saved = savedMap.get(repo.id);
        return repo.isSelected !== (saved?.is_selected || false) ||
               repo.userDescription !== (saved?.user_description || '');
      });
      
      setHasUnsavedChanges(hasChanges);
    } catch (error) {
      console.error('Error checking for unsaved changes:', error);
    }
  };

  const handleConnect = () => {
    try {
      GitHubService.initiateOAuth();
    } catch (error: any) {
      toast({
        title: "OAuth Error",
        description: error.message || "Failed to initiate GitHub OAuth flow.",
        variant: "destructive",
      });
    }
  };

  const handleSync = async () => {
    if (!user) return;

    try {
      setSyncing(true);
      const token = await GitHubService.getGitHubToken(user.id);
      if (!token) {
        throw new Error('GitHub token not found');
      }

      const allRepos = await GitHubService.getUserRepositories(token);
      const reposWithSelection = await GitHubService.getRepositoriesWithSelectionStatus(user.id, allRepos);

      setRepositories(reposWithSelection);
      setStats(GitHubService.getRepositoryStats(allRepos));

      toast({
        title: "Repositories synced",
        description: `Successfully synced ${allRepos.length} repositories from GitHub.`,
      });

      onRepositoriesSync?.();
    } catch (error) {
      console.error('Error syncing repositories:', error);
      toast({
        title: "Sync failed",
        description: "Failed to sync repositories. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleRepositoryToggle = (repoId: number, isSelected: boolean) => {
    setRepositories(prev => prev.map(repo => 
      repo.id === repoId ? { ...repo, isSelected } : repo
    ));
  };

  const handleDescriptionChange = (repoId: number, description: string) => {
    setRepositories(prev => prev.map(repo => 
      repo.id === repoId ? { ...repo, userDescription: description } : repo
    ));
  };

  const handleSaveSelections = async () => {
    if (!user) return;

    try {
      setSaving(true);
      
      const selectedRepos = repositories
        .filter(repo => repo.isSelected)
        .map(repo => ({
          user_id: user.id,
          github_repo_id: repo.id,
          repo_name: repo.name,
          repo_full_name: repo.full_name,
          repo_url: repo.html_url,
          repo_description: repo.description,
          user_description: repo.userDescription,
          programming_languages: repo.language ? [repo.language] : [],
          topics: repo.topics,
          stars_count: repo.stargazers_count,
          forks_count: repo.forks_count,
          is_private: repo.private,
          is_selected: true,
        }));

      console.log(`💾 Saving ${selectedRepos.length} repositories:`, selectedRepos.map(r => r.repo_name));

      await GitHubService.saveSelectedRepositories(user.id, selectedRepos);
      
      setHasUnsavedChanges(false);
      
      toast({
        title: "Selections saved",
        description: `Successfully saved ${selectedRepos.length} repositories with descriptions.`,
      });

      onRepositoriesSync?.();
    } catch (error) {
      console.error('Error saving selections:', error);
      toast({
        title: "Save failed",
        description: "Failed to save repository selections. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;

    try {
      await GitHubService.disconnectGitHub(user.id);
      setIsConnected(false);
      setGitHubUser(null);
      setRepositories([]);
      setStats(null);
      setHasUnsavedChanges(false);

      toast({
        title: "GitHub disconnected",
        description: "Your GitHub account has been disconnected and all data removed.",
      });

      onRepositoriesSync?.();
    } catch (error) {
      console.error('Error disconnecting GitHub:', error);
      toast({
        title: "Disconnect failed",
        description: "Failed to disconnect GitHub. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5 text-white" />
            <CardTitle className="text-white">GitHub Portfolio Integration</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-3/4 bg-gray-700" />
            <Skeleton className="h-4 w-1/2 bg-gray-700" />
            <Skeleton className="h-10 w-32 bg-gray-700" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5 text-white" />
            <CardTitle className="text-white">GitHub Portfolio Integration</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-gray-800 border-gray-700">
            <Info className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-gray-300">
              Connect your GitHub account to select repositories and add descriptions that will be used for autonomous CV creation and job applications.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-white">What you can do:</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Select specific repositories to include in your professional profile</li>
              <li>• Add detailed descriptions of your achievements in each project</li>
              <li>• Highlight skills and technologies you've mastered</li>
              <li>• Enable automatic CV generation with your best work</li>
            </ul>
          </div>
          
          <Button onClick={handleConnect} className="w-full bg-gray-700 hover:bg-gray-600 text-white border border-gray-600">
            <Github className="h-4 w-4 mr-2" />
            Connect GitHub Account
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* GitHub Account Info */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Github className="h-5 w-5 text-white" />
              <CardTitle className="text-white">GitHub Account</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSync}
                disabled={syncing}
                className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 text-white ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync'}
              </Button>
              <Button
                onClick={handleDisconnect}
                variant="destructive"
                size="sm"
              >
                <Unlink className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {githubUser && (
            <div className="flex items-center gap-4">
              <img
                src={githubUser.avatar_url}
                alt={githubUser.name || githubUser.login}
                className="w-16 h-16 rounded-full"
              />
              <div className="space-y-1">
                <h3 className="font-medium text-white">
                  {githubUser.name || githubUser.login}
                </h3>
                <p className="text-sm text-gray-400">
                  @{githubUser.login}
                </p>
                {githubUser.bio && (
                  <p className="text-sm text-gray-400">{githubUser.bio}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>{githubUser.public_repos} repositories</span>
                  <span>{githubUser.followers} followers</span>
                  <span>{githubUser.following} following</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selection Summary */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <CheckCircle className="h-5 w-5 text-green-400" />
              Portfolio Selection
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">
                {selectedCount} of {repositories.length} selected
              </span>
              {hasUnsavedChanges && (
                <Button
                  onClick={handleSaveSelections}
                  disabled={saving || selectedCount === 0}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin text-white" />
                  ) : (
                    <Save className="h-4 w-4 mr-2 text-white" />
                  )}
                  {saving ? 'Saving...' : 'Save Selections'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hasUnsavedChanges && (
            <Alert className="mb-4 bg-gray-800 border-gray-700">
              <Info className="h-4 w-4 text-orange-400" />
              <AlertDescription className="text-gray-300">
                You have unsaved changes. Click "Save Selections" to save your repository choices and descriptions.
              </AlertDescription>
            </Alert>
          )}
          
          <p className="text-sm text-gray-400 mb-4">
            Select repositories you want to include in your professional portfolio. Add descriptions explaining your achievements, skills demonstrated, and impact of each project.
          </p>

          {/* Selected Repositories Summary */}
          {selectedCount > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white">Selected Projects:</h4>
              <div className="space-y-2">
                {repositories
                  .filter(repo => repo.isSelected)
                  .map((repo) => (
                    <div
                      key={repo.id}
                      className="flex items-start justify-between p-3 bg-gray-800 border border-gray-700 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-sm truncate text-white">{repo.name}</h5>
                          <Badge variant="outline" className="text-xs border-gray-600 text-gray-300 bg-gray-800">{repo.language || 'N/A'}</Badge>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Star className="h-3 w-3" />
                            {repo.stargazers_count}
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-2">
                          {repo.userDescription || repo.description || 'No description provided'}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Repository Selection List */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Code className="h-5 w-5 text-blue-400" />
            Select Your Best Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {repositories.map((repo) => (
              <div
                key={repo.id}
                className={`border rounded-lg p-4 transition-all ${
                  repo.isSelected ? 'border-blue-500 bg-gray-800' : 'border-gray-700 bg-gray-800/50'
                }`}
              >
                <div className="space-y-4">
                  {/* Repository Header */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`repo-${repo.id}`}
                      checked={repo.isSelected}
                      onCheckedChange={(checked) => 
                        handleRepositoryToggle(repo.id, checked as boolean)
                      }
                      className="mt-1 border-gray-600 bg-gray-800 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 data-[state=checked]:text-white"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`repo-${repo.id}`}
                            className="font-medium cursor-pointer text-white"
                          >
                            {repo.name}
                          </Label>
                          <Badge variant="outline" className="border-gray-600 text-gray-300 bg-gray-800">{repo.language || 'N/A'}</Badge>
                          {repo.private && <Badge variant="secondary" className="bg-orange-600 text-white">Private</Badge>}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-white hover:bg-gray-700"
                          asChild
                        >
                          <a
                            href={repo.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                      
                      {repo.description && (
                        <p className="text-sm text-gray-400">
                          {repo.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {repo.stargazers_count}
                        </div>
                        <div className="flex items-center gap-1">
                          <GitFork className="h-3 w-3" />
                          {repo.forks_count}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(repo.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      {repo.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {repo.topics.map((topic) => (
                            <Badge key={topic} variant="secondary" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description Input - Only show when selected */}
                  {repo.isSelected && (
                    <div className="ml-8 space-y-2">
                      <Label htmlFor={`desc-${repo.id}`} className="text-sm font-medium text-white">
                        Describe your achievements with this project *
                      </Label>
                      <Textarea
                        id={`desc-${repo.id}`}
                        placeholder="Explain what you built, technologies used, challenges solved, and impact achieved. This will be used in your CV and job applications. E.g., 'Built a full-stack e-commerce platform using React and Node.js, handling 10k+ users with 99.9% uptime. Implemented advanced caching strategies reducing load times by 40%.'"
                        value={repo.userDescription}
                        onChange={(e) => handleDescriptionChange(repo.id, e.target.value)}
                        className="min-h-[100px] resize-none bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                        required={repo.isSelected}
                      />
                      <p className="text-xs text-gray-400">
                        Focus on: technical skills demonstrated, problems solved, measurable impact, and technologies mastered.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {repositories.length === 0 && (
            <div className="text-center py-8">
              <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2 text-white">No repositories found</h3>
              <p className="text-gray-400 mb-4">
                Click "Sync" to fetch your latest repositories from GitHub.
              </p>
              <Button onClick={handleSync} disabled={syncing} className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600">
                <RefreshCw className={`h-4 w-4 mr-2 text-white ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Repositories'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Actions */}
      {selectedCount > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-white">Ready to save your portfolio?</h4>
                <p className="text-sm text-gray-400">
                  {selectedCount} repositories selected with descriptions
                </p>
              </div>
              <Button
                onClick={handleSaveSelections}
                disabled={saving || !hasUnsavedChanges}
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin text-white" />
                ) : (
                  <Save className="h-4 w-4 mr-2 text-white" />
                )}
                {saving ? 'Saving Portfolio...' : hasUnsavedChanges ? 'Save Portfolio' : 'Portfolio Saved'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};