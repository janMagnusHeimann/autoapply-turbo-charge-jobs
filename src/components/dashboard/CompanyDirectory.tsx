
import { useState } from "react";
import { Search, Building2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const CompanyDirectory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [excludedCompanies, setExcludedCompanies] = useState<number[]>([]);

  // Mock company data
  const companies = [
    {
      id: 1,
      name: "Vercel",
      description: "Platform for frontend developers, providing speed and reliability innovations.",
      logo: "🔺",
      techStack: ["React", "Next.js", "Node.js"],
      size: "201-500",
      location: "San Francisco, CA"
    },
    {
      id: 2,
      name: "Stripe",
      description: "Financial infrastructure for the internet. Payment processing for online businesses.",
      logo: "💳",
      techStack: ["Ruby", "JavaScript", "Go"],
      size: "1001-5000",
      location: "San Francisco, CA"
    },
    {
      id: 3,
      name: "Anthropic",
      description: "AI safety company developing safe, beneficial, and understandable AI systems.",
      logo: "🤖",
      techStack: ["Python", "PyTorch", "Rust"],
      size: "51-200",
      location: "San Francisco, CA"
    },
    {
      id: 4,
      name: "Linear",
      description: "Issue tracking tool designed for high-performance teams building software.",
      logo: "📐",
      techStack: ["TypeScript", "React", "GraphQL"],
      size: "11-50",
      location: "San Francisco, CA"
    },
    {
      id: 5,
      name: "Supabase",
      description: "Open source Firebase alternative with a Postgres database.",
      logo: "⚡",
      techStack: ["TypeScript", "PostgreSQL", "Elixir"],
      size: "51-200",
      location: "Singapore"
    },
    {
      id: 6,
      name: "Notion",
      description: "All-in-one workspace for notes, docs, wikis, and project management.",
      logo: "📝",
      techStack: ["React", "Node.js", "Swift"],
      size: "201-500",
      location: "San Francisco, CA"
    }
  ];

  const filteredCompanies = companies.filter(company => 
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.techStack.some(tech => tech.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleExcludeCompany = (companyId: number) => {
    setExcludedCompanies(prev => [...prev, companyId]);
  };

  const handleIncludeCompany = (companyId: number) => {
    setExcludedCompanies(prev => prev.filter(id => id !== companyId));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Company Directory</h1>
        <p className="text-gray-400">
          Browse and manage companies for job applications
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search companies, technologies, or descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* Excluded Companies Alert */}
      {excludedCompanies.length > 0 && (
        <Card className="bg-red-900/20 border-red-800">
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
                      className="ml-1 hover:bg-red-600 rounded-full p-0.5"
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
                      {company.logo}
                    </div>
                    <div>
                      <CardTitle className="text-white text-lg">{company.name}</CardTitle>
                      <p className="text-sm text-gray-400">{company.size} employees</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300 text-sm leading-relaxed">
                  {company.description}
                </p>
                
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-medium">Tech Stack</p>
                  <div className="flex flex-wrap gap-1">
                    {company.techStack.map((tech) => (
                      <Badge key={tech} variant="secondary" className="text-xs">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-gray-400">📍 {company.location}</span>
                  
                  {isExcluded ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleIncludeCompany(company.id)}
                      className="text-green-400 border-green-400 hover:bg-green-400/10"
                    >
                      Include
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleExcludeCompany(company.id)}
                    >
                      Exclude
                    </Button>
                  )}
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
    </div>
  );
};
