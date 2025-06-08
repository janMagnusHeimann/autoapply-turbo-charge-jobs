import { useState, useEffect } from "react";
import { Play, Pause, Square, DollarSign, Target, Briefcase, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { aiAgentOrchestrator, type AgentSession, type AgentProgress } from "@/services/aiAgentOrchestrator";
import { toast } from "sonner";

export const AutomatedAgent = () => {
  const { user, userProfile, userPreferences } = useAuth();
  const [session, setSession] = useState<AgentSession | null>(null);
  const [progress, setProgress] = useState<AgentProgress | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    // Set up progress callback
    aiAgentOrchestrator.setProgressCallback((progressUpdate) => {
      setProgress(progressUpdate);
    });

    // Check for existing session
    const existingSession = aiAgentOrchestrator.getCurrentSession();
    if (existingSession) {
      setSession(existingSession);
    }
  }, []);

  const handleStartAgent = async () => {
    if (!user) {
      toast.error("Please log in to start the agent");
      return;
    }

    if (!userProfile || !userPreferences) {
      toast.error("Please complete your profile setup first");
      return;
    }

    setIsStarting(true);
    try {
      const newSession = await aiAgentOrchestrator.startAutomatedSession(user.id);
      setSession(newSession);
      
      // Start the automated process
      aiAgentOrchestrator.processAutomatedApplications(user.id).catch((error) => {
        console.error('Agent process error:', error);
        toast.error("Agent encountered an error");
      });

      toast.success("Automated agent started!");
    } catch (error) {
      console.error('Error starting agent:', error);
      toast.error("Failed to start agent");
    } finally {
      setIsStarting(false);
    }
  };

  const handlePauseAgent = async () => {
    await aiAgentOrchestrator.pauseSession();
    if (session) {
      setSession({ ...session, status: 'paused' });
    }
    toast.info("Agent paused");
  };

  const handleResumeAgent = async () => {
    await aiAgentOrchestrator.resumeSession();
    if (session) {
      setSession({ ...session, status: 'running' });
    }
    toast.info("Agent resumed");
  };

  const handleStopAgent = async () => {
    await aiAgentOrchestrator.pauseSession();
    if (session) {
      setSession({ ...session, status: 'completed' });
    }
    setProgress(null);
    toast.info("Agent stopped");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'matching': return <Target className="w-4 h-4" />;
      case 'discovering': return <Briefcase className="w-4 h-4" />;
      case 'generating': return <Clock className="w-4 h-4" />;
      case 'applying': return <CheckCircle className="w-4 h-4" />;
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
            <Alert className="border-yellow-600 bg-yellow-600/10">
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
                className="bg-green-600 hover:bg-green-700"
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
                    className="border-yellow-500 text-yellow-500"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                ) : (
                  <Button
                    onClick={handleResumeAgent}
                    className="bg-green-600 hover:bg-green-700"
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Companies Processed</p>
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
                  <p className="text-sm text-gray-400">Applications Submitted</p>
                  <p className="text-2xl font-bold text-white">{session.applications_submitted}</p>
                </div>
                <Briefcase className="w-8 h-8 text-green-400" />
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

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Runtime</p>
                  <p className="text-2xl font-bold text-white">
                    {session.completed_at 
                      ? Math.round((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 60000)
                      : Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000)
                    }m
                  </p>
                </div>
                <Clock className="w-8 h-8 text-purple-400" />
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
            
            <div className="flex items-center justify-between text-sm">
              <Badge variant="outline" className="border-blue-500 text-blue-400">
                Step: {progress.step}
              </Badge>
              <span className="text-gray-400">
                Cost so far: ${progress.cost_so_far.toFixed(4)}
              </span>
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
              {aiAgentOrchestrator.getCostBreakdown().map((cost, index) => (
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
                <strong>Company Matching:</strong> Finds companies that match your industry preferences and aren't excluded
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold mt-0.5">2</div>
              <div>
                <strong>Job Discovery:</strong> Searches each company's career page for available positions
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold mt-0.5">3</div>
              <div>
                <strong>CV Generation:</strong> Creates tailored CVs for each specific job and company
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold mt-0.5">4</div>
              <div>
                <strong>Application Submission:</strong> Automatically fills out forms and submits applications
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};