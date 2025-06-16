import { useState, useEffect } from "react";
import { Github, ExternalLink, Star, GitFork, Calendar, RefreshCw, Unlink, Code, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { GitHubService, GitHubRepository, GitHubUser } from "@/services/githubService";
import { UserService } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface GitHubIntegrationProps {
  onRepositoriesSync?: () => void;
}

export const GitHubIntegration = ({ onRepositoriesSync }: GitHubIntegrationProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [githubUser, setGitHubUser] = useState<GitHubUser | null>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    checkConnection();
  }, [user]);

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
    } finally {
      setLoading(false);
    }
  };

  const loadGitHubData = async () => {
    if (!user) return;

    try {
      const token = await GitHubService.getGitHubToken(user.id);
      if (!token) return;

      // Load GitHub user data and repositories
      const [githubUserData, repos] = await Promise.all([
        GitHubService.getUser(token),
        GitHubService.getUserRepositories(token)
      ]);

      setGitHubUser(githubUserData);
      setRepositories(repos);
      setStats(GitHubService.getRepositoryStats(repos));
    } catch (error) {
      console.error('Error loading GitHub data:', error);
      toast({
        title: "Error loading GitHub data",
        description: "Failed to fetch your GitHub information. Please try reconnecting.",
        variant: "destructive",
      });
    }
  };

  const handleConnect = () => {
    GitHubService.initiateOAuth();
  };

  const handleSync = async () => {
    if (!user) return;

    try {
      setSyncing(true);
      const token = await GitHubService.getGitHubToken(user.id);
      if (!token) {
        throw new Error('GitHub token not found');
      }

      const repos = await GitHubService.getUserRepositories(token);
      await GitHubService.syncRepositoriesToProfile(user.id, repos);

      setRepositories(repos);
      setStats(GitHubService.getRepositoryStats(repos));

      toast({
        title: "Repositories synced",
        description: `Successfully synced ${repos.length} repositories to your profile.`,
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

  const handleDisconnect = async () => {
    if (!user) return;

    try {
      await GitHubService.disconnectGitHub(user.id);
      setIsConnected(false);
      setGitHubUser(null);
      setRepositories([]);
      setStats(null);

      toast({
        title: "GitHub disconnected",
        description: "Your GitHub account has been disconnected and repository data removed.",
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
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            <CardTitle>GitHub Integration</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            <CardTitle>GitHub Integration</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect your GitHub account to automatically import your repositories and showcase your projects.
          </p>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Benefits:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Automatically sync your public repositories</li>
              <li>• Display project statistics and technologies</li>
              <li>• Include relevant projects in job applications</li>
              <li>• Keep your profile up to date</li>
            </ul>
          </div>
          <Button onClick={handleConnect} className="w-full">
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              <CardTitle>GitHub Account</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSync}
                disabled={syncing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
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
                <h3 className="font-medium">
                  {githubUser.name || githubUser.login}
                </h3>
                <p className="text-sm text-muted-foreground">
                  @{githubUser.login}
                </p>
                {githubUser.bio && (
                  <p className="text-sm text-muted-foreground">{githubUser.bio}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{githubUser.public_repos} repositories</span>
                  <span>{githubUser.followers} followers</span>
                  <span>{githubUser.following} following</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Repository Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Repository Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalRepos}</div>
                <div className="text-sm text-muted-foreground">Repositories</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.totalStars}</div>
                <div className="text-sm text-muted-foreground">Total Stars</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.totalForks}</div>
                <div className="text-sm text-muted-foreground">Total Forks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.languages.length}</div>
                <div className="text-sm text-muted-foreground">Languages</div>
              </div>
            </div>

            {stats.languages.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-3">Top Languages</h4>
                <div className="flex flex-wrap gap-2">
                  {stats.languages.map(([language, count]: [string, number]) => (
                    <Badge key={language} variant="secondary">
                      {language} ({count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Top Repositories */}
      {stats?.topRepos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Top Repositories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topRepos.map((repo: GitHubRepository) => (
                <div
                  key={repo.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{repo.name}</h4>
                        <Badge variant="outline">{repo.language || 'N/A'}</Badge>
                      </div>
                      {repo.description && (
                        <p className="text-sm text-muted-foreground">
                          {repo.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                    <Button
                      variant="ghost"
                      size="sm"
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
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};