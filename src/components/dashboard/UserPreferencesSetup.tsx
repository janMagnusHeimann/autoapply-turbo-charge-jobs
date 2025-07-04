import { useState, useEffect } from "react";
import { 
  User, 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Code, 
  Building2, 
  Clock,
  Loader2,
  Check,
  GitBranch,
  FileText,
  Sparkles,
  GraduationCap,
  Award,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { UserProfile, UserPreferences, ComprehensiveUserProfile, CVAsset } from "@/services/userService";
import { UserService } from "@/services/userService";
import { githubRepoService, type GitHubRepo } from "@/services/githubRepoService";
import { GitHubService } from "@/services/githubService";
import { cvAnalysisService, type CVAnalysis } from "@/services/cvAnalysisService";

interface UserPreferencesSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  onComplete: (preferences: UserPreferences) => void;
}

interface CVAnalysis {
  summary: string;
  keySkills: string[];
  experienceLevel: string;
  industries: string[];
  suggestedJobTypes: string[];
  suggestedSalaryRange: {
    min: number;
    max: number;
    currency: string;
  };
}


export const UserPreferencesSetup = ({ 
  open, 
  onOpenChange, 
  companyName, 
  onComplete 
}: UserPreferencesSetupProps) => {
  const { user, userProfile, userPreferences } = useAuth();
  
  // Comprehensive profile data
  const [comprehensiveProfile, setComprehensiveProfile] = useState<ComprehensiveUserProfile | null>(null);
  const [loadingComprehensiveProfile, setLoadingComprehensiveProfile] = useState(false);
  
  // Analysis states
  const [analyzingCV, setAnalyzingCV] = useState(false);
  const [cvAnalysis, setCvAnalysis] = useState<CVAnalysis | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  
  // Form states
  const [preferences, setPreferences] = useState<Partial<UserPreferences>>({});
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  
  // Company-specific selection states
  const [companyRepoSelections, setCompanyRepoSelections] = useState<{[key: string]: {selected: boolean, description: string}}>({});
  const [companyPubSelections, setCompanyPubSelections] = useState<{[key: string]: {selected: boolean, description: string}}>({});
  const [expandedRepos, setExpandedRepos] = useState(false);
  const [expandedPubs, setExpandedPubs] = useState(false);
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  useEffect(() => {
    if (open && user) {
      if (userPreferences) {
        setPreferences(userPreferences);
        setSelectedSkills(userPreferences.skills || []);
      }
      
      // Load comprehensive profile data
      loadComprehensiveProfile();
      
      // Load company-specific selections
      loadCompanySpecificSelections();
      
      // Auto-analyze CV and load repos (keep for legacy compatibility)
      handleAnalyzeCV();
      loadGitHubRepos();
    }
  }, [open, user, userPreferences]);

  const loadComprehensiveProfile = async () => {
    if (!user) return;
    
    setLoadingComprehensiveProfile(true);
    try {
      const comprehensive = await UserService.getComprehensiveUserProfile(user.id);
      setComprehensiveProfile(comprehensive);
      
      if (comprehensive) {
        console.log('Loaded comprehensive profile:', comprehensive);
        
        // Initialize company-specific selections based on existing data (only if not already loaded)
        setCompanyRepoSelections(prev => {
          // If we already have company-specific selections, don't override them
          if (Object.keys(prev).length > 0) {
            return prev;
          }
          
          // Otherwise, initialize with defaults
          const repoSelections: {[key: string]: {selected: boolean, description: string}} = {};
          comprehensive.repositories.forEach(repo => {
            repoSelections[repo.id] = {
              selected: true, // Default to selected since they're in the comprehensive profile
              description: repo.description || ''
            };
          });
          return repoSelections;
        });
        
        setCompanyPubSelections(prev => {
          // If we already have company-specific selections, don't override them
          if (Object.keys(prev).length > 0) {
            return prev;
          }
          
          // Otherwise, initialize with defaults
          const pubSelections: {[key: string]: {selected: boolean, description: string}} = {};
          comprehensive.publications.forEach(pub => {
            pubSelections[pub.id] = {
              selected: true, // Default to selected since they're in the comprehensive profile
              description: pub.description || ''
            };
          });
          return pubSelections;
        });
      }
    } catch (error) {
      console.error('Error loading comprehensive profile:', error);
    } finally {
      setLoadingComprehensiveProfile(false);
    }
  };

  const handleAnalyzeCV = async () => {
    if (!userProfile?.professional_summary) return;
    
    setAnalyzingCV(true);
    try {
      const analysisRequest = {
        professionalSummary: userProfile.professional_summary,
        currentTitle: userProfile.current_title || '',
        skills: selectedSkills,
        githubRepos: githubRepos,
        linkedinUrl: userProfile.linkedin_url || undefined,
        experience: userProfile.professional_summary
      };
      
      const analysis = await cvAnalysisService.analyzeCV(analysisRequest);
      setCvAnalysis(analysis);
      
      // Pre-populate form with analysis
      setSelectedSkills(prev => {
        const combined = [...new Set([...prev, ...analysis.keySkills])];
        return combined;
      });
      
      setPreferences(prev => ({
        ...prev,
        preferred_industries: analysis.industries,
        job_types: analysis.suggestedJobTypes,
        min_salary: analysis.suggestedSalaryRange.min,
        max_salary: analysis.suggestedSalaryRange.max,
        currency: analysis.suggestedSalaryRange.currency
      }));
      
    } catch (error) {
      console.error('Error analyzing CV:', error);
      toast.error('Failed to analyze CV');
    } finally {
      setAnalyzingCV(false);
    }
  };

  const loadGitHubRepos = async () => {
    if (!user) return;
    
    setLoadingRepos(true);
    try {
      // Check if GitHub is connected using the real service
      const isConnected = await GitHubService.isGitHubConnected(user.id);
      if (!isConnected) {
        console.log('GitHub not connected, skipping repo loading');
        return;
      }

      // Get GitHub token and load real repos
      const token = await GitHubService.getGitHubToken(user.id);
      if (!token) {
        console.log('No GitHub token found, skipping repo loading');
        return;
      }

      const repos = await GitHubService.getUserRepositories(token);
      
      // Convert GitHubRepository to GitHubRepo format for compatibility
      const convertedRepos = repos.map(repo => ({
        id: repo.id,
        name: repo.name,
        description: repo.description,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        updated_at: repo.updated_at,
        html_url: repo.html_url,
        topics: repo.topics,
        size: 0, // Not available in GitHubRepository interface
        forks_count: repo.forks_count,
        open_issues_count: 0, // Not available in GitHubRepository interface
        default_branch: 'main', // Default assumption
        visibility: repo.private ? 'private' : 'public'
      }));
      
      setGithubRepos(convertedRepos);
      
      // Extract additional skills from repos using the mock service's skill extraction
      const repoSkills = githubRepoService.extractSkillsFromRepos(convertedRepos);
      setSelectedSkills(prev => {
        const combined = [...new Set([...prev, ...repoSkills])];
        return combined;
      });
      
    } catch (error) {
      console.error('Error loading GitHub repos:', error);
      // Don't show error toast for GitHub issues - it's optional
      console.log('GitHub integration failed, continuing without GitHub data');
    } finally {
      setLoadingRepos(false);
    }
  };

  const addCustomSkill = () => {
    if (customSkill.trim() && !selectedSkills.includes(customSkill.trim())) {
      setSelectedSkills(prev => [...prev, customSkill.trim()]);
      setCustomSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills(prev => prev.filter(s => s !== skill));
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    try {
      const finalPreferences: UserPreferences = {
        ...userPreferences!,
        ...preferences,
        skills: selectedSkills
      };
      
      // Save company-specific selections to localStorage/database
      await saveCompanySpecificSelections();
      
      onComplete(finalPreferences);
      onOpenChange(false);
      toast.success('Preferences updated successfully!');
    } catch (error) {
      console.error('Error saving company-specific preferences:', error);
      toast.error('Failed to save some preferences');
    }
  };

  const saveCompanySpecificSelections = async () => {
    if (!user) return;
    
    const companySpecificData = {
      companyName,
      repositorySelections: companyRepoSelections,
      publicationSelections: companyPubSelections,
      updatedAt: new Date().toISOString()
    };
    
    try {
      // Save to localStorage (works in both dev and prod)
      const existingData = localStorage.getItem('company_specific_selections') || '{}';
      const allCompanyData = JSON.parse(existingData);
      allCompanyData[companyName] = companySpecificData;
      localStorage.setItem('company_specific_selections', JSON.stringify(allCompanyData));
      
      console.log(`💾 Saved company-specific selections for ${companyName}:`, {
        repositories: Object.keys(companyRepoSelections).filter(id => companyRepoSelections[id]?.selected).length,
        publications: Object.keys(companyPubSelections).filter(id => companyPubSelections[id]?.selected).length
      });
      
      // TODO: In production, also save to Supabase user_preferences table
      // This could be stored in a JSONB column like company_specific_selections
      
    } catch (error) {
      console.error('Error saving company-specific selections:', error);
      throw error;
    }
  };

  const loadCompanySpecificSelections = async () => {
    if (!user) return;
    
    try {
      const existingData = localStorage.getItem('company_specific_selections') || '{}';
      const allCompanyData = JSON.parse(existingData);
      const companyData = allCompanyData[companyName];
      
      if (companyData) {
        console.log(`📥 Loading company-specific selections for ${companyName}:`, companyData);
        
        // Restore repository selections
        if (companyData.repositorySelections) {
          setCompanyRepoSelections(companyData.repositorySelections);
        }
        
        // Restore publication selections
        if (companyData.publicationSelections) {
          setCompanyPubSelections(companyData.publicationSelections);
        }
        
        console.log(`✅ Loaded company-specific selections for ${companyName}`);
      } else {
        console.log(`📋 No existing company-specific selections found for ${companyName}`);
      }
      
    } catch (error) {
      console.error('Error loading company-specific selections:', error);
    }
  };

  const stepTitles = [
    "Profile Overview",
    "Skills & Experience", 
    "Job Preferences",
    "Review & Confirm"
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-blue-500" />
              <h3 className="text-lg font-semibold text-white mb-2">Complete Profile Overview</h3>
              <p className="text-gray-400 mb-6">
                Review your complete professional profile including experience, education, repositories, and publications for {companyName}
              </p>
            </div>

            {/* CV Analysis */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  CV Analysis
                  {analyzingCV ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : cvAnalysis ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cvAnalysis ? (
                  <div className="space-y-3">
                    <p className="text-gray-300 text-sm">{cvAnalysis.summary}</p>
                    <div className="flex flex-wrap gap-2">
                      {cvAnalysis.keySkills.slice(0, 5).map(skill => (
                        <Badge key={skill} variant="secondary" className="text-xs bg-gray-700 text-gray-300 border-gray-600">
                          {skill}
                        </Badge>
                      ))}
                      {cvAnalysis.keySkills.length > 5 && (
                        <Badge variant="outline" className="text-xs text-white border-gray-600">
                          +{cvAnalysis.keySkills.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">
                    {analyzingCV ? 'Analyzing your professional profile...' : 'Click to analyze your CV'}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Professional Experience */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Professional Experience
                  {loadingComprehensiveProfile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : comprehensiveProfile?.experiences.length ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {comprehensiveProfile?.experiences && comprehensiveProfile.experiences.length > 0 ? (
                  <div className="space-y-2">
                    {comprehensiveProfile.experiences.slice(0, 3).map(exp => (
                      <div key={exp.id} className="p-2 bg-gray-900/50 rounded border border-gray-700">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-white text-sm font-medium">{exp.title}</h4>
                            <p className="text-gray-400 text-xs">{exp.metadata?.company || 'Company not specified'}</p>
                            <p className="text-gray-500 text-xs mt-1">{exp.description}</p>
                          </div>
                          <Badge variant="outline" className="text-xs ml-2 text-white border-gray-600">
                            Experience
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {comprehensiveProfile.experiences.length > 3 && (
                      <p className="text-gray-400 text-xs text-center">
                        +{comprehensiveProfile.experiences.length - 3} more experiences
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">
                    {loadingComprehensiveProfile ? 'Loading your experience...' : 'No professional experience added yet'}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Education */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Education
                  {loadingComprehensiveProfile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : comprehensiveProfile?.education.length ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {comprehensiveProfile?.education && comprehensiveProfile.education.length > 0 ? (
                  <div className="space-y-2">
                    {comprehensiveProfile.education.slice(0, 2).map(edu => (
                      <div key={edu.id} className="p-2 bg-gray-900/50 rounded border border-gray-700">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-white text-sm font-medium">{edu.title}</h4>
                            <p className="text-gray-400 text-xs">{edu.metadata?.institution || 'Institution not specified'}</p>
                            <p className="text-gray-500 text-xs mt-1">{edu.description}</p>
                          </div>
                          <Badge variant="outline" className="text-xs ml-2 text-white border-gray-600">
                            Education
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {comprehensiveProfile.education.length > 2 && (
                      <p className="text-gray-400 text-xs text-center">
                        +{comprehensiveProfile.education.length - 2} more education entries
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">
                    {loadingComprehensiveProfile ? 'Loading your education...' : 'No education entries added yet'}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* GitHub Repositories */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-5 h-5" />
                    GitHub Repositories for {companyName}
                    {loadingComprehensiveProfile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : comprehensiveProfile?.repositories.length ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : null}
                  </div>
                  {comprehensiveProfile?.repositories && comprehensiveProfile.repositories.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedRepos(!expandedRepos)}
                      className="text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Customize
                      {expandedRepos ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {comprehensiveProfile?.repositories && comprehensiveProfile.repositories.length > 0 ? (
                  <div className="space-y-4">
                    {!expandedRepos ? (
                      // Summary view
                      <div className="space-y-2">
                        {comprehensiveProfile.repositories
                          .filter(repo => companyRepoSelections[repo.id]?.selected !== false)
                          .slice(0, 3)
                          .map(repo => (
                          <div key={repo.id} className="p-2 bg-gray-900/50 rounded border border-gray-700">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="text-white text-sm font-medium">{repo.title}</h4>
                                {repo.metadata?.language && (
                                  <Badge variant="outline" className="text-xs mr-2 mb-1 text-white border-gray-600">
                                    {repo.metadata.language}
                                  </Badge>
                                )}
                                <p className="text-gray-400 text-xs">
                                  {companyRepoSelections[repo.id]?.description || repo.description}
                                </p>
                              </div>
                              {repo.metadata?.stargazers_count && (
                                <div className="text-yellow-400 text-xs">★ {repo.metadata.stargazers_count}</div>
                              )}
                            </div>
                          </div>
                        ))}
                        {comprehensiveProfile.repositories.filter(repo => companyRepoSelections[repo.id]?.selected !== false).length > 3 && (
                          <p className="text-gray-400 text-xs text-center">
                            +{comprehensiveProfile.repositories.filter(repo => companyRepoSelections[repo.id]?.selected !== false).length - 3} more repositories selected
                          </p>
                        )}
                      </div>
                    ) : (
                      // Detailed editing view
                      <div className="space-y-4">
                        <p className="text-gray-400 text-sm">
                          Select which repositories to highlight for {companyName} and customize their descriptions:
                        </p>
                        {comprehensiveProfile.repositories.map(repo => (
                          <div key={repo.id} className="p-3 bg-gray-900/50 rounded border border-gray-700">
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={companyRepoSelections[repo.id]?.selected !== false}
                                  onCheckedChange={(checked) => {
                                    setCompanyRepoSelections(prev => ({
                                      ...prev,
                                      [repo.id]: {
                                        selected: checked as boolean,
                                        description: prev[repo.id]?.description || repo.description || ''
                                      }
                                    }));
                                  }}
                                  className="mt-1 border-gray-600 bg-gray-800 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="text-white text-sm font-medium">{repo.title}</h4>
                                    {repo.metadata?.language && (
                                      <Badge variant="outline" className="text-xs text-white border-gray-600">
                                        {repo.metadata.language}
                                      </Badge>
                                    )}
                                    {repo.metadata?.stargazers_count && (
                                      <div className="text-yellow-400 text-xs">★ {repo.metadata.stargazers_count}</div>
                                    )}
                                  </div>
                                  {companyRepoSelections[repo.id]?.selected !== false && (
                                    <div className="space-y-2">
                                      <Label className="text-gray-300 text-xs">
                                        Description for {companyName} application:
                                      </Label>
                                      <Textarea
                                        value={companyRepoSelections[repo.id]?.description || ''}
                                        onChange={(e) => {
                                          setCompanyRepoSelections(prev => ({
                                            ...prev,
                                            [repo.id]: {
                                              selected: prev[repo.id]?.selected !== false,
                                              description: e.target.value
                                            }
                                          }));
                                        }}
                                        className="text-xs bg-gray-800 border-gray-700 text-white min-h-[60px]"
                                        placeholder={`Explain how this repository relates to ${companyName} or demonstrates relevant skills...`}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">
                    {loadingComprehensiveProfile ? 'Loading your repositories...' : 'No GitHub repositories selected yet'}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Publications */}
            {comprehensiveProfile?.publications && comprehensiveProfile.publications.length > 0 && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Publications for {companyName}
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedPubs(!expandedPubs)}
                      className="text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Customize
                      {expandedPubs ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {!expandedPubs ? (
                      // Summary view
                      <div className="space-y-2">
                        {comprehensiveProfile.publications
                          .filter(pub => companyPubSelections[pub.id]?.selected !== false)
                          .slice(0, 2)
                          .map(pub => (
                          <div key={pub.id} className="p-2 bg-gray-900/50 rounded border border-gray-700">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="text-white text-sm font-medium">{pub.title}</h4>
                                <p className="text-gray-400 text-xs">
                                  {companyPubSelections[pub.id]?.description || pub.description}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs ml-2 text-white border-gray-600">
                                Publication
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {comprehensiveProfile.publications.filter(pub => companyPubSelections[pub.id]?.selected !== false).length > 2 && (
                          <p className="text-gray-400 text-xs text-center">
                            +{comprehensiveProfile.publications.filter(pub => companyPubSelections[pub.id]?.selected !== false).length - 2} more publications selected
                          </p>
                        )}
                      </div>
                    ) : (
                      // Detailed editing view
                      <div className="space-y-4">
                        <p className="text-gray-400 text-sm">
                          Select which publications to highlight for {companyName} and customize their descriptions:
                        </p>
                        {comprehensiveProfile.publications.map(pub => (
                          <div key={pub.id} className="p-3 bg-gray-900/50 rounded border border-gray-700">
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={companyPubSelections[pub.id]?.selected !== false}
                                  onCheckedChange={(checked) => {
                                    setCompanyPubSelections(prev => ({
                                      ...prev,
                                      [pub.id]: {
                                        selected: checked as boolean,
                                        description: prev[pub.id]?.description || pub.description || ''
                                      }
                                    }));
                                  }}
                                  className="mt-1 border-gray-600 bg-gray-800 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                />
                                <div className="flex-1">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <h4 className="text-white text-sm font-medium">{pub.title}</h4>
                                      {pub.metadata?.authors && (
                                        <p className="text-gray-400 text-xs">
                                          Authors: {Array.isArray(pub.metadata.authors) ? pub.metadata.authors.join(', ') : pub.metadata.authors}
                                        </p>
                                      )}
                                      {pub.metadata?.publication_venue && (
                                        <p className="text-gray-400 text-xs">
                                          Published in: {pub.metadata.publication_venue} {pub.metadata?.publication_year ? `(${pub.metadata.publication_year})` : ''}
                                        </p>
                                      )}
                                    </div>
                                    <Badge variant="outline" className="text-xs text-white border-gray-600">
                                      {pub.metadata?.publication_type || 'Publication'}
                                    </Badge>
                                  </div>
                                  {companyPubSelections[pub.id]?.selected !== false && (
                                    <div className="space-y-2">
                                      <Label className="text-gray-300 text-xs">
                                        How this research relates to {companyName}:
                                      </Label>
                                      <Textarea
                                        value={companyPubSelections[pub.id]?.description || ''}
                                        onChange={(e) => {
                                          setCompanyPubSelections(prev => ({
                                            ...prev,
                                            [pub.id]: {
                                              selected: prev[pub.id]?.selected !== false,
                                              description: e.target.value
                                            }
                                          }));
                                        }}
                                        className="text-xs bg-gray-800 border-gray-700 text-white min-h-[60px]"
                                        placeholder={`Explain how this research is relevant to ${companyName}'s work or demonstrates applicable expertise...`}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Other Achievements */}
            {comprehensiveProfile?.other && comprehensiveProfile.other.length > 0 && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Other Achievements
                    <Check className="w-4 h-4 text-green-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {comprehensiveProfile.other.slice(0, 2).map(other => (
                      <div key={other.id} className="p-2 bg-gray-900/50 rounded border border-gray-700">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-white text-sm font-medium">{other.title}</h4>
                            <p className="text-gray-400 text-xs">{other.metadata?.organization || 'Organization not specified'}</p>
                            <p className="text-gray-500 text-xs mt-1">{other.description}</p>
                          </div>
                          <Badge variant="outline" className="text-xs ml-2 text-white border-gray-600">
                            {other.metadata?.category || 'Achievement'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {comprehensiveProfile.other.length > 2 && (
                      <p className="text-gray-400 text-xs text-center">
                        +{comprehensiveProfile.other.length - 2} more achievements
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Code className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold text-white mb-2">Skills & Experience</h3>
              <p className="text-gray-400">Customize your skills based on the AI analysis</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-white mb-2 block">Your Skills</Label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedSkills.map(skill => (
                    <Badge 
                      key={skill} 
                      variant="secondary" 
                      className="cursor-pointer hover:bg-red-600 transition-colors bg-gray-700 text-gray-300 border-gray-600"
                      onClick={() => removeSkill(skill)}
                    >
                      {skill} ×
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    placeholder="Add a skill..."
                    className="bg-gray-800 border-gray-700 text-white"
                    onKeyPress={(e) => e.key === 'Enter' && addCustomSkill()}
                  />
                  <Button 
                    onClick={addCustomSkill} 
                    size="sm" 
                    variant="outline"
                    className="border-gray-600 text-white bg-gray-800 hover:bg-gray-700 hover:text-white"
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-white mb-2 block">Current Title</Label>
                <Input
                  value={preferences.current_title || userProfile?.current_title || ""}
                  onChange={(e) => setPreferences(prev => ({ ...prev, current_title: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="e.g. Senior Software Engineer"
                />
              </div>

              <div>
                <Label className="text-white mb-2 block">Professional Summary</Label>
                <Textarea
                  value={preferences.professional_summary || userProfile?.professional_summary || ""}
                  onChange={(e) => setPreferences(prev => ({ ...prev, professional_summary: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  placeholder="Brief summary of your professional background..."
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Briefcase className="w-12 h-12 mx-auto mb-4 text-purple-500" />
              <h3 className="text-lg font-semibold text-white mb-2">Job Preferences</h3>
              <p className="text-gray-400">Set your preferences for opportunities at {companyName}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white mb-2 block">Preferred Locations</Label>
                <Input
                  value={preferences.preferred_locations?.join(', ') || ""}
                  onChange={(e) => setPreferences(prev => ({ 
                    ...prev, 
                    preferred_locations: e.target.value.split(',').map(l => l.trim()) 
                  }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Berlin, Munich, Remote"
                />
              </div>

              <div>
                <Label className="text-white mb-2 block">Remote Preference</Label>
                <Select 
                  value={preferences.remote_preference || "hybrid"}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, remote_preference: value }))}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Fully Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white mb-2 block">Min Salary ({preferences.currency || 'EUR'})</Label>
                <Input
                  type="number"
                  step="10000"
                  value={preferences.min_salary || ""}
                  onChange={(e) => setPreferences(prev => ({ ...prev, min_salary: Number(e.target.value) }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="70000"
                />
              </div>

              <div>
                <Label className="text-white mb-2 block">Max Salary ({preferences.currency || 'EUR'})</Label>
                <Input
                  type="number"
                  step="10000"
                  value={preferences.max_salary || ""}
                  onChange={(e) => setPreferences(prev => ({ ...prev, max_salary: Number(e.target.value) }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="120000"
                />
              </div>
            </div>

            <div>
              <Label className="text-white mb-2 block">Job Types</Label>
              <div className="flex gap-4">
                {['full-time', 'part-time', 'contract', 'freelance'].map(type => (
                  <div key={type} className="flex items-center space-x-2">
                    <Switch
                      checked={preferences.job_types?.includes(type) || false}
                      onCheckedChange={(checked) => {
                        const currentTypes = preferences.job_types || [];
                        setPreferences(prev => ({
                          ...prev,
                          job_types: checked 
                            ? [...currentTypes, type]
                            : currentTypes.filter(t => t !== type)
                        }));
                      }}
                      className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-600 data-[state=unchecked]:border-gray-500"
                    />
                    <Label className="text-white capitalize cursor-pointer">{type}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold text-white mb-2">Review & Confirm</h3>
              <p className="text-gray-400">Review your preferences for {companyName}</p>
            </div>

            <div className="space-y-4">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm">Skills ({selectedSkills.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {selectedSkills.map(skill => (
                      <Badge key={skill} variant="secondary" className="text-xs bg-gray-700 text-gray-300 border-gray-600">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm">Job Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Locations:</span>
                    <span className="text-white">{preferences.preferred_locations?.join(', ') || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Remote:</span>
                    <span className="text-white capitalize">{preferences.remote_preference || 'hybrid'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Salary:</span>
                    <span className="text-white">
                      {preferences.min_salary && preferences.max_salary 
                        ? `${preferences.min_salary} - ${preferences.max_salary} ${preferences.currency}`
                        : 'Not set'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Job Types:</span>
                    <span className="text-white">{preferences.job_types?.join(', ') || 'Not set'}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">
            Setup Preferences for {companyName}
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-6">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
            <div key={step} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${step <= currentStep 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-400'
                }
              `}>
                {step < currentStep ? <Check className="w-4 h-4" /> : step}
              </div>
              {step < totalSteps && (
                <div className={`
                  w-12 h-0.5 mx-2
                  ${step < currentStep ? 'bg-blue-600' : 'bg-gray-700'}
                `} />
              )}
            </div>
          ))}
        </div>

        <div className="mb-4">
          <h4 className="text-lg font-medium text-white mb-2">
            Step {currentStep}: {stepTitles[currentStep - 1]}
          </h4>
        </div>

        {renderStepContent()}

        {/* Navigation buttons */}
        <div className="flex justify-between pt-6 border-t border-gray-700">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="border-gray-600 text-white bg-gray-800 hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:text-gray-400"
          >
            Previous
          </Button>
          
          {currentStep === totalSteps ? (
            <Button
              onClick={handleComplete}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Start Job Search
            </Button>
          ) : (
            <Button
              onClick={handleNext}
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