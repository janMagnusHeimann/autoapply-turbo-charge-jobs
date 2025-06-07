
import { useState } from "react";
import { Github, GraduationCap, ExternalLink, Plus, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export const ProfileAssets = () => {
  const [githubConnected, setGithubConnected] = useState(false);
  const [scholarConnected, setScholarConnected] = useState(false);
  const [editingField, setEditingField] = useState<{ id: number; field: string; type: 'repo' | 'pub' } | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [tempTechStack, setTempTechStack] = useState<string[]>([]);

  // Mock data for repositories with key achievements
  const [repositories, setRepositories] = useState([
    {
      id: 1,
      name: "ml-recommendation-engine",
      description: "Machine learning recommendation system built with Python and TensorFlow",
      languages: ["Python", "TensorFlow", "Jupyter"],
      stars: 45,
      enabled: true,
      keyAchievements: "Improved recommendation accuracy by 35% using collaborative filtering. Deployed to production serving 10,000+ daily users."
    },
    {
      id: 2,
      name: "react-dashboard-framework",
      description: "Reusable React components for building dashboards",
      languages: ["TypeScript", "React", "Tailwind"],
      stars: 23,
      enabled: false,
      keyAchievements: ""
    },
    {
      id: 3,
      name: "distributed-systems-lab",
      description: "Implementation of various distributed system algorithms",
      languages: ["Go", "Docker", "Kubernetes"],
      stars: 67,
      enabled: true,
      keyAchievements: "Implemented Raft consensus algorithm achieving 99.9% availability. Reduced latency by 40% through optimized networking."
    }
  ]);

  // Mock data for publications with key achievements
  const [publications, setPublications] = useState([
    {
      id: 1,
      title: "Efficient Neural Architecture Search for Computer Vision",
      description: "Novel approach to neural architecture search reducing computational overhead while maintaining accuracy",
      venue: "ICML 2023",
      citations: 12,
      enabled: true,
      keyAchievements: "Novel NAS method reducing search time by 60% while maintaining 95% accuracy on ImageNet."
    },
    {
      id: 2,
      title: "Scalable Distributed Training of Deep Neural Networks",
      description: "Framework for distributed training of large neural networks across multiple nodes",
      venue: "NeurIPS 2022",
      citations: 28,
      enabled: true,
      keyAchievements: "Breakthrough distributed training technique enabling 8x faster training on large-scale datasets."
    }
  ]);

  const handleToggleRepository = (id: number) => {
    setRepositories(prev => prev.map(repo => 
      repo.id === id ? { ...repo, enabled: !repo.enabled } : repo
    ));
    console.log(`Toggling repository ${id}`);
  };

  const handleTogglePublication = (id: number) => {
    setPublications(prev => prev.map(pub => 
      pub.id === id ? { ...pub, enabled: !pub.enabled } : pub
    ));
    console.log(`Toggling publication ${id}`);
  };

  const handleSaveField = () => {
    if (!editingField) return;

    const { id, field, type } = editingField;

    if (type === 'repo') {
      setRepositories(prev => prev.map(repo => {
        if (repo.id === id) {
          if (field === 'languages') {
            return { ...repo, languages: tempTechStack };
          } else {
            return { ...repo, [field]: tempValue };
          }
        }
        return repo;
      }));
    } else {
      setPublications(prev => prev.map(pub => 
        pub.id === id ? { ...pub, [field]: tempValue } : pub
      ));
    }
    
    setEditingField(null);
    setTempValue("");
    setTempTechStack([]);
  };

  const handleEditField = (id: number, field: string, currentValue: string | string[], type: 'repo' | 'pub') => {
    setEditingField({ id, field, type });
    if (field === 'languages' && Array.isArray(currentValue)) {
      setTempTechStack(currentValue);
      setTempValue("");
    } else {
      setTempValue(currentValue as string);
      setTempTechStack([]);
    }
  };

  const addTechStackItem = () => {
    if (tempValue.trim() && !tempTechStack.includes(tempValue.trim())) {
      setTempTechStack(prev => [...prev, tempValue.trim()]);
      setTempValue("");
    }
  };

  const removeTechStackItem = (item: string) => {
    setTempTechStack(prev => prev.filter(tech => tech !== item));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">My Profile & CV Assets</h1>
        <p className="text-gray-400">
          Connect your accounts and manage your professional assets
        </p>
      </div>

      {/* Account Connections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Github className="w-5 h-5" />
              GitHub Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {githubConnected ? (
              <div className="space-y-2">
                <p className="text-green-400 text-sm">✓ Connected as @johndoe</p>
                <Button variant="outline" size="sm" className="w-full border-gray-700 text-white hover:bg-gray-800">
                  Refresh Repositories
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-400 text-sm">Connect to import your repositories</p>
                <Button 
                  onClick={() => setGithubConnected(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Github className="w-4 h-4 mr-2" />
                  Connect GitHub
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <GraduationCap className="w-5 h-5" />
              Google Scholar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {scholarConnected ? (
              <div className="space-y-2">
                <p className="text-green-400 text-sm">✓ Connected</p>
                <Button variant="outline" size="sm" className="w-full border-gray-700 text-white hover:bg-gray-800">
                  Refresh Publications
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-400 text-sm">Connect to import your publications</p>
                <Button 
                  onClick={() => setScholarConnected(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Connect Scholar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Repositories Section */}
      {githubConnected && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">My Repositories</h2>
            <p className="text-gray-400">
              Select repositories to include in CV generation and customize their details
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {repositories.map((repo) => (
              <Card 
                key={repo.id} 
                className={`transition-all duration-200 hover:scale-105 ${
                  repo.enabled 
                    ? 'bg-gray-900 border-gray-800 hover:border-gray-600' 
                    : 'bg-gray-800/50 border-gray-700 opacity-50'
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                        <Github className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                          {repo.name}
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </CardTitle>
                        <p className="text-sm text-gray-400">⭐ {repo.stars} stars</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400 font-medium">Description</p>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditField(repo.id, 'description', repo.description, 'repo')}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {repo.description}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400 font-medium">Tech Stack</p>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditField(repo.id, 'languages', repo.languages, 'repo')}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {repo.languages.map((lang) => (
                        <Badge key={lang} variant="secondary" className="text-xs">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {repo.keyAchievements && (
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-sm font-medium text-white">Key Achievements:</Label>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditField(repo.id, 'keyAchievements', repo.keyAchievements, 'repo')}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-300">{repo.keyAchievements}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    {!repo.keyAchievements && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditField(repo.id, 'keyAchievements', '', 'repo')}
                        className="border-gray-700 text-white hover:bg-gray-800"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Achievements
                      </Button>
                    )}
                    
                    <div className="flex items-center gap-2 ml-auto">
                      <label className="text-sm text-gray-400">Use for CV</label>
                      <Switch
                        checked={repo.enabled}
                        onCheckedChange={() => handleToggleRepository(repo.id)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Publications Section */}
      {scholarConnected && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">My Publications</h2>
            <p className="text-gray-400">
              Select publications to include in CV generation and customize their details
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publications.map((pub) => (
              <Card 
                key={pub.id} 
                className={`transition-all duration-200 hover:scale-105 ${
                  pub.enabled 
                    ? 'bg-gray-900 border-gray-800 hover:border-gray-600' 
                    : 'bg-gray-800/50 border-gray-700 opacity-50'
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-lg">{pub.title}</CardTitle>
                        <p className="text-sm text-gray-400">📝 {pub.citations} citations</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400 font-medium">Description</p>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditField(pub.id, 'description', pub.description, 'pub')}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {pub.description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 font-medium">Venue</p>
                    <Badge variant="secondary" className="text-xs">
                      {pub.venue}
                    </Badge>
                  </div>

                  {pub.keyAchievements && (
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-sm font-medium text-white">Key Achievements:</Label>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditField(pub.id, 'keyAchievements', pub.keyAchievements, 'pub')}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-300">{pub.keyAchievements}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    {!pub.keyAchievements && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditField(pub.id, 'keyAchievements', '', 'pub')}
                        className="border-gray-700 text-white hover:bg-gray-800"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Achievements
                      </Button>
                    )}
                    
                    <div className="flex items-center gap-2 ml-auto">
                      <label className="text-sm text-gray-400">Use for CV</label>
                      <Switch
                        checked={pub.enabled}
                        onCheckedChange={() => handleTogglePublication(pub.id)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingField} onOpenChange={() => setEditingField(null)}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">
              Edit {editingField?.field === 'keyAchievements' ? 'Key Achievements' : 
                   editingField?.field === 'description' ? 'Description' : 'Tech Stack'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editingField?.field === 'languages' ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tech-input" className="text-white">Add Technology:</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="tech-input"
                      placeholder="e.g., React, Python, Docker..."
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTechStackItem()}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                    <Button onClick={addTechStackItem} className="bg-blue-600 hover:bg-blue-700">
                      Add
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-white">Current Tech Stack:</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tempTechStack.map((tech) => (
                      <Badge 
                        key={tech} 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-red-600"
                        onClick={() => removeTechStackItem(tech)}
                      >
                        {tech} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="edit-field" className="text-white">
                  {editingField?.field === 'keyAchievements' ? 'Key Achievements:' : 'Description:'}
                </Label>
                <Textarea
                  id="edit-field"
                  placeholder={
                    editingField?.field === 'keyAchievements' 
                      ? "e.g., Improved performance by 40%, Deployed to production serving 1000+ users..."
                      : "Describe this project or publication..."
                  }
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  className="mt-2 bg-gray-800 border-gray-700 text-white"
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingField(null)} className="border-gray-700 text-white hover:bg-gray-800">
                Cancel
              </Button>
              <Button onClick={handleSaveField} className="bg-blue-600 hover:bg-blue-700">
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
