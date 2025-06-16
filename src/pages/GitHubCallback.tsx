import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { GitHubService } from "@/services/githubService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, Github } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GitHubCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connecting to GitHub...');
  const [repositoryCount, setRepositoryCount] = useState<number>(0);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const state = searchParams.get('state');

        if (error) {
          throw new Error(`GitHub OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received from GitHub');
        }

        // Wait for user to be available (for development mode)
        let retries = 0;
        while (!user && retries < 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }

        if (!user) {
          throw new Error('User not authenticated');
        }

        setMessage('Exchanging authorization code...');

        // Exchange code for access token
        const accessToken = await GitHubService.exchangeCodeForToken(code);

        setMessage('Fetching GitHub user information...');

        // Get GitHub user information
        const githubUser = await GitHubService.getUser(accessToken);

        setMessage('Fetching repositories...');

        // Get user repositories
        const repositories = await GitHubService.getUserRepositories(accessToken);

        setMessage('Storing GitHub data...');

        // Store GitHub data
        await GitHubService.storeGitHubToken(user.id, accessToken, githubUser);

        setMessage('Syncing repositories to profile...');

        // Skip repository sync in development mode to avoid RLS issues
        if (import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === 'true') {
          console.log('Development mode: Skipping repository sync to avoid RLS issues');
        } else {
          // Sync repositories to profile
          await GitHubService.syncRepositoriesToProfile(user.id, repositories);
        }

        setRepositoryCount(repositories.length);
        setMessage(`Successfully connected GitHub account and synced ${repositories.length} repositories!`);
        setStatus('success');

        // Redirect to main dashboard after a delay
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 2000);

      } catch (error) {
        console.error('GitHub callback error:', error);
        setMessage(error instanceof Error ? error.message : 'Failed to connect GitHub account');
        setStatus('error');
      }
    };

    handleCallback();
  }, [searchParams, navigate, user]);

  const handleRetry = () => {
    GitHubService.initiateOAuth();
  };

  const handleContinue = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Github className="h-12 w-12 text-gray-700" />
          </div>
          <CardTitle className="text-2xl">GitHub Integration</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {status === 'loading' && (
            <div className="space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="text-gray-600">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <div className="space-y-2">
                <p className="text-green-700 font-medium">GitHub Connected Successfully!</p>
                <p className="text-sm text-gray-600">{message}</p>
                {repositoryCount > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                    <p className="text-sm text-green-800">
                      <span className="font-medium">{repositoryCount} repositories</span> have been added to your profile
                    </p>
                  </div>
                )}
              </div>
              <Button onClick={handleContinue} className="w-full">
                Continue to Profile
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <XCircle className="h-12 w-12 text-red-600 mx-auto" />
              <div className="space-y-2">
                <p className="text-red-700 font-medium">Connection Failed</p>
                <p className="text-sm text-gray-600">{message}</p>
              </div>
              <div className="space-y-2">
                <Button onClick={handleRetry} variant="outline" className="w-full">
                  Try Again
                </Button>
                <Button 
                  onClick={handleContinue} 
                  variant="ghost" 
                  className="w-full text-gray-500"
                >
                  Continue Without GitHub
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}