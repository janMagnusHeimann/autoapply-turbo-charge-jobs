import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  Upload, 
  Bot, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Eye,
  Download,
  Sparkles,
  Settings,
  Play
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ApplicationService } from "@/services/applicationService";
import { CVSelectionService } from "@/services/cvSelectionService";
import { toast } from "sonner";

interface JobOpportunity {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  applicationUrl: string;
}

interface CVOption {
  id: string;
  type: 'generated' | 'uploaded';
  name: string;
  created_at: string;
  file_url?: string;
  status: string;
  job_id?: string;
}

interface ApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: JobOpportunity | null;
  onApplicationStarted?: (applicationId: string) => void;
}

export const ApplicationModal = ({ 
  open, 
  onOpenChange, 
  job, 
  onApplicationStarted 
}: ApplicationModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'cv-selection' | 'settings' | 'confirmation'>('cv-selection');
  const [selectedCV, setSelectedCV] = useState<CVOption | null>(null);
  const [cvOptions, setCvOptions] = useState<CVOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  
  // Application settings
  const [autoSubmit, setAutoSubmit] = useState(false);
  const [coverLetterPrompt, setCoverLetterPrompt] = useState('');
  const [useCustomCoverLetter, setUseCustomCoverLetter] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadCVOptions();
    }
  }, [open, user]);

  const loadCVOptions = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const cvs = await CVSelectionService.listUserCVs(user.id);
      setCvOptions(cvs);
      
      // Auto-select the most recent CV if available
      if (cvs.length > 0) {
        setSelectedCV(cvs[0]);
      }
    } catch (error) {
      console.error('Failed to load CV options:', error);
      toast.error("Failed to load your CVs");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 'cv-selection' && selectedCV) {
      setStep('settings');
    } else if (step === 'settings') {
      setStep('confirmation');
    }
  };

  const handleBack = () => {
    if (step === 'settings') {
      setStep('cv-selection');
    } else if (step === 'confirmation') {
      setStep('settings');
    }
  };

  const handleStartApplication = async () => {
    if (!job || !selectedCV || !user) {
      toast.error("Missing required information");
      return;
    }

    try {
      setApplying(true);
      
      const applicationRequest = {
        user_id: user.id,
        job_id: job.id,
        cv_choice: selectedCV.type,
        cv_id: selectedCV.type === 'generated' ? selectedCV.id : undefined,
        uploaded_cv_path: selectedCV.type === 'uploaded' ? selectedCV.id : undefined,
        cover_letter_prompt: useCustomCoverLetter ? coverLetterPrompt : undefined,
        auto_submit: autoSubmit
      };

      const result = await ApplicationService.startApplication(applicationRequest);
      
      if (result.success) {
        toast.success("🤖 Application process started!", {
          description: `AI agent is now applying to ${job.company}. You can track progress in real-time.`
        });
        
        onApplicationStarted?.(result.application_id);
        onOpenChange(false);
        
        // Reset modal state
        setStep('cv-selection');
        setSelectedCV(null);
        setCoverLetterPrompt('');
        setAutoSubmit(false);
        setUseCustomCoverLetter(false);
      } else {
        toast.error("Failed to start application", {
          description: result.error || "Unknown error occurred"
        });
      }
      
    } catch (error) {
      console.error('Application start failed:', error);
      toast.error("Failed to start application");
    } finally {
      setApplying(false);
    }
  };

  const handleViewCV = (cv: CVOption) => {
    if (cv.file_url) {
      window.open(cv.file_url, '_blank');
    } else {
      toast.error("CV file not available");
    }
  };

  const renderCVSelection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Select CV for Application</h3>
        <p className="text-gray-400 text-sm">
          Choose which CV to use for applying to {job?.company}
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-gray-800 border-gray-700 animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : cvOptions.length === 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6 text-center">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No CVs Available</h3>
            <p className="text-gray-500 mb-4">You need to generate or upload a CV first</p>
            <Button variant="outline" className="text-white border-gray-600">
              <Upload className="w-4 h-4 mr-2" />
              Upload CV
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cvOptions.map((cv) => (
            <Card 
              key={cv.id}
              className={`border cursor-pointer transition-all hover:bg-gray-800 ${
                selectedCV?.id === cv.id 
                  ? 'bg-gray-800 border-blue-500' 
                  : 'bg-gray-900 border-gray-700'
              }`}
              onClick={() => setSelectedCV(cv)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-gray-700">
                        {cv.type === 'generated' ? (
                          <Bot className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Upload className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-white">{cv.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Badge 
                            variant="secondary" 
                            className={cv.type === 'generated' ? 'bg-blue-500' : 'bg-green-500'}
                          >
                            {cv.type === 'generated' ? 'AI Generated' : 'Uploaded'}
                          </Badge>
                          <span>•</span>
                          <span>{new Date(cv.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    {cv.type === 'generated' && cv.job_id && (
                      <div className="text-xs text-gray-500 ml-11">
                        Originally generated for job application
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {cv.file_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewCV(cv);
                        }}
                        className="text-gray-400 hover:text-white"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    {selectedCV?.id === cv.id && (
                      <CheckCircle className="w-5 h-5 text-blue-400" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Application Settings</h3>
        <p className="text-gray-400 text-sm">
          Configure how the AI agent should handle your application
        </p>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Automation Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Auto-submit application</Label>
              <p className="text-sm text-gray-400">
                Automatically submit after filling the form (recommended for simple forms)
              </p>
            </div>
            <Switch
              checked={autoSubmit}
              onCheckedChange={setAutoSubmit}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Custom cover letter</Label>
              <p className="text-sm text-gray-400">
                Generate a custom cover letter for this application
              </p>
            </div>
            <Switch
              checked={useCustomCoverLetter}
              onCheckedChange={setUseCustomCoverLetter}
            />
          </div>
        </CardContent>
      </Card>

      {useCustomCoverLetter && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Cover Letter Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Tell the AI what to emphasize in your cover letter (e.g., 'Focus on my Python and React experience, mention my interest in fintech')"
              value={coverLetterPrompt}
              onChange={(e) => setCoverLetterPrompt(e.target.value)}
              className="bg-gray-900 border-gray-600 text-white placeholder-gray-400"
              rows={4}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderConfirmation = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Confirm Application</h3>
        <p className="text-gray-400 text-sm">
          Review your settings before starting the automated application process
        </p>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Application Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-400">Position:</span>
            <span className="text-white font-medium">{job?.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Company:</span>
            <span className="text-white font-medium">{job?.company}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">CV:</span>
            <span className="text-white font-medium">{selectedCV?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Auto-submit:</span>
            <Badge variant={autoSubmit ? "default" : "secondary"}>
              {autoSubmit ? "Yes" : "Review Required"}
            </Badge>
          </div>
          {useCustomCoverLetter && (
            <div className="flex justify-between">
              <span className="text-gray-400">Cover Letter:</span>
              <Badge variant="default">Custom Generated</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-blue-900/20 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Bot className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-300 mb-1">AI Agent Process</h4>
              <p className="text-sm text-blue-200">
                The AI will analyze the application form, fill it with your CV data, 
                {autoSubmit 
                  ? " and automatically submit the application." 
                  : " and wait for your review before submission."
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-400" />
            AI-Powered Application to {job.company}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center justify-center space-x-4">
            {['cv-selection', 'settings', 'confirmation'].map((stepName, index) => (
              <div key={stepName} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === stepName 
                    ? 'bg-blue-600 text-white'
                    : index < ['cv-selection', 'settings', 'confirmation'].indexOf(step)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  {index < ['cv-selection', 'settings', 'confirmation'].indexOf(step) ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < 2 && (
                  <div className={`w-12 h-0.5 ${
                    index < ['cv-selection', 'settings', 'confirmation'].indexOf(step)
                      ? 'bg-green-600'
                      : 'bg-gray-700'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step content */}
          {step === 'cv-selection' && renderCVSelection()}
          {step === 'settings' && renderSettings()}
          {step === 'confirmation' && renderConfirmation()}

          {/* Action buttons */}
          <div className="flex justify-between pt-4 border-t border-gray-700">
            <Button
              variant="outline"
              onClick={step === 'cv-selection' ? () => onOpenChange(false) : handleBack}
              className="text-white border-gray-600"
            >
              {step === 'cv-selection' ? 'Cancel' : 'Back'}
            </Button>
            
            {step === 'confirmation' ? (
              <Button
                onClick={handleStartApplication}
                disabled={applying}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {applying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting AI Agent...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Application
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={step === 'cv-selection' && !selectedCV}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};