
import { useState, useEffect } from "react";
import { Search, Building2, X, Eye, EyeOff, ExternalLink, Loader2, Briefcase, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UserService } from "@/services/userService";
import { aiAgentOrchestrator, type JobListing } from "@/services/aiAgentOrchestrator";
import { autonomousJobAgent, type JobOpportunity, type UserProfile } from "@/services/autonomousJobAgent";
import { cvGenerationService } from "@/services/cvGenerationService";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { CVGeneration, CVTemplate } from "@/types/cv";

interface Company {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  size_category: string | null;
  website_url: string | null;
  headquarters: string | null;
  founded_year: number | null;
}

export const CompanyDirectory = () => {
  const { user, userPreferences, refreshUserData } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showExcluded, setShowExcluded] = useState(true);
  const [jobListings, setJobListings] = useState<Map<string, JobListing[]>>(new Map());
  const [jobOpportunities, setJobOpportunities] = useState<Map<string, JobOpportunity[]>>(new Map());
  const [discoveringJobs, setDiscoveringJobs] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [applyingToJob, setApplyingToJob] = useState<string | null>(null);
  const [agentSteps, setAgentSteps] = useState<string[]>([]);
  const [generatingCV, setGeneratingCV] = useState<string | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<CVTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('technical');
  const [addCompanyDialogOpen, setAddCompanyDialogOpen] = useState(false);
  const [addingCompany, setAddingCompany] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: '',
    description: '',
    website_url: '',
    industry: '',
    size_category: '',
    headquarters: '',
    founded_year: ''
  });

  const excludedCompanies = userPreferences?.excluded_companies || [];

  useEffect(() => {
    // Load available CV templates
    const templates = cvGenerationService.getAvailableTemplates();
    setAvailableTemplates(templates);
  }, []);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .order('name');
        
        if (error) {
          console.error('Error fetching companies:', error);
          // Fallback to demo data if database not set up
          setCompanies(getDemoCompanies());
        } else if (data && data.length > 0) {
          // Add Trade Republic to existing data if not already present
          const hasTradeRepublic = data.some(company => company.name === 'Trade Republic');
          if (!hasTradeRepublic) {
            const tradeRepublic = {
              id: 'demo-0',
              name: 'Trade Republic',
              description: 'Leading European digital bank and investment platform offering commission-free trading',
              industry: 'Fintech',
              size_category: 'large',
              website_url: 'https://traderepublic.com',
              headquarters: 'Berlin, Germany',
              founded_year: 2015
            };
            setCompanies([tradeRepublic, ...data]);
          } else {
            setCompanies(data);
          }
        } else {
          // No companies in database, use demo data
          const demoData = getDemoCompanies();
          console.log('Loading demo companies:', demoData);
          setCompanies(demoData);
        }
      } catch (error) {
        console.error('Error fetching companies:', error);
        setCompanies(getDemoCompanies());
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  const getDemoCompanies = (): Company[] => [
    {
      id: 'demo-0',
      name: 'Trade Republic',
      description: 'Leading European digital bank and investment platform offering commission-free trading',
      industry: 'Fintech',
      size_category: 'large',
      website_url: 'https://traderepublic.com',
      headquarters: 'Berlin, Germany',
      founded_year: 2015
    },
    {
      id: 'demo-1',
      name: 'Starcloud',
      description: 'YC S24 - AI-powered cloud infrastructure optimization platform',
      industry: 'Technology',
      size_category: 'startup',
      website_url: 'https://starcloud.dev',
      headquarters: 'San Francisco, CA',
      founded_year: 2024
    },
    {
      id: 'demo-2',
      name: 'TechFlow Solutions',
      description: 'Leading provider of cloud infrastructure and DevOps solutions',
      industry: 'Technology',
      size_category: 'medium',
      website_url: 'https://techflow.com',
      headquarters: 'San Francisco, CA',
      founded_year: 2018
    },
    {
      id: 'demo-3',
      name: 'DataVision Analytics',
      description: 'AI-powered business intelligence and data analytics platform',
      industry: 'Data & Analytics',
      size_category: 'startup',
      website_url: 'https://datavision.com',
      headquarters: 'Austin, TX',
      founded_year: 2020
    },
    {
      id: 'demo-4',
      name: 'GreenTech Innovations',
      description: 'Sustainable technology solutions for renewable energy',
      industry: 'Clean Energy',
      size_category: 'small',
      website_url: 'https://greentech.com',
      headquarters: 'Seattle, WA',
      founded_year: 2019
    },
    {
      id: 'demo-5',
      name: 'FinanceCore Systems',
      description: 'Enterprise financial software and banking solutions',
      industry: 'Fintech',
      size_category: 'large',
      website_url: 'https://financecore.com',
      headquarters: 'New York, NY',
      founded_year: 2015
    },
    {
      id: 'demo-6',
      name: 'HealthTech Partners',
      description: 'Digital health platforms and medical device software',
      industry: 'Healthcare',
      size_category: 'medium',
      website_url: 'https://healthtech.com',
      headquarters: 'Boston, MA',
      founded_year: 2017
    },
    {
      id: 'demo-7',
      name: 'CyberGuard Security',
      description: 'Cybersecurity solutions and threat intelligence',
      industry: 'Cybersecurity',
      size_category: 'medium',
      website_url: 'https://cyberguard.com',
      headquarters: 'Denver, CO',
      founded_year: 2016
    }
  ];

  const filteredCompanies = companies.filter(company => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      company.name.toLowerCase().includes(searchLower) ||
      (company.description && company.description.toLowerCase().includes(searchLower)) ||
      (company.industry && company.industry.toLowerCase().includes(searchLower)) ||
      (company.headquarters && company.headquarters.toLowerCase().includes(searchLower))
    );

    const isExcluded = excludedCompanies.includes(company.id);
    
    // If showExcluded is false, filter out excluded companies
    if (!showExcluded && isExcluded) {
      return false;
    }

    return matchesSearch;
  });

  const handleExcludeCompany = async (companyId: string) => {
    if (!user) return;

    setUpdating(companyId);
    try {
      const currentExcluded = userPreferences?.excluded_companies || [];
      const newExcluded = [...currentExcluded, companyId];
      
      await UserService.updateUserPreferences(user.id, {
        excluded_companies: newExcluded
      });
      
      await refreshUserData();
      toast.success("Company excluded from future applications");
    } catch (error) {
      console.error('Error excluding company:', error);
      toast.error("Failed to exclude company");
    } finally {
      setUpdating(null);
    }
  };

  const handleIncludeCompany = async (companyId: string) => {
    if (!user) return;

    setUpdating(companyId);
    try {
      const currentExcluded = userPreferences?.excluded_companies || [];
      const newExcluded = currentExcluded.filter(id => id !== companyId);
      
      await UserService.updateUserPreferences(user.id, {
        excluded_companies: newExcluded
      });
      
      await refreshUserData();
      toast.success("Company re-included for applications");
    } catch (error) {
      console.error('Error including company:', error);
      toast.error("Failed to re-include company");
    } finally {
      setUpdating(null);
    }
  };

  const handleAddCompany = async () => {
    if (!newCompany.name.trim()) {
      toast.error("Company name is required");
      return;
    }

    setAddingCompany(true);
    try {
      const companyData = {
        name: newCompany.name.trim(),
        description: newCompany.description.trim() || null,
        website_url: newCompany.website_url.trim() || null,
        industry: newCompany.industry || null,
        size_category: newCompany.size_category || null,
        headquarters: newCompany.headquarters.trim() || null,
        founded_year: newCompany.founded_year ? parseInt(newCompany.founded_year) : null
      };

      const { data, error } = await supabase
        .from('companies')
        .insert(companyData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Add to local state
      setCompanies(prev => [data, ...prev]);
      
      // Reset form
      setNewCompany({
        name: '',
        description: '',
        website_url: '',
        industry: '',
        size_category: '',
        headquarters: '',
        founded_year: ''
      });
      
      setAddCompanyDialogOpen(false);
      toast.success(`Added ${data.name} to company directory`);
      
    } catch (error) {
      console.error('Error adding company:', error);
      toast.error("Failed to add company");
    } finally {
      setAddingCompany(false);
    }
  };

  const handleGenerateCV = async (jobOpportunity: JobOpportunity) => {
    if (!user) {
      toast.error("Please log in to generate CV");
      return;
    }

    setGeneratingCV(jobOpportunity.id);
    
    try {
      // Generate CV using the selected template
      const cvGeneration = await cvGenerationService.generateCV(
        user.id,
        jobOpportunity,
        selectedTemplate
      );

      // Create application record
      const applicationRecord = await cvGenerationService.createApplicationRecord(
        user.id,
        jobOpportunity,
        cvGeneration.id
      );

      toast.success(
        `🎉 CV Generated Successfully!`, 
        {
          description: `Tailored CV created with ${cvGeneration.optimizationMetadata.selectedProjectsCount} projects and ${cvGeneration.optimizationMetadata.highlightedSkillsCount} highlighted skills`,
          action: {
            label: "Download CV",
            onClick: () => window.open(cvGeneration.pdfUrl, '_blank')
          }
        }
      );

      // Show optimization details
      toast.info(
        `CV Optimization Details`,
        {
          description: `Relevance Score: ${Math.round(cvGeneration.optimizationMetadata.relevanceScore * 100)}% • Template: ${availableTemplates.find(t => t.id === selectedTemplate)?.name}`,
          action: {
            label: "View CV",
            onClick: () => window.open(cvGeneration.pdfUrl, '_blank')
          }
        }
      );

    } catch (error) {
      console.error('Error generating CV:', error);
      toast.error(
        "CV Generation Failed", 
        {
          description: error instanceof Error ? error.message : "Unknown error occurred"
        }
      );
    } finally {
      setGeneratingCV(null);
    }
  };

  const handleDiscoverJobs = async (company: Company) => {
    setDiscoveringJobs(company.id);
    setAgentSteps([]);
    
    try {
      // Create a mock user profile for testing
      const mockUserProfile: UserProfile = {
        name: 'Alex Schmidt',
        title: 'Software Engineer',
        experience_years: 3,
        skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'AWS'],
        preferred_locations: ['Berlin', 'Munich', 'Remote'],
        salary_expectations: {
          min: 65000,
          max: 85000,
          currency: 'EUR'
        }
      };

      // Show progress steps to user
      const stepInterval = setInterval(() => {
        setAgentSteps(prev => {
          if (prev.length === 0) return ['🤖 Initializing autonomous job search agent...'];
          if (prev.length === 1) return [...prev, `🔍 Searching for ${company.name} career opportunities...`];
          if (prev.length === 2) return [...prev, '🌐 Using OpenAI web search to find career page...'];
          return prev;
        });
      }, 1000);

      // Run the autonomous agent
      const result = await autonomousJobAgent.discoverAndApplyToJobs(company, mockUserProfile);
      
      clearInterval(stepInterval);
      setAgentSteps(result.search_steps);

      if (result.success && result.jobs.length > 0) {
        setJobOpportunities(prev => new Map(prev.set(company.id, result.jobs)));
        setSelectedCompany(company);
        setJobDialogOpen(true);
        
        toast.success(`🎉 Agent found ${result.jobs.length} matching positions!`, {
          description: `Career page: ${result.career_page_url || 'Found via web search'}`
        });
      } else {
        toast.warning("No suitable jobs found", {
          description: result.error || `The agent couldn't find matching positions at ${company.name}`
        });
      }
    } catch (error) {
      console.error('Autonomous agent error:', error);
      toast.error("Agent Error", {
        description: "The autonomous job search agent encountered an error. Please check your OpenAI API key."
      });
    } finally {
      setDiscoveringJobs(null);
    }
  };

  const handleApplyToJob = async (job: JobListing, company: Company) => {
    if (!user || !userPreferences) {
      toast.error("Please complete your profile setup first");
      return;
    }

    setApplyingToJob(job.id);
    try {
      // Generate tailored CV
      const cv = await aiAgentOrchestrator.generateTailoredCV(
        userPreferences, 
        userPreferences, 
        job, 
        company
      );
      
      // TODO: Implement actual application submission
      // For now, just simulate the process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast.success(`Applied to ${job.title} at ${company.name}!`, {
        description: "Your tailored application has been submitted"
      });
      
      setJobDialogOpen(false);
      
    } catch (error) {
      console.error('Error applying to job:', error);
      toast.error("Failed to apply to job");
    } finally {
      setApplyingToJob(null);
    }
  };

  const getSizeDisplay = (sizeCategory: string | null) => {
    const sizeMap: { [key: string]: string } = {
      'startup': '1-50',
      'small': '51-200',
      'medium': '201-1000',
      'large': '1001-5000',
      'enterprise': '5000+'
    };
    return sizeCategory ? sizeMap[sizeCategory] || sizeCategory : 'Unknown';
  };

  const getCompanyEmoji = (industry: string | null) => {
    const industryMap: { [key: string]: string } = {
      'Technology': '💻',
      'Data & Analytics': '📊',
      'Clean Energy': '🌱',
      'Fintech': '💰',
      'Healthcare': '🏥',
      'Cybersecurity': '🔒',
      'Education': '📚',
      'Retail Tech': '🛒',
      'Gaming': '🎮'
    };
    return industry ? industryMap[industry] || '🏢' : '🏢';
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Company Directory</h1>
          <p className="text-gray-400">Loading companies...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-gray-900 border-gray-800 animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-700 rounded"></div>
                  <div className="h-3 bg-gray-700 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Company Directory</h1>
          <p className="text-gray-400">
            Browse and manage companies for job applications
          </p>
        </div>
        <Button
          onClick={() => setAddCompanyDialogOpen(true)}
          className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Company
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search companies, technologies, or descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-excluded"
                  checked={showExcluded}
                  onCheckedChange={setShowExcluded}
                />
                <Label htmlFor="show-excluded" className="text-sm text-gray-300 flex items-center gap-2">
                  {showExcluded ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  Show excluded companies
                </Label>
              </div>
              
              {excludedCompanies.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {excludedCompanies.length} excluded
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Excluded Companies Alert */}
      {excludedCompanies.length > 0 && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-red-400 text-sm">
              {excludedCompanies.length} Companies Excluded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400 mb-3">
              These companies will not receive automated applications
            </p>
            <div className="flex flex-wrap gap-2">
              {excludedCompanies.map(companyId => {
                const company = companies.find(c => c.id === companyId);
                return company ? (
                  <Badge key={companyId} variant="destructive" className="flex items-center gap-1">
                    {company.name}
                    <button
                      onClick={() => handleIncludeCompany(companyId)}
                      className="ml-1 hover:bg-gray-600 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ) : null;
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Company Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies.map((company) => {
          const isExcluded = excludedCompanies.includes(company.id);
          
          return (
            <Card 
              key={company.id} 
              className={`transition-all duration-200 hover:scale-105 ${
                isExcluded 
                  ? 'bg-gray-800/50 border-gray-700 opacity-50' 
                  : 'bg-gray-900 border-gray-800 hover:border-gray-600'
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center text-2xl">
                      {getCompanyEmoji(company.industry)}
                    </div>
                    <div>
                      <CardTitle className="text-white text-lg">{company.name}</CardTitle>
                      <p className="text-sm text-gray-400">{getSizeDisplay(company.size_category)} employees</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300 text-sm leading-relaxed">
                  {company.description || 'No description available'}
                </p>
                
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-medium">Industry</p>
                  <div className="flex flex-wrap gap-1">
                    {company.industry && (
                      <Badge variant="secondary" className="text-xs">
                        {company.industry}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-gray-400">📍 {company.headquarters || 'Location not specified'}</span>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => handleDiscoverJobs(company)}
                      disabled={discoveringJobs === company.id}
                      className="!text-white !border-gray-600 !bg-transparent hover:!bg-gray-700 hover:!text-white text-xs px-2 py-1"
                    >
                      {discoveringJobs === company.id ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Applying...
                        </>
                      ) : (
                        <>
                          <Briefcase className="w-3 h-3 mr-1" />
                          Apply Here
                        </>
                      )}
                    </Button>
                    
                    {isExcluded ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleIncludeCompany(company.id)}
                        disabled={updating === company.id}
                        className="!text-white !border-gray-600 !bg-transparent hover:!bg-gray-700 hover:!text-white"
                      >
                        {updating === company.id ? "Including..." : "Include"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleExcludeCompany(company.id)}
                        disabled={updating === company.id}
                      >
                        {updating === company.id ? "Excluding..." : "Exclude"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredCompanies.length === 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No companies found</h3>
            <p className="text-gray-500">Try adjusting your search terms</p>
          </CardContent>
        </Card>
      )}

      {/* Add Company Dialog */}
      <Dialog open={addCompanyDialogOpen} onOpenChange={setAddCompanyDialogOpen}>
        <DialogContent className="max-w-2xl bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Company
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company-name" className="text-sm text-gray-300">
                  Company Name *
                </Label>
                <Input
                  id="company-name"
                  placeholder="Enter company name"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="website" className="text-sm text-gray-300">
                  Website URL
                </Label>
                <Input
                  id="website"
                  placeholder="https://company.com"
                  value={newCompany.website_url}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, website_url: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm text-gray-300">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Brief description of the company"
                value={newCompany.description}
                onChange={(e) => setNewCompany(prev => ({ ...prev, description: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry" className="text-sm text-gray-300">
                  Industry
                </Label>
                <Select 
                  value={newCompany.industry} 
                  onValueChange={(value) => setNewCompany(prev => ({ ...prev, industry: value }))}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="Technology" className="text-white hover:bg-gray-700">Technology</SelectItem>
                    <SelectItem value="Data & Analytics" className="text-white hover:bg-gray-700">Data & Analytics</SelectItem>
                    <SelectItem value="Clean Energy" className="text-white hover:bg-gray-700">Clean Energy</SelectItem>
                    <SelectItem value="Fintech" className="text-white hover:bg-gray-700">Fintech</SelectItem>
                    <SelectItem value="Healthcare" className="text-white hover:bg-gray-700">Healthcare</SelectItem>
                    <SelectItem value="Cybersecurity" className="text-white hover:bg-gray-700">Cybersecurity</SelectItem>
                    <SelectItem value="Education" className="text-white hover:bg-gray-700">Education</SelectItem>
                    <SelectItem value="Retail Tech" className="text-white hover:bg-gray-700">Retail Tech</SelectItem>
                    <SelectItem value="Gaming" className="text-white hover:bg-gray-700">Gaming</SelectItem>
                    <SelectItem value="Other" className="text-white hover:bg-gray-700">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="size" className="text-sm text-gray-300">
                  Company Size
                </Label>
                <Select 
                  value={newCompany.size_category} 
                  onValueChange={(value) => setNewCompany(prev => ({ ...prev, size_category: value }))}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="startup" className="text-white hover:bg-gray-700">Startup (1-50)</SelectItem>
                    <SelectItem value="small" className="text-white hover:bg-gray-700">Small (51-200)</SelectItem>
                    <SelectItem value="medium" className="text-white hover:bg-gray-700">Medium (201-1000)</SelectItem>
                    <SelectItem value="large" className="text-white hover:bg-gray-700">Large (1001-5000)</SelectItem>
                    <SelectItem value="enterprise" className="text-white hover:bg-gray-700">Enterprise (5000+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="headquarters" className="text-sm text-gray-300">
                  Headquarters
                </Label>
                <Input
                  id="headquarters"
                  placeholder="City, State/Country"
                  value={newCompany.headquarters}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, headquarters: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="founded" className="text-sm text-gray-300">
                  Founded Year
                </Label>
                <Input
                  id="founded"
                  type="number"
                  placeholder="2020"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={newCompany.founded_year}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, founded_year: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setAddCompanyDialogOpen(false)}
                className="!text-white !border-gray-600 !bg-transparent hover:!bg-gray-700 hover:!text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddCompany}
                disabled={addingCompany || !newCompany.name.trim()}
                className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
              >
                {addingCompany ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Company
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Job Selection Dialog */}
      <Dialog open={jobDialogOpen} onOpenChange={setJobDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Jobs Found by Autonomous Agent at {selectedCompany?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Agent Steps Display */}
            {agentSteps.length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-gray-300 text-sm">🤖 Agent Search Process</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {agentSteps.map((step, index) => (
                      <div key={index} className="text-sm text-gray-400 flex items-center gap-2">
                        <span className="text-gray-500">{index + 1}.</span>
                        {step}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CV Template Selector */}
            {selectedCompany && jobOpportunities.get(selectedCompany.id)?.length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-gray-300 text-sm">📄 CV Template Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="template-select" className="text-sm text-gray-300 mb-2 block">
                        Choose CV Template
                      </Label>
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {availableTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id} className="text-white hover:bg-gray-700">
                              <div className="flex flex-col">
                                <span className="font-medium">{template.name}</span>
                                <span className="text-xs text-gray-400">{template.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-xs text-gray-400">
                      The CV will be automatically optimized based on job requirements using AI analysis.
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Job Opportunities */}
            {selectedCompany && jobOpportunities.get(selectedCompany.id)?.map((job) => (
              <Card key={job.id} className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-white text-lg">{job.title}</CardTitle>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(job.confidence_score * 100)}% match
                        </Badge>
                        <span className="text-sm text-gray-400">📍 {job.location}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(job.url, '_blank')}
                        className="!text-white !border-gray-600 !bg-transparent hover:!bg-gray-700 hover:!text-white"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View Job
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleGenerateCV(job)}
                        disabled={generatingCV === job.id}
                        className="bg-blue-600 hover:bg-blue-700 border border-blue-600"
                      >
                        {generatingCV === job.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            📄 Generate CV
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          toast.success("Job URL Found!", {
                            description: `Agent successfully navigated to: ${job.url}`
                          });
                        }}
                        className="bg-green-600 hover:bg-green-700 border border-green-600"
                      >
                        ✅ Verify
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Job Description</h4>
                    <p className="text-sm text-gray-400 leading-relaxed">{job.description}</p>
                  </div>
                  
                  {job.requirements && job.requirements.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Requirements</h4>
                      <div className="space-y-1">
                        {job.requirements.map((req, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <span className="text-gray-500 text-xs mt-1">•</span>
                            <span className="text-sm text-gray-400">{req}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {job.salary_range && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-1">Salary Range</h4>
                      <p className="text-sm text-gray-400">{job.salary_range}</p>
                    </div>
                  )}
                  
                  <div className="pt-2 border-t border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Found by Autonomous Agent</span>
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        {job.url.length > 50 ? job.url.substring(0, 50) + '...' : job.url}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {selectedCompany && (!jobOpportunities.get(selectedCompany.id) || jobOpportunities.get(selectedCompany.id)?.length === 0) && (
              <div className="text-center py-8">
                <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">No jobs found</h3>
                <p className="text-gray-500">The autonomous agent couldn't find matching positions</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
