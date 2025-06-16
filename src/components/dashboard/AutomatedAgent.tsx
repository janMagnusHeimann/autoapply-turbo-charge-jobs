import { useState, useEffect } from "react";
import { Play, Pause, Square, DollarSign, Target, Briefcase, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { enhancedAIAgentOrchestrator, type AgentSession, type AgentProgress } from "@/services/enhancedAIAgentOrchestrator";
import { toast } from "sonner";

export const AutomatedAgent = () => {
  const { user, userProfile, userPreferences } = useAuth();
  const [session, setSession] = useState<AgentSession | null>(null);
  const [progress, setProgress] = useState<AgentProgress | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    // Set up progress callback
    enhancedAIAgentOrchestrator.setProgressCallback((progressUpdate) => {
      setProgress(progressUpdate);
    });

    // Check for existing session
    const existingSession = enhancedAIAgentOrchestrator.getCurrentSession();
    if (existingSession) {
      setSession(existingSession);
    }
  }, []);

  const handleStartAgent = async () => {
    console.log('🎯 [UI DEBUG] Starting agent button clicked');
    
    if (!user) {
      console.log('❌ [UI DEBUG] No user found');
      toast.error("Please log in to start the agent");
      return;
    }

    if (!userProfile || !userPreferences) {
      console.log('❌ [UI DEBUG] Missing profile data:', { userProfile: !!userProfile, userPreferences: !!userPreferences });
      toast.error("Please complete your profile setup first");
      return;
    }

    console.log('✅ [UI DEBUG] User validation passed:', {
      userId: user.id,
      userEmail: user.email,
      profileName: userProfile.full_name,
      skillsCount: userPreferences.skills.length,
      industriesCount: userPreferences.preferred_industries.length
    });

    setIsStarting(true);
    try {
      console.log('🚀 [UI DEBUG] Starting automated session...');
      const newSession = await enhancedAIAgentOrchestrator.startAutomatedSession(user.id);
      console.log('✅ [UI DEBUG] Session created:', newSession);
      setSession(newSession);
      
      console.log('🔄 [UI DEBUG] Starting enhanced automated process...');
      // Start the enhanced automated process
      enhancedAIAgentOrchestrator.processEnhancedAutomatedApplications(user.id).then((result) => {
        console.log('🎉 [UI DEBUG] Process completed:', result);
        if (result.success) {
          toast.success(`Agent completed! Found ${result.total_jobs_scraped} jobs, ${result.total_matches.length} matches, generated ${result.generated_cvs.length} CVs`);
        } else {
          console.error('❌ [UI DEBUG] Process failed:', result.error);
          toast.error(`Agent failed: ${result.error}`);
        }
      }).catch((error) => {
        console.error('❌ [UI DEBUG] Agent process error:', error);
        toast.error("Agent encountered an error");
      });

      toast.success("Automated agent started!");
    } catch (error) {
      console.error('❌ [UI DEBUG] Error starting agent:', error);
      toast.error("Failed to start agent");
    } finally {
      console.log('🏁 [UI DEBUG] Setting isStarting to false');
      setIsStarting(false);
    }
  };

  const handlePauseAgent = async () => {
    await enhancedAIAgentOrchestrator.pauseSession();
    if (session) {
      setSession({ ...session, status: 'paused' });
    }
    toast.info("Agent paused");
  };

  const handleResumeAgent = async () => {
    await enhancedAIAgentOrchestrator.resumeSession();
    if (session) {
      setSession({ ...session, status: 'running' });
    }
    toast.info("Agent resumed");
  };

  const handleStopAgent = async () => {
    await enhancedAIAgentOrchestrator.pauseSession();
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
    userPreferences.preferred_industries.length > 0 && 
    userPreferences.skills.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">AI Job Application Agent</h1>
        <p className="text-gray-400">
          Automated job discovery and application system
        </p>
      </div>

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

            {session && (
              <Badge variant="secondary" className={`${getStatusColor(session.status)} text-white`}>
                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Session Stats */}
      {session && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Companies</p>
                  <p className="text-2xl font-bold text-white">{session.companies_processed}</p>
                </div>
                <Target className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Career Pages</p>
                  <p className="text-2xl font-bold text-white">{session.career_pages_found || 0}</p>
                </div>
                <Target className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Jobs Found</p>
                  <p className="text-2xl font-bold text-white">{session.jobs_discovered || 0}</p>
                </div>
                <Briefcase className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Job Matches</p>
                  <p className="text-2xl font-bold text-white">{session.jobs_matched || 0}</p>
                </div>
                <Target className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">CVs Generated</p>
                  <p className="text-2xl font-bold text-white">{session.applications_generated || 0}</p>
                </div>
                <Clock className="w-8 h-8 text-cyan-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Cost</p>
                  <p className="text-2xl font-bold text-white">${session.total_cost_usd.toFixed(4)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Current Progress */}
      {progress && session?.status === 'running' && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              {getStepIcon(progress.step)}
              Current Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">
                  {progress.company_name}
                  {progress.job_title && ` - ${progress.job_title}`}
                </span>
                <span className="text-sm text-gray-400">
                  {Math.round(progress.progress_percent)}%
                </span>
              </div>
              <Progress value={progress.progress_percent} className="h-2" />
            </div>
            
            <p className="text-gray-300">{progress.message}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-gray-400">Step</div>
                <div className="font-medium text-white">{progress.step.replace('_', ' ')}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">Jobs Found</div>
                <div className="font-medium text-white">{progress.jobs_found_so_far || 0}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">Matches</div>
                <div className="font-medium text-white">{progress.matches_found_so_far || 0}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">Cost</div>
                <div className="font-medium text-white">${progress.cost_so_far.toFixed(4)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Breakdown */}
      {session && session.total_cost_usd > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Cost Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {enhancedAIAgentOrchestrator.getCostBreakdown().map((cost, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-800">
                  <div>
                    <span className="text-sm font-medium text-white">{cost.operation}</span>
                    <span className="text-xs text-gray-400 ml-2">({cost.model})</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white">${cost.cost_usd.toFixed(4)}</div>
                    <div className="text-xs text-gray-400">
                      {cost.input_tokens + cost.output_tokens} tokens
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How It Works */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">How the Automated Agent Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold mt-0.5">1</div>
              <div>
                <strong>Company Matching:</strong> Analyzes your preferences to find relevant companies, filters by industry and excludes blacklisted ones
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold mt-0.5">2</div>
              <div>
                <strong>Career Page Discovery:</strong> Uses web search to find each company's actual career pages with high confidence scoring
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold mt-0.5">3</div>
              <div>
                <strong>AI Job Scraping:</strong> LangChain-powered web agent extracts real job listings with detailed requirements and descriptions
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center text-white text-xs font-bold mt-0.5">4</div>
              <div>
                <strong>Smart Job Matching:</strong> Advanced scoring system evaluates compatibility across skills, location, experience, and salary
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-600 flex items-center justify-center text-white text-xs font-bold mt-0.5">5</div>
              <div>
                <strong>Targeted CV Generation:</strong> Creates ATS-optimized CVs tailored to specific job requirements using match analysis
              </div>
            </div>
            <div className="flex items-start gap-3 opacity-50">
              <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs font-bold mt-0.5">6</div>
              <div>
                <strong>Application Submission:</strong> <em>(Coming Soon)</em> Automated form filling and application submission
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};