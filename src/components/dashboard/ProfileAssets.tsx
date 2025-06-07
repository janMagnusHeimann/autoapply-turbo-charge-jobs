
import { useState } from "react";
import { Github, GraduationCap, ExternalLink, Toggle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export const ProfileAssets = () => {
  const [githubConnected, setGithubConnected] = useState(false);
  const [scholarConnected, setScholarConnected] = useState(false);

  // Mock data for repositories
  const repositories = [
    {
      id: 1,
      name: "ml-recommendation-engine",
      description: "Machine learning recommendation system built with Python and TensorFlow",
      languages: ["Python", "TensorFlow", "Jupyter"],
      stars: 45,
      enabled: true
    },
    {
      id: 2,
      name: "react-dashboard-framework",
      description: "Reusable React components for building dashboards",
      languages: ["TypeScript", "React", "Tailwind"],
      stars: 23,
      enabled: false
    },
    {
      id: 3,
      name: "distributed-systems-lab",
      description: "Implementation of various distributed system algorithms",
      languages: ["Go", "Docker", "Kubernetes"],
      stars: 67,
      enabled: true
    }
  ];

  // Mock data for publications
  const publications = [
    {
      id: 1,
      title: "Efficient Neural Architecture Search for Computer Vision",
      venue: "ICML 2023",
      citations: 12,
      enabled: true
    },
    {
      id: 2,
      title: "Scalable Distributed Training of Deep Neural Networks",
      venue: "NeurIPS 2022",
      citations: 28,
      enabled: true
    }
  ];

  const handleToggleRepository = (id: number) => {
    // Toggle repository enabled state
    console.log(`Toggling repository ${id}`);
  };

  const handleTogglePublication = (id: number) => {
    // Toggle publication enabled state
    console.log(`Toggling publication ${id}`);
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
                <Button variant="outline" size="sm" className="w-full">
                  Refresh Repositories
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-400 text-sm">Connect to import your repositories</p>
                <Button 
                  onClick={() => setGithubConnected(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
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
                <Button variant="outline" size="sm" className="w-full">
                  Refresh Publications
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-400 text-sm">Connect to import your publications</p>
                <Button 
                  onClick={() => setScholarConnected(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
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
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">My Repositories</CardTitle>
            <p className="text-sm text-gray-400">
              Select repositories to include in CV generation
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {repositories.map((repo) => (
              <div key={repo.id} className="p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-white">{repo.name}</h3>
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-400">⭐ {repo.stars}</span>
                    </div>
                    <p className="text-gray-400 text-sm mb-3">{repo.description}</p>
                    <div className="flex gap-2">
                      {repo.languages.map((lang) => (
                        <Badge key={lang} variant="secondary" className="text-xs">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <label className="text-sm text-gray-400">Use for CV</label>
                    <Switch
                      checked={repo.enabled}
                      onCheckedChange={() => handleToggleRepository(repo.id)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Publications Section */}
      {scholarConnected && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">My Publications</CardTitle>
            <p className="text-sm text-gray-400">
              Select publications to include in CV generation
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {publications.map((pub) => (
              <div key={pub.id} className="p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-2">{pub.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>{pub.venue}</span>
                      <span>📝 {pub.citations} citations</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <label className="text-sm text-gray-400">Use for CV</label>
                    <Switch
                      checked={pub.enabled}
                      onCheckedChange={() => handleTogglePublication(pub.id)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
