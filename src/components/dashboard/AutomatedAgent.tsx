import { useState, useEffect } from "react";
import { Play, Pause, Square, DollarSign, Target, Briefcase, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Import the new unified service
import { unifiedJobDiscoveryService, type JobDiscoveryResult } from "@/services/unifiedJobDiscoveryService";

// Define interfaces for the component
interface AgentSession {
  id: string;
  user_id: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

interface AgentProgress {
  stage: string;
  company: string;
  message: string;
  progress: number;
  jobs_found: number;
  current_operation: string;
}

interface ProcessResult {
  success: boolean;
  total_jobs_scraped: number;
  total_matches: any[];
  generated_cvs: any[];
  companies_processed: any[];
  results_by_company: Record<string, JobDiscoveryResult>;
  execution_time: number;
  error?: string;
}

export const AutomatedAgent = () => {
  const { user, userProfile, userPreferences } = useAuth();
  const [session, setSession] = useState<AgentSession | null>(null);
  const [progress, setProgress] = useState<AgentProgress | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [results, setResults] = useState<ProcessResult | null>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  useEffect(() => {
    // Check system status on mount
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    try {
      const status = await unifiedJobDiscoveryService.getSystemStatus();
      setSystemStatus(status);
      console.log('System status:', status);
    } catch (error) {
      console.error('Failed to get system status:', error);
    }
  };

  const handleStartAgent = async () => {
    console.log('🎯 [UI DEBUG] Starting unified agent button clicked');
    
    if (!user) {
      console.log('❌ [UI DEBUG] No user found');
      toast.error("Please log in to start the agent");
      return;
    }

    if (!userProfile || !userPreferences) {
      console.log('❌ [UI DEBUG] Missing profile data:', { userProfile: !!userProfile, userPreferences: !!userPreferences });
      toast.error("Profile Setup Required", {
        description: "Please complete your profile setup first by adding your personal information and preferences in Settings"
      });
      return;
    }

    // Check for required fields
    if (!userPreferences.preferred_industries || userPreferences.preferred_industries.length === 0) {
      toast.error("Missing Industry Preferences", {
        description: "Please add at least one preferred industry in your profile settings to start the automated agent"
      });
      return;
    }

    if (!userPreferences.skills || userPreferences.skills.length === 0) {
      toast.error("Missing Skills Information", {
        description: "Please add your skills in your profile settings to help the agent match you with relevant jobs"
      });
      return;
    }

    console.log('✅ [UI DEBUG] User validation passed:', {
      userId: user.id,
      userEmail: user.email,
      profileName: userProfile.full_name,
      skillsCount: userPreferences.skills?.length || 0,
      industriesCount: userPreferences.preferred_industries?.length || 0
    });

    setIsStarting(true);
    setResults(null);
    
    try {
      console.log('🚀 [UI DEBUG] Starting unified automated session...');
      
      // Create a compatibility session
      const newSession = unifiedJobDiscoveryService.createCompatibilitySession(user.id);
      console.log('✅ [UI DEBUG] Session created:', newSession);
      setSession(newSession);
      
      // Define progress callback
      const progressCallback = (update: AgentProgress) => {
        console.log('📊 [UI DEBUG] Progress update:', update);
        setProgress(update);
      };

      console.log('🔄 [UI DEBUG] Starting unified automated process...');
      console.log('🔄 [UI DEBUG] unifiedJobDiscoveryService:', unifiedJobDiscoveryService);
      console.log('🔄 [UI DEBUG] processAutomatedApplications method:', unifiedJobDiscoveryService.processAutomatedApplications);
      
      // Start the unified automated process
      const result = await unifiedJobDiscoveryService.processAutomatedApplications(
        user.id,
        userProfile,
        userPreferences,
        progressCallback
      );
      
      console.log('🎉 [UI DEBUG] Process completed:', result);
      setResults(result);
      
      if (result.success) {
        toast.success(
          `Agent completed! Found ${result.total_jobs_scraped} jobs, ${result.total_matches.length} matches across ${result.companies_processed.length} companies`
        );
        
        // Update session status
        if (session) {
          setSession({ ...session, status: 'completed' });
        }
      } else {
        console.error('❌ [UI DEBUG] Process failed:', result.error);
        toast.error(`Agent failed: ${result.error}`);
        
        // Update session status
        if (session) {
          setSession({ ...session, status: 'failed' });
        }
      }
      
    } catch (error) {
      console.error('❌ [UI DEBUG] Agent process error:', error);
      toast.error("Agent encountered an error");
      
      // Update session status
      if (session) {
        setSession({ ...session, status: 'failed' });
      }
    } finally {
      console.log('🏁 [UI DEBUG] Setting isStarting to false');
      setIsStarting(false);
    }
  };

  const handlePauseAgent = async () => {
    // Note: The unified service doesn't support pause/resume yet
    // This is a placeholder for future implementation
    if (session) {
      setSession({ ...session, status: 'paused' });
    }
    toast.info("Agent paused");
  };

  const handleResumeAgent = async () => {
    // Note: The unified service doesn't support pause/resume yet
    // This is a placeholder for future implementation
    if (session) {
      setSession({ ...session, status: 'running' });
    }
    toast.info("Agent resumed");
  };

  const handleStopAgent = async () => {
    if (session) {
      setSession({ ...session, status: 'completed' });
    }
    setProgress(null);
    toast.info("Agent stopped");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-gray-600';
      case 'paused': return 'bg-gray-500';
      case 'completed': return 'bg-gray-700';
      case 'failed': return 'bg-gray-800';
      default: return 'bg-gray-500';
    }
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'discovering_careers': return <Target className="w-4 h-4" />;
      case 'scraping_jobs': return <Briefcase className="w-4 h-4" />;
      case 'matching_jobs': return <Target className="w-4 h-4" />;
      case 'generating_cvs': return <Clock className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const canStartAgent = userProfile && userPreferences && 
    userPreferences.preferred_industries?.length > 0 && 
    userPreferences.skills?.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">AI Job Application Agent</h1>
        <p className="text-gray-400">
          Automated job discovery and application system
        </p>
      </div>

      {/* System Status Display */}
      {systemStatus && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Backend: </span>
                <Badge variant={systemStatus.status === 'operational' ? 'default' : 'destructive'}>
                  {systemStatus.status}
                </Badge>
              </div>
              <div>
                <span className="text-gray-400">Agent System: </span>
                <Badge variant={systemStatus.new_agent_system_available ? 'default' : 'secondary'}>
                  {systemStatus.new_agent_system_available ? 'New' : 'Legacy'}
                </Badge>
              </div>
              <div>
                <span className="text-gray-400">Mode: </span>
                <Badge variant={systemStatus.demo_mode ? 'secondary' : 'default'}>
                  {systemStatus.demo_mode ? 'Demo' : 'Production'}
                </Badge>
              </div>
              <div>
                <span className="text-gray-400">Active Sessions: </span>
                <span className="text-white">{systemStatus.active_sessions}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Control Panel */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Agent Control Center
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canStartAgent && (
            <Alert className="border-gray-600 bg-gray-800/50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-yellow-400">
                Please complete your profile setup (industries and skills) before starting the agent.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-4">
            {!session || session.status === 'completed' || session.status === 'failed' ? (
              <Button
                onClick={handleStartAgent}
                disabled={!canStartAgent || isStarting}
                className="bg-gray-700 hover:bg-gray-600 border border-gray-600"
              >
                <Play className="w-4 h-4 mr-2" />
                {isStarting ? "Starting..." : "Start Automated Agent"}
              </Button>
            ) : (
              <div className="flex gap-2">
                {session.status === 'running' ? (
                  <Button
                    onClick={handlePauseAgent}
                    variant="outline"
                    className="!text-yellow-500 !border-yellow-500 !bg-transparent hover:!bg-yellow-500/10 hover:!text-yellow-400"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                ) : (
                  <Button
                    onClick={handleResumeAgent}
                    className="bg-gray-700 hover:bg-gray-600 border border-gray-600"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </Button>
                )}
                <Button
                  onClick={handleStopAgent}
                  variant="destructive"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </div>
            )}
          </div>

          {/* Session Info */}
          {session && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(session.status)}`} />
                <span className="text-gray-400">Status:</span>
                <span className="text-white capitalize">{session.status}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Session ID:</span>
                <span className="text-white font-mono text-xs">{session.id}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Display */}
      {progress && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              {getStepIcon(progress.stage)}
              Current Operation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">{progress.current_operation}</span>
                <span className="text-white">{Math.round(progress.progress * 100)}%</span>
              </div>
              <Progress value={progress.progress * 100} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Stage: </span>
                <span className="text-white capitalize">{progress.stage.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-gray-400">Company: </span>
                <span className="text-white">{progress.company}</span>
              </div>
              <div>
                <span className="text-gray-400">Jobs Found: </span>
                <span className="text-white">{progress.jobs_found}</span>
              </div>
            </div>
            
            <div className="text-sm text-gray-300">{progress.message}</div>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {results && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Execution Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-400 text-sm">Total Jobs</span>
                </div>
                <div className="text-2xl font-bold text-white">{results.total_jobs_scraped}</div>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-green-400" />
                  <span className="text-gray-400 text-sm">Matches</span>
                </div>
                <div className="text-2xl font-bold text-white">{results.total_matches.length}</div>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-400 text-sm">Companies</span>
                </div>
                <div className="text-2xl font-bold text-white">{results.companies_processed.length}</div>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-orange-400" />
                  <span className="text-gray-400 text-sm">Time</span>
                </div>
                <div className="text-2xl font-bold text-white">{Math.round(results.execution_time)}s</div>
              </div>
            </div>

            {/* Company Results Summary */}
            {Object.keys(results.results_by_company).length > 0 && (
              <div>
                <h4 className="text-white font-semibold mb-3">Results by Company</h4>
                <div className="space-y-2">
                  {Object.entries(results.results_by_company).map(([companyName, result]) => (
                    <div key={companyName} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${result.success ? 'bg-green-400' : 'bg-red-400'}`} />
                        <span className="text-white font-medium">{companyName}</span>
                        <Badge variant={result.agent_system_used === 'new' ? 'default' : 'secondary'}>
                          {result.agent_system_used}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-400">
                          {result.total_jobs} jobs • {result.matched_jobs.length} matches
                        </span>
                        {result.used_browser && (
                          <Badge variant="outline" className="text-xs">Browser</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Display */}
            {!results.success && results.error && (
              <Alert className="border-red-600 bg-red-900/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-400">
                  {results.error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};