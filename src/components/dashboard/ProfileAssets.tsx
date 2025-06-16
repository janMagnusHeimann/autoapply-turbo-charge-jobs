import { useState, useEffect } from "react";
import { Github, GraduationCap, ExternalLink, Plus, Edit, Briefcase, Calendar, MapPin, Trash2, Star, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { UserService } from "@/services/userService";
import { SelectiveGitHubIntegration } from "./SelectiveGitHubIntegration";

interface CVAsset {
  id: string;
  asset_type: 'repository' | 'publication' | 'skill' | 'experience' | 'education' | 'other';
  title: string;
  description: string | null;
  metadata: any;
  tags: string[];
  external_url: string | null;
}

interface ExperienceForm {
  id?: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
  achievements: string;
  current: boolean;
}

interface EducationForm {
  id?: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  gpa: string;
  description: string;
  current: boolean;
}

interface OtherForm {
  id?: string;
  title: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
  achievements: string;
  category: string;
  current: boolean;
}

export const ProfileAssets = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<CVAsset[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [showExperienceForm, setShowExperienceForm] = useState(false);
  const [showEducationForm, setShowEducationForm] = useState(false);
  const [showOtherForm, setShowOtherForm] = useState(false);
  const [editingExperience, setEditingExperience] = useState<ExperienceForm | null>(null);
  const [editingEducation, setEditingEducation] = useState<EducationForm | null>(null);
  const [editingOther, setEditingOther] = useState<OtherForm | null>(null);
  
  const [experienceForm, setExperienceForm] = useState<ExperienceForm>({
    company: '',
    position: '',
    startDate: '',
    endDate: '',
    location: '',
    description: '',
    achievements: '',
    current: false
  });

  const [educationForm, setEducationForm] = useState<EducationForm>({
    institution: '',
    degree: '',
    field: '',
    startDate: '',
    endDate: '',
    gpa: '',
    description: '',
    current: false
  });

  const [otherForm, setOtherForm] = useState<OtherForm>({
    title: '',
    organization: '',
    role: '',
    startDate: '',
    endDate: '',
    description: '',
    achievements: '',
    category: '',
    current: false
  });

  useEffect(() => {
    if (user) {
      fetchAssets();
    }
  }, [user]);

  const fetchAssets = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const data = await UserService.getUserCVAssets(user.id);
      
      if (data && data.length > 0) {
        setAssets(data);
      } else {
        // If no real data, show demo data
        setAssets(getDemoAssets());
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
      setAssets(getDemoAssets());
    } finally {
      setLoading(false);
    }
  };

  const getDemoAssets = (): CVAsset[] => [
    {
      id: 'demo-exp-1',
      asset_type: 'experience',
      title: 'Senior Software Engineer at TechCorp',
      description: 'Led development of microservices architecture serving 1M+ users',
      metadata: {
        company: 'TechCorp',
        position: 'Senior Software Engineer',
        startDate: '2021-03',
        endDate: '2023-12',
        location: 'San Francisco, CA',
        achievements: 'Reduced system latency by 40%, Led team of 5 developers, Implemented CI/CD pipeline'
      },
      tags: ['Leadership', 'Microservices', 'React', 'Node.js'],
      external_url: null
    },
    {
      id: 'demo-exp-2',
      asset_type: 'experience',
      title: 'Full Stack Developer at StartupXYZ',
      description: 'Built MVP and scaled to 100K users using React and Python',
      metadata: {
        company: 'StartupXYZ',
        position: 'Full Stack Developer',
        startDate: '2019-06',
        endDate: '2021-02',
        location: 'Austin, TX',
        achievements: 'Built application from scratch, Scaled to 100K users, Implemented payment system'
      },
      tags: ['React', 'Python', 'Startup', 'Full Stack'],
      external_url: null
    },
    {
      id: 'demo-edu-1',
      asset_type: 'education',
      title: 'M.S. Computer Science',
      description: 'Masters degree with focus on software engineering and machine learning',
      metadata: {
        institution: 'Stanford University',
        degree: 'Master of Science',
        field: 'Computer Science',
        startDate: '2017-09',
        endDate: '2019-05',
        gpa: '3.8'
      },
      tags: ['Computer Science', 'Software Engineering', 'Machine Learning'],
      external_url: null
    },
    {
      id: 'demo-edu-2',
      asset_type: 'education',
      title: 'B.S. Computer Engineering',
      description: 'Bachelor degree with emphasis on systems and software development',
      metadata: {
        institution: 'UC Berkeley',
        degree: 'Bachelor of Science',
        field: 'Computer Engineering',
        startDate: '2013-09',
        endDate: '2017-05',
        gpa: '3.7'
      },
      tags: ['Computer Engineering', 'Systems', 'Software Development'],
      external_url: null
    },
    {
      id: 'demo-other-1',
      asset_type: 'other',
      title: 'President - Computer Science Student Association',
      description: 'Led student organization with 200+ members, organized hackathons and tech talks',
      metadata: {
        organization: 'Computer Science Student Association',
        role: 'President',
        startDate: '2018-09',
        endDate: '2019-05',
        category: 'Student Organization',
        achievements: 'Increased membership by 40%, Organized 3 major hackathons, Secured $10K in sponsorships'
      },
      tags: ['Leadership', 'Student Organization', 'Event Planning'],
      external_url: null
    },
    {
      id: 'demo-other-2',
      asset_type: 'other',
      title: 'AWS Certified Solutions Architect',
      description: 'Professional certification in cloud architecture and AWS services',
      metadata: {
        organization: 'Amazon Web Services',
        role: 'Certified Professional',
        startDate: '2022-03',
        endDate: '2025-03',
        category: 'Certification',
        achievements: 'Passed with 890/1000 score, Validates expertise in cloud architecture design'
      },
      tags: ['AWS', 'Cloud Architecture', 'Certification'],
      external_url: 'https://aws.amazon.com/certification/'
    },
    {
      id: 'demo-other-3',
      asset_type: 'other',
      title: 'Volunteer Developer - Code for Good',
      description: 'Built mobile app for local food bank to track donations and volunteer hours',
      metadata: {
        organization: 'Code for Good',
        role: 'Volunteer Developer',
        startDate: '2020-01',
        endDate: '2020-06',
        category: 'Volunteer Work',
        achievements: 'Developed React Native app serving 500+ volunteers, Reduced manual tracking by 80%'
      },
      tags: ['Volunteer Work', 'React Native', 'Social Impact'],
      external_url: null
    }
  ];

  const handleSaveExperience = async () => {
    if (!user) return;

    try {
      const metadata = {
        company: experienceForm.company,
        position: experienceForm.position,
        startDate: experienceForm.startDate,
        endDate: experienceForm.current ? null : experienceForm.endDate,
        location: experienceForm.location,
        achievements: experienceForm.achievements,
        current: experienceForm.current
      };

      if (editingExperience?.id) {
        // Update existing
        await UserService.updateCVAsset(editingExperience.id, {
          title: `${experienceForm.position} at ${experienceForm.company}`,
          description: experienceForm.description,
          metadata,
          tags: [experienceForm.company, experienceForm.position, 'Experience']
        });
      } else {
        // Create new
        await UserService.createCVAsset(user.id, {
          asset_type: 'experience',
          title: `${experienceForm.position} at ${experienceForm.company}`,
          description: experienceForm.description,
          metadata,
          tags: [experienceForm.company, experienceForm.position, 'Experience']
        });
      }

      // Reset form
      setExperienceForm({
        company: '',
        position: '',
        startDate: '',
        endDate: '',
        location: '',
        description: '',
        achievements: '',
        current: false
      });
      setShowExperienceForm(false);
      setEditingExperience(null);
      fetchAssets();
    } catch (error) {
      console.error('Error saving experience:', error);
    }
  };

  const handleSaveEducation = async () => {
    if (!user) return;

    try {
      const metadata = {
        institution: educationForm.institution,
        degree: educationForm.degree,
        field: educationForm.field,
        startDate: educationForm.startDate,
        endDate: educationForm.current ? null : educationForm.endDate,
        gpa: educationForm.gpa,
        current: educationForm.current
      };

      if (editingEducation?.id) {
        // Update existing
        await UserService.updateCVAsset(editingEducation.id, {
          title: `${educationForm.degree} ${educationForm.field}`,
          description: educationForm.description,
          metadata,
          tags: [educationForm.institution, educationForm.degree, educationForm.field]
        });
      } else {
        // Create new
        await UserService.createCVAsset(user.id, {
          asset_type: 'education',
          title: `${educationForm.degree} ${educationForm.field}`,
          description: educationForm.description,
          metadata,
          tags: [educationForm.institution, educationForm.degree, educationForm.field]
        });
      }

      // Reset form
      setEducationForm({
        institution: '',
        degree: '',
        field: '',
        startDate: '',
        endDate: '',
        gpa: '',
        description: '',
        current: false
      });
      setShowEducationForm(false);
      setEditingEducation(null);
      fetchAssets();
    } catch (error) {
      console.error('Error saving education:', error);
    }
  };

  const handleSaveOther = async () => {
    if (!user) return;

    try {
      const metadata = {
        organization: otherForm.organization,
        role: otherForm.role,
        startDate: otherForm.startDate,
        endDate: otherForm.current ? null : otherForm.endDate,
        category: otherForm.category,
        achievements: otherForm.achievements,
        current: otherForm.current
      };

      if (editingOther?.id) {
        // Update existing
        await UserService.updateCVAsset(editingOther.id, {
          title: otherForm.title,
          description: otherForm.description,
          metadata,
          tags: [otherForm.organization, otherForm.category, otherForm.role]
        });
      } else {
        // Create new
        await UserService.createCVAsset(user.id, {
          asset_type: 'other',
          title: otherForm.title,
          description: otherForm.description,
          metadata,
          tags: [otherForm.organization, otherForm.category, otherForm.role]
        });
      }

      // Reset form
      setOtherForm({
        title: '',
        organization: '',
        role: '',
        startDate: '',
        endDate: '',
        description: '',
        achievements: '',
        category: '',
        current: false
      });
      setShowOtherForm(false);
      setEditingOther(null);
      fetchAssets();
    } catch (error) {
      console.error('Error saving other:', error);
    }
  };

  const handleEditExperience = (asset: CVAsset) => {
    const meta = asset.metadata || {};
    setExperienceForm({
      id: asset.id,
      company: meta.company || '',
      position: meta.position || '',
      startDate: meta.startDate || '',
      endDate: meta.endDate || '',
      location: meta.location || '',
      description: asset.description || '',
      achievements: meta.achievements || '',
      current: meta.current || false
    });
    setEditingExperience({ id: asset.id, ...meta });
    setShowExperienceForm(true);
  };

  const handleEditEducation = (asset: CVAsset) => {
    const meta = asset.metadata || {};
    setEducationForm({
      id: asset.id,
      institution: meta.institution || '',
      degree: meta.degree || '',
      field: meta.field || '',
      startDate: meta.startDate || '',
      endDate: meta.endDate || '',
      gpa: meta.gpa || '',
      description: asset.description || '',
      current: meta.current || false
    });
    setEditingEducation({ id: asset.id, ...meta });
    setShowEducationForm(true);
  };

  const handleEditOther = (asset: CVAsset) => {
    const meta = asset.metadata || {};
    setOtherForm({
      id: asset.id,
      title: asset.title || '',
      organization: meta.organization || '',
      role: meta.role || '',
      startDate: meta.startDate || '',
      endDate: meta.endDate || '',
      description: asset.description || '',
      achievements: meta.achievements || '',
      category: meta.category || '',
      current: meta.current || false
    });
    setEditingOther({ id: asset.id, ...meta });
    setShowOtherForm(true);
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      await UserService.deleteCVAsset(id);
      fetchAssets();
    } catch (error) {
      console.error('Error deleting asset:', error);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  const experiences = assets.filter(asset => asset.asset_type === 'experience');
  const education = assets.filter(asset => asset.asset_type === 'education');
  const repositories = assets.filter(asset => asset.asset_type === 'repository');
  const publications = assets.filter(asset => asset.asset_type === 'publication');
  const otherAssets = assets.filter(asset => asset.asset_type === 'other');

  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: any } = {
      'Student Organization': Star,
      'Certification': Award,
      'Volunteer Work': Star,
      'Award': Award,
      'Competition': Award,
      'Course': GraduationCap,
      'Project': Briefcase
    };
    return iconMap[category] || Star;
  };

  const getCategoryColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      'Student Organization': 'text-purple-400',
      'Certification': 'text-yellow-400',
      'Volunteer Work': 'text-gray-400',
      'Award': 'text-yellow-400',
      'Competition': 'text-orange-400',
      'Course': 'text-gray-400',
      'Project': 'text-indigo-400'
    };
    return colorMap[category] || 'text-purple-400';
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Profile & CV Assets</h1>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">My Profile & CV Assets</h1>
        <p className="text-gray-400">
          Manage your professional experience, education, and other CV assets
        </p>
      </div>

      <Tabs defaultValue="experience" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-gray-800">
          <TabsTrigger value="experience" className="text-gray-300 data-[state=active]:bg-gray-600 data-[state=active]:text-white">
            Experience
          </TabsTrigger>
          <TabsTrigger value="education" className="text-gray-300 data-[state=active]:bg-gray-600 data-[state=active]:text-white">
            Education
          </TabsTrigger>
          <TabsTrigger value="other" className="text-gray-300 data-[state=active]:bg-gray-600 data-[state=active]:text-white">
            Other
          </TabsTrigger>
          <TabsTrigger value="repositories" className="text-gray-300 data-[state=active]:bg-gray-600 data-[state=active]:text-white">
            Repositories
          </TabsTrigger>
          <TabsTrigger value="publications" className="text-gray-300 data-[state=active]:bg-gray-600 data-[state=active]:text-white">
            Publications
          </TabsTrigger>
        </TabsList>

        {/* Professional Experience Tab */}
        <TabsContent value="experience" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Professional Experience</h2>
              <p className="text-gray-400">Add and manage your work experience</p>
            </div>
            <Button
              onClick={() => setShowExperienceForm(true)}
              className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Experience
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {experiences.map((exp) => (
              <Card key={exp.id} className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                        <Briefcase className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-lg">{exp.metadata?.position}</CardTitle>
                        <p className="text-gray-400 font-medium">{exp.metadata?.company}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(exp.metadata?.startDate)} - {exp.metadata?.current ? 'Present' : formatDate(exp.metadata?.endDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {exp.metadata?.location}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditExperience(exp)}
                        className="text-gray-400 hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAsset(exp.id)}
                        className="text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-gray-300 leading-relaxed">{exp.description}</p>
                  </div>
                  {exp.metadata?.achievements && (
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <Label className="text-sm font-medium text-white mb-2 block">Key Achievements:</Label>
                      <p className="text-sm text-gray-300">{exp.metadata.achievements}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {exp.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Education Tab */}
        <TabsContent value="education" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Education</h2>
              <p className="text-gray-400">Add and manage your educational background</p>
            </div>
            <Button
              onClick={() => setShowEducationForm(true)}
              className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Education
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {education.map((edu) => (
              <Card key={edu.id} className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-lg">{edu.metadata?.degree} {edu.metadata?.field}</CardTitle>
                        <p className="text-gray-400 font-medium">{edu.metadata?.institution}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(edu.metadata?.startDate)} - {edu.metadata?.current ? 'Present' : formatDate(edu.metadata?.endDate)}
                          </span>
                          {edu.metadata?.gpa && (
                            <span>GPA: {edu.metadata.gpa}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditEducation(edu)}
                        className="text-gray-400 hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAsset(edu.id)}
                        className="text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {edu.description && (
                    <div>
                      <p className="text-gray-300 leading-relaxed">{edu.description}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {edu.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Other Tab */}
        <TabsContent value="other" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Other Achievements</h2>
              <p className="text-gray-400">Add student organizations, certifications, volunteer work, awards, and more</p>
            </div>
            <Button
              onClick={() => setShowOtherForm(true)}
              className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Achievement
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {otherAssets.map((other) => {
              const IconComponent = getCategoryIcon(other.metadata?.category || '');
              const iconColor = getCategoryColor(other.metadata?.category || '');
              
              return (
                <Card key={other.id} className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                          <IconComponent className={`w-6 h-6 ${iconColor}`} />
                        </div>
                        <div>
                          <CardTitle className="text-white text-lg">{other.title}</CardTitle>
                          <p className={`font-medium ${iconColor}`}>{other.metadata?.organization}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(other.metadata?.startDate)} - {other.metadata?.current ? 'Present' : formatDate(other.metadata?.endDate)}
                            </span>
                            {other.metadata?.category && (
                              <Badge variant="outline" className="!text-white !border-gray-600 !bg-transparent">
                                {other.metadata.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditOther(other)}
                          className="text-gray-400 hover:text-white"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAsset(other.id)}
                          className="text-gray-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-gray-300 leading-relaxed">{other.description}</p>
                    </div>
                    {other.metadata?.achievements && (
                      <div className="bg-gray-800 p-3 rounded-lg">
                        <Label className="text-sm font-medium text-white mb-2 block">Key Achievements:</Label>
                        <p className="text-sm text-gray-300">{other.metadata.achievements}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {other.tags?.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    {other.external_url && (
                      <div className="pt-2">
                        <a
                          href={other.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-gray-300 hover:text-white text-sm"
                        >
                          View Certificate <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Repositories Tab */}
        <TabsContent value="repositories" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white">GitHub Portfolio</h2>
            <p className="text-gray-400">Select repositories and add descriptions for your professional portfolio</p>
          </div>
          
          <SelectiveGitHubIntegration onRepositoriesSync={fetchAssets} />
        </TabsContent>

        {/* Publications Tab */}
        <TabsContent value="publications" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Academic Publications</h2>
            <p className="text-gray-400">Connect your Google Scholar profile to import publications</p>
          </div>
          
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="text-center py-12">
              <GraduationCap className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">Connect Google Scholar</h3>
              <p className="text-gray-500 mb-4">Import your academic publications and research papers</p>
              <Button className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600">
                <GraduationCap className="w-4 h-4 mr-2" />
                Connect Scholar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Experience Dialog */}
      <Dialog open={showExperienceForm} onOpenChange={() => {
        setShowExperienceForm(false);
        setEditingExperience(null);
        setExperienceForm({
          company: '',
          position: '',
          startDate: '',
          endDate: '',
          location: '',
          description: '',
          achievements: '',
          current: false
        });
      }}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingExperience ? 'Edit Experience' : 'Add Professional Experience'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company" className="text-white">Company *</Label>
                <Input
                  id="company"
                  value={experienceForm.company}
                  onChange={(e) => setExperienceForm(prev => ({ ...prev, company: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="e.g., Google, Microsoft"
                />
              </div>
              <div>
                <Label htmlFor="position" className="text-white">Position *</Label>
                <Input
                  id="position"
                  value={experienceForm.position}
                  onChange={(e) => setExperienceForm(prev => ({ ...prev, position: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="e.g., Software Engineer"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="location" className="text-white">Location</Label>
              <Input
                id="location"
                value={experienceForm.location}
                onChange={(e) => setExperienceForm(prev => ({ ...prev, location: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="e.g., San Francisco, CA"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate" className="text-white">Start Date</Label>
                <Input
                  id="startDate"
                  type="month"
                  value={experienceForm.startDate}
                  onChange={(e) => setExperienceForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="endDate" className="text-white">End Date</Label>
                <Input
                  id="endDate"
                  type="month"
                  value={experienceForm.endDate}
                  onChange={(e) => setExperienceForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  disabled={experienceForm.current}
                />
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="current"
                    checked={experienceForm.current}
                    onChange={(e) => setExperienceForm(prev => ({ ...prev, current: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="current" className="text-sm text-gray-400">I currently work here</Label>
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="description" className="text-white">Job Description</Label>
              <Textarea
                id="description"
                value={experienceForm.description}
                onChange={(e) => setExperienceForm(prev => ({ ...prev, description: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Describe your role and responsibilities..."
              />
            </div>
            <div>
              <Label htmlFor="achievements" className="text-white">Key Achievements</Label>
              <Textarea
                id="achievements"
                value={experienceForm.achievements}
                onChange={(e) => setExperienceForm(prev => ({ ...prev, achievements: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="e.g., Improved performance by 40%, Led team of 5 developers..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowExperienceForm(false)}
                className="!text-white !border-gray-600 !bg-transparent hover:!bg-gray-700 hover:!text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveExperience}
                className="bg-gray-700 hover:bg-gray-600 border border-gray-600"
                disabled={!experienceForm.company || !experienceForm.position}
              >
                {editingExperience ? 'Update' : 'Add'} Experience
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Education Dialog */}
      <Dialog open={showEducationForm} onOpenChange={() => {
        setShowEducationForm(false);
        setEditingEducation(null);
        setEducationForm({
          institution: '',
          degree: '',
          field: '',
          startDate: '',
          endDate: '',
          gpa: '',
          description: '',
          current: false
        });
      }}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingEducation ? 'Edit Education' : 'Add Education'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="institution" className="text-white">Institution *</Label>
              <Input
                id="institution"
                value={educationForm.institution}
                onChange={(e) => setEducationForm(prev => ({ ...prev, institution: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="e.g., Stanford University"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="degree" className="text-white">Degree *</Label>
                <Input
                  id="degree"
                  value={educationForm.degree}
                  onChange={(e) => setEducationForm(prev => ({ ...prev, degree: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="e.g., Bachelor of Science"
                />
              </div>
              <div>
                <Label htmlFor="field" className="text-white">Field of Study</Label>
                <Input
                  id="field"
                  value={educationForm.field}
                  onChange={(e) => setEducationForm(prev => ({ ...prev, field: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="e.g., Computer Science"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startDate" className="text-white">Start Date</Label>
                <Input
                  id="startDate"
                  type="month"
                  value={educationForm.startDate}
                  onChange={(e) => setEducationForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="endDate" className="text-white">End Date</Label>
                <Input
                  id="endDate"
                  type="month"
                  value={educationForm.endDate}
                  onChange={(e) => setEducationForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  disabled={educationForm.current}
                />
              </div>
              <div>
                <Label htmlFor="gpa" className="text-white">GPA (Optional)</Label>
                <Input
                  id="gpa"
                  value={educationForm.gpa}
                  onChange={(e) => setEducationForm(prev => ({ ...prev, gpa: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="e.g., 3.8"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="currentEdu"
                checked={educationForm.current}
                onChange={(e) => setEducationForm(prev => ({ ...prev, current: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="currentEdu" className="text-sm text-gray-400">I am currently studying here</Label>
            </div>
            <div>
              <Label htmlFor="description" className="text-white">Description (Optional)</Label>
              <Textarea
                id="description"
                value={educationForm.description}
                onChange={(e) => setEducationForm(prev => ({ ...prev, description: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Describe your studies, relevant coursework, honors, etc..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowEducationForm(false)}
                className="!text-white !border-gray-600 !bg-transparent hover:!bg-gray-700 hover:!text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEducation}
                className="bg-gray-700 hover:bg-gray-600 border border-gray-600"
                disabled={!educationForm.institution || !educationForm.degree}
              >
                {editingEducation ? 'Update' : 'Add'} Education
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Other Dialog */}
      <Dialog open={showOtherForm} onOpenChange={() => {
        setShowOtherForm(false);
        setEditingOther(null);
        setOtherForm({
          title: '',
          organization: '',
          role: '',
          startDate: '',
          endDate: '',
          description: '',
          achievements: '',
          category: '',
          current: false
        });
      }}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingOther ? 'Edit Achievement' : 'Add Other Achievement'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-white">Title *</Label>
              <Input
                id="title"
                value={otherForm.title}
                onChange={(e) => setOtherForm(prev => ({ ...prev, title: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="e.g., President - CS Student Association, AWS Certification"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="organization" className="text-white">Organization *</Label>
                <Input
                  id="organization"
                  value={otherForm.organization}
                  onChange={(e) => setOtherForm(prev => ({ ...prev, organization: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="e.g., CS Student Association, Amazon Web Services"
                />
              </div>
              <div>
                <Label htmlFor="role" className="text-white">Role/Position</Label>
                <Input
                  id="role"
                  value={otherForm.role}
                  onChange={(e) => setOtherForm(prev => ({ ...prev, role: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="e.g., President, Volunteer, Certified Professional"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="category" className="text-white">Category *</Label>
              <select
                id="category"
                value={otherForm.category}
                onChange={(e) => setOtherForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2"
              >
                <option value="">Select a category</option>
                <option value="Student Organization">Student Organization</option>
                <option value="Certification">Certification</option>
                <option value="Volunteer Work">Volunteer Work</option>
                <option value="Award">Award/Honor</option>
                <option value="Competition">Competition</option>
                <option value="Course">Online Course</option>
                <option value="Project">Personal Project</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate" className="text-white">Start Date</Label>
                <Input
                  id="startDate"
                  type="month"
                  value={otherForm.startDate}
                  onChange={(e) => setOtherForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="endDate" className="text-white">End Date</Label>
                <Input
                  id="endDate"
                  type="month"
                  value={otherForm.endDate}
                  onChange={(e) => setOtherForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  disabled={otherForm.current}
                />
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="currentOther"
                    checked={otherForm.current}
                    onChange={(e) => setOtherForm(prev => ({ ...prev, current: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="currentOther" className="text-sm text-gray-400">This is ongoing</Label>
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="description" className="text-white">Description</Label>
              <Textarea
                id="description"
                value={otherForm.description}
                onChange={(e) => setOtherForm(prev => ({ ...prev, description: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Describe your role, responsibilities, or what you accomplished..."
              />
            </div>
            <div>
              <Label htmlFor="achievements" className="text-white">Key Achievements</Label>
              <Textarea
                id="achievements"
                value={otherForm.achievements}
                onChange={(e) => setOtherForm(prev => ({ ...prev, achievements: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="e.g., Increased membership by 40%, Organized 3 hackathons, Scored 890/1000..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowOtherForm(false)}
                className="!text-white !border-gray-600 !bg-transparent hover:!bg-gray-700 hover:!text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveOther}
                className="bg-gray-700 hover:bg-gray-600 border border-gray-600"
                disabled={!otherForm.title || !otherForm.organization || !otherForm.category}
              >
                {editingOther ? 'Update' : 'Add'} Achievement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};