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
  Sparkles
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserService } from "@/services/userService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  useEffect(() => {
    if (user) {
      Promise.all([
        fetchApplicationHistory(),
        fetchDiscoveredJobs()
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
            
            return (
              <Card key={job.id} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpandedJob(job.id)}
                        className="p-1 text-gray-400 hover:text-white"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-white text-lg">{job.title}</CardTitle>
                          {job.isNew && (
                            <Badge className="bg-green-600 text-white text-xs">NEW</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center gap-1 text-gray-400">
                            <Building2 className="w-4 h-4" />
                            <span>{job.company}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-400">
                            <MapPin className="w-4 h-4" />
                            <span>{job.location}</span>
                          </div>
                          {job.salary && (
                            <div className="flex items-center gap-1 text-gray-400">
                              <DollarSign className="w-4 h-4" />
                              <span>{job.salary}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-gray-400 border-gray-600">
                          {job.source}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <Clock className="w-4 h-4" />
                          {new Date(job.postedDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="pt-0 space-y-6">
                    <div className="border-t border-gray-700 pt-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-white mb-2">Job Description</h4>
                          <p className="text-gray-300 text-sm leading-relaxed">
                            {job.description}
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-white mb-2">Requirements</h4>
                          <div className="space-y-2">
                            {job.requirements.map((req, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                <span className="text-gray-300 text-sm">{req}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-6 flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                          {job.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-gray-400 border-gray-600 hover:bg-gray-800 hover:text-white"
                            onClick={() => window.open(job.applicationUrl, '_blank', 'noopener,noreferrer')}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Job
                          </Button>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Quick Apply
                          </Button>
                        </div>
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
                        className="p-1 text-gray-400 hover:text-white"
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
    </div>
  );
};