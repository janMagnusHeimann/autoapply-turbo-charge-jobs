import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Bot,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Eye,
  RefreshCw,
  Pause,
  Play,
  StopCircle,
  FileText,
  Send,
  Loader2
} from "lucide-react";
import { ApplicationService } from "@/services/applicationService";
import { toast } from "sonner";

interface ApplicationStatus {
  application_id: string;
  status: string;
  progress_percentage: number;
  current_step: string;
  messages: string[];
  form_data?: any;
  error?: string;
}

interface ApplicationProgressTrackerProps {
  applicationId: string;
  jobTitle: string;
  company: string;
  onComplete?: (status: ApplicationStatus) => void;
  onError?: (error: string) => void;
}

export const ApplicationProgressTracker = ({
  applicationId,
  jobTitle,
  company,
  onComplete,
  onError
}: ApplicationProgressTrackerProps) => {
  const [status, setStatus] = useState<ApplicationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(true);
  const [pollingCleanup, setPollingCleanup] = useState<(() => void) | null>(null);

  useEffect(() => {
    startPolling();
    return () => {
      if (pollingCleanup) {
        pollingCleanup();
      }
    };
  }, [applicationId]);

  const startPolling = () => {
    setLoading(true);
    setPolling(true);

    const cleanup = ApplicationService.startStatusPolling(
      applicationId,
      (newStatus) => {
        setStatus(newStatus);
        setLoading(false);

        // Check if application is complete
        if (['submitted', 'failed', 'cancelled'].includes(newStatus.status)) {
          setPolling(false);
          
          if (newStatus.status === 'submitted') {
            onComplete?.(newStatus);
            toast.success("🎉 Application submitted successfully!", {
              description: `Your application to ${company} has been submitted.`
            });
          } else if (newStatus.status === 'failed') {
            onError?.(newStatus.error || 'Application failed');
            toast.error("❌ Application failed", {
              description: newStatus.error || "The application process encountered an error."
            });
          }
        }
      },
      (error) => {
        setLoading(false);
        setPolling(false);
        onError?.(error);
        toast.error("Connection error", {
          description: "Lost connection to application status updates."
        });
      }
    );

    setPollingCleanup(() => cleanup);
  };

  const stopPolling = () => {
    if (pollingCleanup) {
      pollingCleanup();
      setPollingCleanup(null);
    }
    setPolling(false);
  };

  const handleCancelApplication = async () => {
    try {
      const result = await ApplicationService.cancelApplication(applicationId);
      if (result.success) {
        toast.success("Application cancelled");
        stopPolling();
      } else {
        toast.error("Failed to cancel application", {
          description: result.error
        });
      }
    } catch (error) {
      toast.error("Failed to cancel application");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'analyzing':
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'preparing':
        return <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />;
      case 'filling':
        return <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />;
      case 'reviewing':
        return <Eye className="w-5 h-5 text-orange-400" />;
      case 'submitting':
        return <Loader2 className="w-5 h-5 text-green-400 animate-spin" />;
      case 'submitted':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'cancelled':
        return <StopCircle className="w-5 h-5 text-gray-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'analyzing':
      case 'preparing':
        return 'bg-blue-600';
      case 'filling':
        return 'bg-purple-600';
      case 'reviewing':
        return 'bg-orange-600';
      case 'submitting':
        return 'bg-green-600';
      case 'submitted':
        return 'bg-green-600';
      case 'failed':
        return 'bg-red-600';
      case 'cancelled':
        return 'bg-gray-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'analyzing':
        return 'Analyzing Form';
      case 'preparing':
        return 'Preparing Data';
      case 'filling':
        return 'Filling Form';
      case 'reviewing':
        return 'Ready for Review';
      case 'submitting':
        return 'Submitting';
      case 'submitted':
        return 'Submitted';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  if (loading && !status) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            <span className="text-white">Connecting to application agent...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-white">Failed to load application status</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="w-6 h-6 text-blue-400" />
            <div>
              <h3 className="text-white">AI Application Progress</h3>
              <p className="text-sm text-gray-400">{jobTitle} at {company}</p>
            </div>
          </div>
          
          <Badge className={getStatusColor(status.status)}>
            {getStatusText(status.status)}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">{status.current_step}</span>
            <span className="text-white">{status.progress_percentage}%</span>
          </div>
          <Progress 
            value={status.progress_percentage} 
            className="h-2"
          />
        </div>

        {/* Current status */}
        <div className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg">
          {getStatusIcon(status.status)}
          <div className="flex-1">
            <h4 className="font-medium text-white">{status.current_step}</h4>
            {status.status === 'reviewing' && (
              <p className="text-sm text-gray-400">
                Form filled and ready for your review before submission
              </p>
            )}
          </div>
        </div>

        {/* Messages */}
        {status.messages && status.messages.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-white">Recent Activity</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {status.messages.slice(-5).map((message, index) => (
                <div key={index} className="text-sm text-gray-300 p-2 bg-gray-800 rounded">
                  {message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error display */}
        {status.error && (
          <div className="p-4 bg-red-900/20 border border-red-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-300">Error</h4>
                <p className="text-sm text-red-200">{status.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-700">
          <div className="flex items-center gap-2">
            {polling ? (
              <Button
                variant="outline"
                size="sm"
                onClick={stopPolling}
                className="text-white border-gray-600"
              >
                <Pause className="w-4 h-4 mr-1" />
                Pause Updates
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={startPolling}
                className="text-white border-gray-600"
              >
                <Play className="w-4 h-4 mr-1" />
                Resume Updates
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/application/${applicationId}`, '_blank')}
              className="text-white border-gray-600"
            >
              <Eye className="w-4 h-4 mr-1" />
              View Details
            </Button>
          </div>

          {/* Status-specific actions */}
          {status.status === 'reviewing' && status.form_data && (
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <FileText className="w-4 h-4 mr-1" />
              Review Form
            </Button>
          )}

          {['analyzing', 'preparing', 'filling', 'submitting'].includes(status.status) && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancelApplication}
            >
              <StopCircle className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          )}

          {status.status === 'submitted' && (
            <Button
              variant="outline"
              size="sm"
              className="text-green-400 border-green-600"
            >
              <Send className="w-4 h-4 mr-1" />
              View Application
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};