import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ChevronDown, 
  ChevronRight, 
  Calendar, 
  Building2, 
  FileText,
  ExternalLink,
  Search,
  Filter,
  Plus,
  Star,
  MapPin,
  DollarSign,
  Clock,
  Users,
  TrendingUp,
  Eye,
  Send,
  Sparkles,
  Loader2,
  X,
  Download
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserService } from "@/services/userService";
import { cvGenerationService } from "@/services/cvGenerationService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { CVGeneration } from "@/types/cv";

interface JobOpportunity {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  type: string;
  description: string;
  requirements: string[];
  postedDate: string;
  applicationUrl: string;
  matchScore: number;
  isNew?: boolean;
  source: string;
  tags: string[];
}

interface Application {
  id: string;
  company: string;
  jobTitle: string;
  dateApplied: string;
  status: 'pending' | 'accepted' | 'rejected' | 'interview' | 'submitted' | 'acknowledged' | 'offer';
  cv?: {
    skills: string[];
    projects: string[];
    publications: string[];
    summary: string;
  };
  jobOpportunity?: JobOpportunity;
}

export const MyJobs = () => {
  const { user } = useAuth();
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [expandedApplication, setExpandedApplication] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [discoveredJobs, setDiscoveredJobs] = useState<JobOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<'discovered' | 'applications'>('discovered');
  const [generatingCV, setGeneratingCV] = useState<string | null>(null);
  const [cvPreviewOpen, setCvPreviewOpen] = useState(false);
  const [selectedCvGeneration, setSelectedCvGeneration] = useState<CVGeneration | null>(null);
  const [jobCVs, setJobCVs] = useState<Map<string, CVGeneration>>(new Map());

  useEffect(() => {
    if (user) {
      Promise.all([
        fetchApplicationHistory(),
        fetchDiscoveredJobs(),
        loadStoredCVs()
      ]).finally(() => setLoading(false));
    }
  }, [user]);

  // Clear "new" indicators when component unmounts (page navigation)
  useEffect(() => {
    return () => {
      // When navigating away from MyJobs, clear the "new" indicators
      const storedJobs = localStorage.getItem('discoveredJobs');
      if (storedJobs) {
        const jobs = JSON.parse(storedJobs);
        const jobsWithoutNewStatus = jobs.map((job: any) => ({
          ...job,
          isNew: false
        }));
        localStorage.setItem('discoveredJobs', JSON.stringify(jobsWithoutNewStatus));
      }
    };
  }, []);

  const fetchApplicationHistory = async () => {
    if (!user) return;
    try {
      const data = await UserService.getApplicationHistory(user.id);
      setApplications(data);
    } catch (error) {
      console.error('Error fetching application history:', error);
    }
  };

  const fetchDiscoveredJobs = async () => {
    // Load discovered jobs from localStorage (from company directory job discovery)
    const storedJobs = localStorage.getItem('discoveredJobs');
    const storedTimestamp = localStorage.getItem('discoveredJobsTimestamp');
    
    if (storedJobs) {
      const jobs = JSON.parse(storedJobs);
      
      // Check if jobs are still considered "new" (less than 24 hours old)
      const currentTime = Date.now();
      const jobsTimestamp = storedTimestamp ? parseInt(storedTimestamp) : 0;
      const hoursSinceDiscovery = (currentTime - jobsTimestamp) / (1000 * 60 * 60);
      
      // Mark jobs as new if they're less than 24 hours old
      const jobsWithNewStatus = jobs.map((job: any) => ({
        ...job,
        isNew: hoursSinceDiscovery < 24
      }));
      
      setDiscoveredJobs(jobsWithNewStatus);
    }
  };

  const loadStoredCVs = async () => {
    if (!user) return;
    
    try {
      // Load CVs from localStorage
      const storedCVs = localStorage.getItem(`jobCVs_${user.id}`);
      if (storedCVs) {
        const cvData = JSON.parse(storedCVs);
        const cvMap = new Map<string, CVGeneration>();
        
        // Convert object back to Map
        Object.entries(cvData).forEach(([jobId, cvGeneration]) => {
          cvMap.set(jobId, cvGeneration as CVGeneration);
        });
        
        setJobCVs(cvMap);
        console.log(`Loaded ${cvMap.size} stored CVs for user ${user.id}`);
      }
    } catch (error) {
      console.error('Error loading stored CVs:', error);
    }
  };

  const persistCVs = (cvMap: Map<string, CVGeneration>) => {
    if (!user) return;
    
    try {
      // Convert Map to object for storage
      const cvData: Record<string, CVGeneration> = {};
      cvMap.forEach((cv, jobId) => {
        cvData[jobId] = cv;
      });
      
      localStorage.setItem(`jobCVs_${user.id}`, JSON.stringify(cvData));
    } catch (error) {
      console.error('Error persisting CVs:', error);
    }
  };

  // Check for company filter from localStorage (when coming from company directory)
  useEffect(() => {
    const selectedCompanyFilter = localStorage.getItem('selectedCompanyFilter');
    if (selectedCompanyFilter) {
      setCompanyFilter(selectedCompanyFilter);
      setActiveTab('discovered');
      // Clean up the filter from localStorage after setting it
      localStorage.removeItem('selectedCompanyFilter');
    }
  }, []);


  // Mock applications for demo
  const mockApplications: Application[] = [
    {
      id: '1',
      company: 'Vercel',
      jobTitle: 'Senior Frontend Engineer',
      dateApplied: '2024-01-15',
      status: 'interview',
      cv: {
        skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS'],
        projects: ['react-dashboard-framework', 'ml-recommendation-engine'],
        publications: ['Efficient Neural Architecture Search for Computer Vision'],
        summary: 'Experienced frontend engineer with expertise in React ecosystem and performance optimization.'
      }
    },
    {
      id: '2',
      company: 'Stripe',
      jobTitle: 'Full Stack Engineer',
      dateApplied: '2024-01-12',
      status: 'pending',
      cv: {
        skills: ['JavaScript', 'Node.js', 'PostgreSQL', 'Redis'],
        projects: ['distributed-systems-lab', 'react-dashboard-framework'],
        publications: ['Scalable Distributed Training of Deep Neural Networks'],
        summary: 'Full-stack engineer with strong background in distributed systems and financial technology.'
      }
    }
  ];

  const displayDiscoveredJobs = discoveredJobs;
  const displayApplications = applications.length > 0 ? applications : mockApplications;

  const getStatusColor = (status: Application['status']) => {
    switch (status) {
      case 'pending':
      case 'submitted':
      case 'acknowledged':
        return 'bg-yellow-600';
      case 'accepted':
      case 'offer':
        return 'bg-green-600';
      case 'rejected':
        return 'bg-red-600';
      case 'interview':
        return 'bg-blue-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getStatusText = (status: Application['status']) => {
    switch (status) {
      case 'pending':
        return 'Under Review';
      case 'submitted':
        return 'Submitted';
      case 'acknowledged':
        return 'Acknowledged';
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      case 'interview':
        return 'Interview Scheduled';
      case 'offer':
        return 'Offer Received';
      default:
        return 'Unknown';
    }
  };


  const toggleExpandedJob = (id: string) => {
    setExpandedJob(expandedJob === id ? null : id);
  };

  const toggleExpandedApplication = (id: string) => {
    setExpandedApplication(expandedApplication === id ? null : id);
  };

  const handleGenerateCV = async (job: JobOpportunity) => {
    if (!user) {
      toast.error("Please log in to generate CV");
      return;
    }

    if (!job || !job.id || !job.title) {
      toast.error("Invalid job data - cannot generate CV");
      return;
    }

    setGeneratingCV(job.id);
    
    try {
      console.log('Generating CV for job:', job.title, 'at', job.company);
      
      // Convert JobOpportunity to format expected by CV generation service
      const jobOpportunityForCV = {
        id: job.id,
        title: job.title || 'Job Title',
        description: job.description || 'Job description not available',
        requirements: Array.isArray(job.requirements) ? job.requirements : [],
        location: job.location || 'Location not specified',
        url: job.applicationUrl || '#',
        salary_range: job.salary || undefined,
        confidence_score: typeof job.matchScore === 'number' ? job.matchScore / 100 : 0.5,
        source: (job.source as 'real_scraping' | 'intelligent_fallback' | 'ai_generated' | 'demo') || 'demo',
        company: job.company || 'Company'
      };

      // Generate CV using the premium template
      const cvGeneration = await cvGenerationService.generateCV(
        user.id,
        jobOpportunityForCV,
        'premium'
      );

      // Store the generated CV
      const updatedCVs = new Map(jobCVs).set(job.id, cvGeneration);
      setJobCVs(updatedCVs);
      
      // Persist to localStorage
      persistCVs(updatedCVs);

      // Create application record
      const applicationRecord = await cvGenerationService.createApplicationRecord(
        user.id,
        jobOpportunityForCV,
        cvGeneration.id
      );

      toast.success(
        `🎉 CV Generated Successfully!`, 
        {
          description: `Tailored CV created for ${job.title} at ${job.company}`,
          action: {
            label: "View CV",
            onClick: () => {
              setSelectedCvGeneration(cvGeneration);
              setCvPreviewOpen(true);
            }
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

  const handleViewCV = (cvGeneration: CVGeneration) => {
    setSelectedCvGeneration(cvGeneration);
    setCvPreviewOpen(true);
  };

  const handleDownloadCV = (cvGeneration: CVGeneration) => {
    if (!cvGeneration.pdfUrl) {
      toast.error("PDF not available", {
        description: "The CV PDF is not available for download"
      });
      return;
    }
    
    try {
      window.open(cvGeneration.pdfUrl, '_blank');
      toast.success("CV Downloaded", {
        description: "The CV has been opened in a new tab for download"
      });
    } catch (error) {
      console.error('Error opening PDF:', error);
      toast.error("Download failed", {
        description: "Unable to open the CV PDF"
      });
    }
  };

  const filteredJobs = displayDiscoveredJobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCompany = companyFilter === 'all' || job.company === companyFilter;
    return matchesSearch && matchesCompany;
  });

  const filteredApplications = displayApplications.filter(app => {
    const matchesSearch = app.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCompany = companyFilter === 'all' || app.company === companyFilter;
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesCompany && matchesStatus;
  });

  const companies = [...new Set([...displayDiscoveredJobs.map(j => j.company), ...displayApplications.map(a => a.company)])];

  const stats = {
    totalJobs: displayDiscoveredJobs.length,
    newJobs: displayDiscoveredJobs.filter(j => j.isNew).length,
    totalApplications: displayApplications.length,
    pendingApplications: displayApplications.filter(a => ['pending', 'submitted', 'acknowledged'].includes(a.status)).length,
    interviews: displayApplications.filter(a => a.status === 'interview').length
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Jobs</h1>
          <p className="text-gray-400">Loading your job opportunities and applications...</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-gray-900 border-gray-800 animate-pulse">
              <CardContent className="pt-6">
                <div className="h-8 bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-700 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">My Jobs</h1>
        <p className="text-gray-400">
          Discover new opportunities and track your applications
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.totalJobs}</div>
              <p className="text-sm text-gray-400">Jobs Found</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{stats.newJobs}</div>
              <p className="text-sm text-gray-400">New Jobs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{stats.totalApplications}</div>
              <p className="text-sm text-gray-400">Applications</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.pendingApplications}</div>
              <p className="text-sm text-gray-400">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{stats.interviews}</div>
              <p className="text-sm text-gray-400">Interviews</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search jobs and companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-900 border-gray-700 text-white placeholder-gray-400"
            />
          </div>
        </div>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-48 bg-gray-900 border-gray-700 text-white">
            <Building2 className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map(company => (
              <SelectItem key={company} value={company}>{company}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activeTab === 'applications' && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 bg-gray-900 border-gray-700 text-white">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="interview">Interview</SelectItem>
              <SelectItem value="offer">Offer</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-900 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('discovered')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            activeTab === 'discovered'
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Star className="w-4 h-4" />
            <span>Discovered Jobs ({filteredJobs.length})</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            activeTab === 'applications'
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Applications ({filteredApplications.length})</span>
          </div>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'discovered' ? (
        <div className="space-y-4">
          {filteredJobs.map((job) => {
            const isExpanded = expandedJob === job.id;
            const hasCV = jobCVs.has(job.id);
            const cvGeneration = jobCVs.get(job.id);
            
            return (
              <Card key={job.id} className="bg-gray-900 border-gray-800 hover:bg-gray-850 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-white">
                          {job.title}
                        </h3>
                        {job.isNew && (
                          <Badge variant="secondary" className="bg-green-500 text-white">
                            New
                          </Badge>
                        )}
                        {hasCV && (
                          <Badge variant="secondary" className="bg-blue-500 text-white">
                            CV Ready
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-gray-400 mb-3">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          <span className="font-medium">{job.company}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{job.location}</span>
                        </div>
                        {job.salary && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            <span>{job.salary}</span>
                          </div>
                        )}
                        
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpandedJob(job.id)}
                      className="text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="pt-0 space-y-4">
                    <div className="prose prose-sm max-w-none text-gray-300">
                      <p className="mb-4">{job.description}</p>
                      
                      {job.requirements.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-white mb-2">Requirements:</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {job.requirements.map((req, index) => (
                              <li key={index} className="text-sm">{req}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {job.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    {/* CV Section */}
                    {hasCV && cvGeneration && (
                      <div className="border-t border-gray-800 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-white flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-400" />
                            Generated CV
                          </h4>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleViewCV(cvGeneration)}
                              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View CV
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDownloadCV(cvGeneration)}
                              className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                        
                        {/* CV Preview */}
                        <div className="bg-gray-800 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <h5 className="font-medium text-white mb-2">Optimization</h5>
                              <div className="text-sm text-gray-400">
                                {cvGeneration.optimizationMetadata?.selectedProjectsCount || 0} projects • {cvGeneration.optimizationMetadata?.highlightedSkillsCount || 0} skills
                              </div>
                            </div>
                            <div>
                              <h5 className="font-medium text-white mb-2">Template</h5>
                              <div className="text-sm text-gray-400">
                                {cvGeneration.templateId || 'premium'}
                              </div>
                            </div>
                            <div>
                              <h5 className="font-medium text-white mb-2">Generated</h5>
                              <div className="text-sm text-gray-400">
                                {cvGeneration.createdAt ? new Date(cvGeneration.createdAt).toLocaleDateString() : 'Recently'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white"
                          onClick={() => window.open(job.applicationUrl, '_blank', 'noopener,noreferrer')}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Job
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white"
                          onClick={() => handleGenerateCV(job)}
                          disabled={generatingCV === job.id}
                        >
                          {generatingCV === job.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <FileText className="w-4 h-4 mr-2" />
                              {hasCV ? 'Regenerate CV' : 'Generate CV'}
                            </>
                          )}
                        </Button>
                      </div>
                      
                      <div className="text-sm text-gray-400">
                        Posted {job.postedDate} • {job.source}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
          
          {filteredJobs.length === 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="text-center py-12">
                <Star className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">No jobs found</h3>
                <p className="text-gray-500">Try adjusting your search or filters</p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => {
            const isExpanded = expandedApplication === application.id;
            
            return (
              <Card key={application.id} className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpandedApplication(application.id)}
                        className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                      
                      <div>
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                          <Building2 className="w-5 h-5" />
                          {application.company}
                        </CardTitle>
                        <p className="text-gray-400">{application.jobTitle}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {new Date(application.dateApplied).toLocaleDateString()}
                      </div>
                      <Badge className={`${getStatusColor(application.status)} text-white`}>
                        {getStatusText(application.status)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                {isExpanded && application.cv && (
                  <CardContent className="pt-0 space-y-6">
                    <div className="border-t border-gray-700 pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <FileText className="w-5 h-5 text-blue-400" />
                        <h3 className="text-lg font-semibold text-white">
                          Generated CV for this Application
                        </h3>
                        <Button variant="outline" size="sm" className="ml-auto text-white border-gray-600 bg-transparent hover:bg-gray-700 hover:text-white">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Full CV
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-white mb-2">Professional Summary</h4>
                          <p className="text-gray-300 text-sm leading-relaxed">
                            {application.cv.summary}
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-white mb-2">Highlighted Skills</h4>
                          <div className="flex flex-wrap gap-2">
                            {application.cv.skills.map((skill) => (
                              <Badge key={skill} variant="secondary">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-white mb-2">Featured Projects</h4>
                          <ul className="space-y-1">
                            {application.cv.projects.map((project) => (
                              <li key={project} className="text-gray-300 text-sm">
                                • {project}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {application.cv.publications.length > 0 && (
                          <div>
                            <h4 className="font-medium text-white mb-2">Publications</h4>
                            <ul className="space-y-1">
                              {application.cv.publications.map((publication) => (
                                <li key={publication} className="text-gray-300 text-sm">
                                  • {publication}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
          
          {filteredApplications.length === 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">No applications found</h3>
                <p className="text-gray-500">Try adjusting your search or filters</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* CV Preview Modal */}
      <Dialog open={cvPreviewOpen} onOpenChange={setCvPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] bg-gray-900 border-gray-700 text-white p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              CV Preview
            </DialogTitle>
            <DialogClose className="absolute right-4 top-4 text-gray-400 hover:text-gray-200 hover:bg-gray-800 p-1 rounded">
              <X className="w-4 h-4" />
            </DialogClose>
          </DialogHeader>
          
          {selectedCvGeneration && (
            <div className="p-6 pt-2">
              {/* CV Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {selectedCvGeneration.cvData?.profile?.name || 'CV Preview'}
                  </h3>
                  <p className="text-gray-400">{selectedCvGeneration.cvData?.profile?.title || 'Professional'}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleDownloadCV(selectedCvGeneration)}
                    className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => window.open(selectedCvGeneration.pdfUrl, '_blank')}
                    className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Full Screen
                  </Button>
                </div>
              </div>

              {/* PDF Viewer */}
              {selectedCvGeneration.pdfUrl ? (
                <div className="bg-white rounded-lg overflow-hidden" style={{ height: '70vh' }}>
                  <iframe
                    src={`${selectedCvGeneration.pdfUrl}#view=FitH`}
                    title="CV Preview"
                    className="w-full h-full border-0"
                    style={{ minHeight: '600px' }}
                  />
                </div>
              ) : (
                <div className="bg-gray-800 rounded-lg p-8 text-center" style={{ height: '70vh' }}>
                  <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-400 mb-2">PDF Not Available</h3>
                  <p className="text-gray-500">The CV PDF is being generated or is not available for preview.</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};