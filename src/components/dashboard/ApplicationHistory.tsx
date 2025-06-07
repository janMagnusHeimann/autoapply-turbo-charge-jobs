
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  ChevronRight, 
  Calendar, 
  Building2, 
  FileText,
  ExternalLink 
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserService } from "@/services/userService";

interface Application {
  id: number;
  company: string;
  jobTitle: string;
  dateApplied: string;
  status: 'pending' | 'accepted' | 'rejected' | 'interview';
  cv: {
    skills: string[];
    projects: string[];
    publications: string[];
    summary: string;
  };
}

export const ApplicationHistory = () => {
  const { user } = useAuth();
  const [expandedApplication, setExpandedApplication] = useState<string | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchApplicationHistory();
    }
  }, [user]);

  const fetchApplicationHistory = async () => {
    if (!user) return;

    try {
      const data = await UserService.getApplicationHistory(user.id);
      setApplications(data);
    } catch (error) {
      console.error('Error fetching application history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock application data for demo if no real data
  const demoApplications: Application[] = [
    {
      id: 1,
      company: "Vercel",
      jobTitle: "Senior Frontend Engineer",
      dateApplied: "2024-01-15",
      status: "interview",
      cv: {
        skills: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
        projects: ["react-dashboard-framework", "ml-recommendation-engine"],
        publications: ["Efficient Neural Architecture Search for Computer Vision"],
        summary: "Experienced frontend engineer with expertise in React ecosystem and performance optimization. Passionate about creating seamless user experiences and developer tools."
      }
    },
    {
      id: 2,
      company: "Stripe",
      jobTitle: "Full Stack Engineer",
      dateApplied: "2024-01-12",
      status: "pending",
      cv: {
        skills: ["JavaScript", "Node.js", "PostgreSQL", "Redis"],
        projects: ["distributed-systems-lab", "react-dashboard-framework"],
        publications: ["Scalable Distributed Training of Deep Neural Networks"],
        summary: "Full-stack engineer with strong background in distributed systems and financial technology. Experience building scalable payment processing systems."
      }
    },
    {
      id: 3,
      company: "Linear",
      jobTitle: "Product Engineer",
      dateApplied: "2024-01-10",
      status: "rejected",
      cv: {
        skills: ["TypeScript", "React", "GraphQL", "Product Design"],
        projects: ["react-dashboard-framework"],
        publications: [],
        summary: "Product-focused engineer with experience in user interface design and development. Strong understanding of product development lifecycle."
      }
    }
  ];

  const getStatusColor = (status: Application['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-600';
      case 'accepted':
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
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      case 'interview':
        return 'Interview Scheduled';
      default:
        return 'Unknown';
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedApplication(expandedApplication === id ? null : id);
  };

  // Use real data if available, otherwise demo data
  const displayApplications = applications.length > 0 ? applications : demoApplications;

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Application History</h1>
          <p className="text-gray-400">Loading your application history...</p>
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
        <h1 className="text-3xl font-bold text-white mb-2">Application History</h1>
        <p className="text-gray-400">
          Track your automated job applications and review submitted CVs
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Applications", value: displayApplications.length, color: "text-blue-400" },
          { label: "Pending", value: displayApplications.filter(a => a.status === 'submitted' || a.status === 'acknowledged').length, color: "text-yellow-400" },
          { label: "Interviews", value: displayApplications.filter(a => a.status === 'interview').length, color: "text-green-400" },
          { label: "Success Rate", value: displayApplications.length > 0 ? Math.round((displayApplications.filter(a => a.status === 'interview' || a.status === 'offer').length / displayApplications.length) * 100) + "%" : "0%", color: "text-purple-400" }
        ].map((stat) => (
          <Card key={stat.label} className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <p className="text-sm text-gray-400">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {displayApplications.map((application) => {
          const isExpanded = expandedApplication === application.id;
          
          return (
            <Card key={application.id} className="bg-gray-900 border-gray-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(application.id)}
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
              
              {isExpanded && (
                <CardContent className="pt-0 space-y-6">
                  <div className="border-t border-gray-700 pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-5 h-5 text-blue-400" />
                      <h3 className="text-lg font-semibold text-white">
                        Generated CV for this Application
                      </h3>
                      <Button variant="outline" size="sm" className="ml-auto">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Full CV
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Summary */}
                      <div>
                        <h4 className="font-medium text-white mb-2">Professional Summary</h4>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {application.cv.summary}
                        </p>
                      </div>
                      
                      {/* Skills */}
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
                      
                      {/* Projects */}
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
                      
                      {/* Publications */}
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
      </div>

      {displayApplications.length === 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No applications yet</h3>
            <p className="text-gray-500">Applications will appear here once automation starts</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
