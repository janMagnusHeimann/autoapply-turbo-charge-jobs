
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign, Clock, Building, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { UserService } from "@/services/userService";

interface PendingApplication {
  id: string;
  job_title: string;
  company_name: string;
  company_url?: string;
  job_url: string;
  job_description?: string;
  location?: string;
  salary_range?: string;
  source_platform: string;
  cv_preview?: string;
  match_score?: number;
  discovered_at: string;
}

export const ReviewQueue = () => {
  const { user } = useAuth();
  const [pendingApplications, setPendingApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchPendingApplications();
    }
  }, [user]);

  const fetchPendingApplications = async () => {
    if (!user) return;

    try {
      const data = await UserService.getPendingApplications(user.id);
      setPendingApplications(data);
    } catch (error) {
      console.error('Error fetching pending applications:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load pending applications"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (application: PendingApplication) => {
    setProcessingIds(prev => new Set(prev).add(application.id));
    
    try {
      // TODO: Implement the actual application submission logic
      // This would typically involve calling an edge function or creating
      // an entry in the job_applications table
      
      // For now, we'll just remove it from the queue
      const { error } = await supabase
        .from('pending_applications')
        .delete()
        .eq('id', application.id);

      if (error) {
        throw error;
      }

      setPendingApplications(prev => prev.filter(app => app.id !== application.id));
      
      toast({
        title: "Application Submitted",
        description: `Successfully applied to ${application.job_title} at ${application.company_name}`
      });
    } catch (error) {
      console.error('Error applying to job:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit application"
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(application.id);
        return newSet;
      });
    }
  };

  const handleDiscard = async (application: PendingApplication) => {
    setProcessingIds(prev => new Set(prev).add(application.id));
    
    try {
      const { error } = await supabase
        .from('pending_applications')
        .delete()
        .eq('id', application.id);

      if (error) {
        throw error;
      }

      setPendingApplications(prev => prev.filter(app => app.id !== application.id));
      
      toast({
        title: "Job Discarded",
        description: `Removed ${application.job_title} at ${application.company_name} from queue`
      });
    } catch (error) {
      console.error('Error discarding job:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to discard job"
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(application.id);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMatchScoreColor = (score?: number) => {
    if (!score) return 'secondary';
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    return 'outline';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Review Queue</h1>
          <p className="text-gray-400">Loading pending applications...</p>
        </div>
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-gray-900 border-gray-800 animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-700 rounded mb-4"></div>
                <div className="h-4 bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (pendingApplications.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Review Queue</h1>
          <p className="text-gray-400">Review and approve job applications before they're submitted</p>
        </div>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-8 text-center">
            <Clock className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No jobs in queue</h3>
            <p className="text-gray-400">
              The system will automatically discover new job opportunities and add them here for your review.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Review Queue</h1>
        <p className="text-gray-400">
          {pendingApplications.length} job{pendingApplications.length !== 1 ? 's' : ''} waiting for your review
        </p>
      </div>

      <div className="grid gap-6">
        {pendingApplications.map((application) => {
          const isProcessing = processingIds.has(application.id);
          
          return (
            <Card key={application.id} className="bg-gray-900 border-gray-800">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-xl">{application.job_title}</CardTitle>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Building className="h-4 w-4" />
                      <span>{application.company_name}</span>
                      {application.company_url && (
                        <a 
                          href={application.company_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {application.match_score && (
                      <Badge variant={getMatchScoreColor(application.match_score)}>
                        {Math.round(application.match_score * 100)}% match
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {application.source_platform}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                  {application.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{application.location}</span>
                    </div>
                  )}
                  {application.salary_range && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      <span>{application.salary_range}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Discovered {formatDate(application.discovered_at)}</span>
                  </div>
                </div>

                {application.job_description && (
                  <div>
                    <h4 className="font-semibold mb-2">Job Description</h4>
                    <p className="text-gray-300 text-sm line-clamp-3">
                      {application.job_description}
                    </p>
                  </div>
                )}

                {application.cv_preview && (
                  <div>
                    <h4 className="font-semibold mb-2">AI-Generated CV Preview</h4>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <p className="text-gray-300 text-sm line-clamp-4">
                        {application.cv_preview}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
                  <Button
                    onClick={() => handleApply(application)}
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isProcessing ? 'Processing...' : 'Apply'}
                  </Button>
                  <Button
                    onClick={() => handleDiscard(application)}
                    disabled={isProcessing}
                    variant="outline"
                    className="border-gray-600 hover:bg-gray-800"
                  >
                    Discard
                  </Button>
                  <a
                    href={application.job_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                  >
                    View Job <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
