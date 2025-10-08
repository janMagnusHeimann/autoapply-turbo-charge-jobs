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
import { apiConfig } from "@/config/apiConfig";
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
  const [uploading, setUploading] = useState(false);
  const [generatingCV, setGeneratingCV] = useState(false);
  
  // Application settings
  const [autoSubmit, setAutoSubmit] = useState(false);
  const [coverLetterPrompt, setCoverLetterPrompt] = useState('');
  const [useCustomCoverLetter, setUseCustomCoverLetter] = useState(false);

  useEffect(() => {
    if (open && user && job) {
      loadCVOptions();
    }
  }, [open, user, job]);

  const loadCVOptions = async () => {
    if (!user || !job) {
      console.log('ApplicationModal: No user or job found, skipping CV load');
      return;
    }
    
    try {
      console.log('ApplicationModal: Loading CVs for user:', user.id, 'job:', job.id);
      setLoading(true);
      
      // Get all user CVs
      const allCvs = await CVSelectionService.listUserCVs(user.id);
      console.log('ApplicationModal: Received all CVs from service:', allCvs.length);
      
      // Filter CVs for this specific job
      const jobSpecificCvs = allCvs.filter(cv => cv.job_id === job.id);
      console.log('ApplicationModal: Found job-specific CVs:', jobSpecificCvs.length);
      
      // Log all CVs for debugging
      console.log('ApplicationModal: All CVs:', allCvs.map(cv => ({ id: cv.id, name: cv.name, job_id: cv.job_id })));
      console.log('ApplicationModal: Target job ID:', job.id);
      
      setCvOptions(jobSpecificCvs);
      
      // Auto-select the most recent job-specific CV if available
      if (jobSpecificCvs.length > 0) {
        const mostRecentCV = jobSpecificCvs.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        console.log('ApplicationModal: Auto-selecting most recent job-specific CV:', mostRecentCV);
        setSelectedCV(mostRecentCV);
      } else {
        console.log('ApplicationModal: No job-specific CVs found');
        setSelectedCV(null);
      }
    } catch (error) {
      console.error('ApplicationModal: Failed to load CV options:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load your CVs";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 'cv-selection') {
      if (!selectedCV) {
        toast.error("Please select or generate a CV before continuing");
        return;
      }
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

  const handleViewCV = async (cv: CVOption) => {
    if (!cv.file_url) {
      toast.error("CV file not available");
      return;
    }

    if (cv.file_url.startsWith('blob:')) {
      // For blob URLs, we need to regenerate the CV to get a viewable version
      toast.info("Regenerating CV for viewing...", {
        description: "The CV file needs to be regenerated to view it."
      });
      
      if (cv.type === 'generated' && job && user) {
        try {
          // Regenerate the CV using the CV API
          const generateRequest = {
            user_id: user.id,
            job_id: job.id,
            job_title: job.title,
            job_description: job.description,
            company_name: job.company,
            template_id: 'premium'
          };

          const response = await fetch(`${apiConfig.getConfig().applicationAgent.baseUrl}/api/apply/cv/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(generateRequest),
          });

          const result = await response.json();

          if (response.ok && result.status === 'success') {
            // The frontend CV generation service will handle PDF generation and viewing
            toast.success("CV regenerated! Opening in new tab...");
            
            // Reload CV options to get the updated CV
            await loadCVOptions();
            
            // For now, show a message that the CV has been regenerated
            toast.info("CV has been regenerated. The updated CV is now available for viewing.");
          } else {
            toast.error("Failed to regenerate CV for viewing");
          }
        } catch (error) {
          console.error('CV regeneration failed:', error);
          toast.error("Failed to regenerate CV for viewing");
        }
      } else {
        toast.error("Cannot regenerate this CV. Please upload a new version.");
      }
    } else {
      // For non-blob URLs, try to open directly
      try {
        window.open(cv.file_url, '_blank');
      } catch (error) {
        toast.error("Failed to open CV file");
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    const validation = CVSelectionService.validateCVFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      setUploading(true);
      const result = await CVSelectionService.uploadCV(user.id, file);
      
      if (result.success) {
        toast.success("CV uploaded successfully!");
        // Reload CV options to include the new upload
        await loadCVOptions();
      } else {
        toast.error(result.error || "Failed to upload CV");
      }
    } catch (error) {
      console.error('CV upload failed:', error);
      toast.error("Failed to upload CV");
    } finally {
      setUploading(false);
    }
  };

  const triggerFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx';
    input.onchange = handleFileUpload;
    input.click();
  };

  const handleGenerateJobCV = async () => {
    if (!user || !job) {
      toast.error("Missing user or job information");
      return;
    }

    try {
      setGeneratingCV(true);
      
      const generateRequest = {
        user_id: user.id,
        job_id: job.id,
        job_title: job.title,
        job_description: job.description,
        company_name: job.company,
        template_id: 'premium'
      };

      const response = await fetch(`${apiConfig.getConfig().applicationAgent.baseUrl}/api/apply/cv/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generateRequest),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        toast.success("🎯 Job-specific CV generated successfully!", {
          description: `CV optimized for ${job.company} position`
        });
        
        // Reload CV options to include the new CV
        await loadCVOptions();
        
        // Auto-advance to next step if we now have a CV
        if (step === 'cv-selection') {
          // Small delay to ensure state is updated
          setTimeout(() => {
            setStep('settings');
          }, 100);
        }
      } else {
        toast.error(result.message || "Failed to generate CV", {
          description: result.error || "Please try again"
        });
      }
      
    } catch (error) {
      console.error('CV generation failed:', error);
      toast.error("Failed to generate CV", {
        description: "Please check your connection and try again"
      });
    } finally {
      setGeneratingCV(false);
    }
  };

  const renderCVSelection = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Job-Specific CV for {job?.company}</h3>
        <p className="text-gray-400 text-sm">
          {job?.title} • {job?.location}
        </p>
        <p className="text-blue-400 text-xs mt-1">
          Only showing CVs generated specifically for this position
        </p>
      </div>

      {loading ? (
        <Card className="bg-gray-800 border-gray-700 animate-pulse">
          <CardContent className="p-4">
            <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-1/2"></div>
          </CardContent>
        </Card>
      ) : cvOptions.length === 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4 text-center">
            <Sparkles className="w-8 h-8 text-blue-400 mx-auto mb-3" />
            <h3 className="font-medium text-white mb-2">No Job-Specific CV Found</h3>
            <p className="text-gray-400 text-sm mb-4">
              Generate an AI-optimized CV tailored specifically for this {job?.company} position. 
              This CV will be customized based on the job requirements and your profile.
            </p>
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={handleGenerateJobCV}
                disabled={generatingCV}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {generatingCV ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4 mr-2" />
                    Generate CV
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                className="text-white border-gray-600"
                onClick={triggerFileUpload}
                disabled={uploading || generatingCV}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload CV
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Job-specific CV */}
          {cvOptions.map((cv) => (
            <Card 
              key={cv.id}
              className={`border transition-all ${
                selectedCV?.id === cv.id 
                  ? 'bg-blue-900/20 border-blue-500' 
                  : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-600">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">
                        CV for {job?.company}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Badge variant="secondary" className="bg-blue-500">
                          AI Optimized
                        </Badge>
                        <span>•</span>
                        <span>{new Date(cv.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
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
                    <CheckCircle className="w-5 h-5 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Option to generate a new CV */}
          <Card className="border-dashed border-2 border-gray-600 bg-gray-800/50 hover:bg-gray-800 transition-all cursor-pointer"
                onClick={handleGenerateJobCV}>
            <CardContent className="p-3">
              <div className="flex items-center justify-center gap-2 text-sm">
                {generatingCV ? (
                  <>
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    <span className="text-blue-400">Generating new CV...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Generate another CV</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
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
        <h3 className="text-lg font-semibold text-white mb-2">Review & Approve Application</h3>
        <p className="text-gray-400 text-sm">
          Please review all details carefully before approving the automated application process
        </p>
      </div>

      {/* Application Details Summary */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Application Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-400 text-sm">Position</span>
              <p className="text-white font-medium">{job?.title}</p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Company</span>
              <p className="text-white font-medium">{job?.company}</p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Location</span>
              <p className="text-white font-medium">{job?.location}</p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Application URL</span>
              <p className="text-blue-400 text-sm truncate">{job?.applicationUrl}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CV and Documents */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Selected CV & Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-600">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-white">{selectedCV?.name}</h4>
                <p className="text-sm text-gray-400">Job-specific CV for {job?.company}</p>
              </div>
            </div>
            {selectedCV?.file_url && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => selectedCV && handleViewCV(selectedCV)}
                className="text-blue-400 hover:text-blue-300"
              >
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </Button>
            )}
          </div>
          
          {useCustomCoverLetter && (
            <div className="p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-white font-medium">Custom Cover Letter</span>
              </div>
              <p className="text-sm text-gray-400">
                {coverLetterPrompt || "AI will generate a tailored cover letter"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Automation Settings */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Automation Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Auto-submit after filling</span>
            <Badge variant={autoSubmit ? "default" : "secondary"} className="bg-blue-600">
              {autoSubmit ? "Yes - Automatic" : "No - Manual Review"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Cover letter generation</span>
            <Badge variant={useCustomCoverLetter ? "default" : "secondary"} className="bg-green-600">
              {useCustomCoverLetter ? "Custom AI Generated" : "Standard Template"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Process Overview */}
      <Card className="bg-blue-900/20 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Bot className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-300 mb-2">AI Application Process</h4>
              <div className="space-y-2 text-sm text-blue-200">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                  <span>Analyze application form structure and requirements</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                  <span>Fill form fields using your CV data and profile information</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                  <span>Upload CV and cover letter documents if required</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                  <span>
                    {autoSubmit 
                      ? "Automatically submit the completed application" 
                      : "Present filled form for your final review and manual submission"
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning for manual review */}
      {!autoSubmit && (
        <Card className="bg-yellow-900/20 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-300 mb-1">Manual Review Required</h4>
                <p className="text-sm text-yellow-200">
                  You've chosen manual review. The AI will fill the application form but pause before submission, 
                  allowing you to review and approve each field before the final submission.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] bg-gray-900 border-gray-700 text-white overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-400" />
            AI-Powered Application to {job.company}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Progress indicator */}
          <div className="flex items-center justify-center space-x-4">
            {[
              { step: 'cv-selection', label: 'CV Selection', icon: FileText },
              { step: 'settings', label: 'Settings', icon: Settings },
              { step: 'confirmation', label: 'Review', icon: CheckCircle }
            ].map((stepInfo, index) => {
              const isActive = step === stepInfo.step;
              const isCompleted = index < ['cv-selection', 'settings', 'confirmation'].indexOf(step);
              const canProgress = index === 0 || (index === 1 && selectedCV) || (index === 2 && selectedCV);
              
              return (
                <div key={stepInfo.step} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : isCompleted
                        ? 'bg-green-600 text-white'
                        : canProgress
                        ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        : 'bg-gray-700 text-gray-500'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <stepInfo.icon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={`text-xs mt-1 ${
                      isActive ? 'text-blue-400' : isCompleted ? 'text-green-400' : 'text-gray-500'
                    }`}>
                      {stepInfo.label}
                    </span>
                  </div>
                  {index < 2 && (
                    <div className={`w-16 h-0.5 mx-2 transition-colors ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-700'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step content */}
          {step === 'cv-selection' && renderCVSelection()}
          {step === 'settings' && renderSettings()}
          {step === 'confirmation' && renderConfirmation()}

        </div>
        
        {/* Action buttons */}
        <div className="flex-shrink-0 flex justify-between pt-4 border-t border-gray-700 bg-gray-900">
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
                className="bg-green-600 hover:bg-green-700 text-white px-6"
              >
                {applying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting AI Agent...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve & Start Application
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
      </DialogContent>
    </Dialog>
  );
};