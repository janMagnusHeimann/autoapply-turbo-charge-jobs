
import { useState } from "react";
import { Github, GraduationCap, ExternalLink, Plus, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export const ProfileAssets = () => {
  const [githubConnected, setGithubConnected] = useState(false);
  const [scholarConnected, setScholarConnected] = useState(false);
  const [editingAchievements, setEditingAchievements] = useState<number | null>(null);
  const [tempAchievements, setTempAchievements] = useState("");

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
      venue: "ICML 2023",
      citations: 12,
      enabled: true,
      keyAchievements: "Novel NAS method reducing search time by 60% while maintaining 95% accuracy on ImageNet."
    },
    {
      id: 2,
      title: "Scalable Distributed Training of Deep Neural Networks",
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

  const handleSaveAchievements = (id: number, type: 'repo' | 'pub') => {
    if (type === 'repo') {
      setRepositories(prev => prev.map(repo => 
        repo.id === id ? { ...repo, keyAchievements: tempAchievements } : repo
      ));
    } else {
      setPublications(prev => prev.map(pub => 
        pub.id === id ? { ...pub, keyAchievements: tempAchievements } : pub
      ));
    }
    setEditingAchievements(null);
    setTempAchievements("");
  };

  const handleEditAchievements = (id: number, currentAchievements: string) => {
    setEditingAchievements(id);
    setTempAchievements(currentAchievements);
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
              Select repositories to include in CV generation and add key achievements
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
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {repo.description}
                  </p>
                  
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 font-medium">Tech Stack</p>
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
                      <Label className="text-sm font-medium text-white">Key Achievements:</Label>
                      <p className="text-sm text-gray-300 mt-1">{repo.keyAchievements}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditAchievements(repo.id, repo.keyAchievements)}
                          className="border-gray-700 text-white hover:bg-gray-800"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          {repo.keyAchievements ? 'Edit' : 'Add'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-900 border-gray-800">
                        <DialogHeader>
                          <DialogTitle className="text-white">Key Achievements for {repo.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="achievements" className="text-white">Describe your key achievements for this project:</Label>
                            <Textarea
                              id="achievements"
                              placeholder="e.g., Improved performance by 40%, Deployed to production serving 1000+ users..."
                              value={tempAchievements}
                              onChange={(e) => setTempAchievements(e.target.value)}
                              className="mt-2 bg-gray-800 border-gray-700 text-white"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setEditingAchievements(null)} className="border-gray-700 text-white hover:bg-gray-800">
                              Cancel
                            </Button>
                            <Button onClick={() => handleSaveAchievements(repo.id, 'repo')} className="bg-blue-600 hover:bg-blue-700">
                              Save
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <div className="flex items-center gap-2">
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
              Select publications to include in CV generation and add key achievements
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
                    <p className="text-xs text-gray-400 font-medium">Venue</p>
                    <Badge variant="secondary" className="text-xs">
                      {pub.venue}
                    </Badge>
                  </div>

                  {pub.keyAchievements && (
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <Label className="text-sm font-medium text-white">Key Achievements:</Label>
                      <p className="text-sm text-gray-300 mt-1">{pub.keyAchievements}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditAchievements(pub.id, pub.keyAchievements)}
                          className="border-gray-700 text-white hover:bg-gray-800"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          {pub.keyAchievements ? 'Edit' : 'Add'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-900 border-gray-800">
                        <DialogHeader>
                          <DialogTitle className="text-white">Key Achievements for {pub.title}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="pub-achievements" className="text-white">Describe the key contributions and impact:</Label>
                            <Textarea
                              id="pub-achievements"
                              placeholder="e.g., Novel algorithm reducing computation time by 50%, Cited by major industry papers..."
                              value={tempAchievements}
                              onChange={(e) => setTempAchievements(e.target.value)}
                              className="mt-2 bg-gray-800 border-gray-700 text-white"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setEditingAchievements(null)} className="border-gray-700 text-white hover:bg-gray-800">
                              Cancel
                            </Button>
                            <Button onClick={() => handleSaveAchievements(pub.id, 'pub')} className="bg-blue-600 hover:bg-blue-700">
                              Save
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <div className="flex items-center gap-2">
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
    </div>
  );
};
