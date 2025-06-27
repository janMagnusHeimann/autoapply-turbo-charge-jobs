import { useState } from "react";
import { Search, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Import the OpenAI service
import { openaiJobDiscoveryService, type JobSearchResult, type UserPreferences } from "@/services/openaiJobDiscoveryService";

export const OpenAIJobSearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [searchResult, setSearchResult] = useState<JobSearchResult | null>(null);

  // Default user preferences for demo
  const defaultUserPrefs: UserPreferences = {
    skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python'],
    experience_years: 5,
    experience_level: 'senior',
    desired_roles: ['Senior Software Engineer', 'Full Stack Developer', 'Frontend Developer'],
    locations: ['Remote', 'Berlin', 'Munich'],
    job_types: ['remote', 'hybrid'],
    willing_to_relocate: false,
    salary_min: 70000,
    salary_max: 95000,
    salary_currency: 'EUR',
    accepts_equity: true,
    company_sizes: ['startup', 'scaleup', 'enterprise'],
    industries: ['Technology', 'Software', 'Fintech'],
    technologies_to_avoid: [],
    skill_weight: 0.35,
    location_weight: 0.20,
    salary_weight: 0.25,
    experience_weight: 0.10,
    culture_weight: 0.10
  };

  const handleSearch = async () => {
    if (!companyName.trim()) {
      toast.error("Please enter a company name");
      return;
    }

    setIsSearching(true);
    setSearchResult(null);

    try {
      console.log('🔍 Starting OpenAI job search for:', companyName);
      
      const result = await openaiJobDiscoveryService.searchSingleCompany(
        companyName,
        companyWebsite || `https://${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
        defaultUserPrefs,
        10,
        true
      );

      console.log('✅ OpenAI search completed:', result);
      setSearchResult(result);

      if (result.total_jobs_found > 0) {
        toast.success(
          `Found ${result.total_jobs_found} jobs at ${companyName}`,
          {
            description: `${result.top_matches.length} jobs match your preferences`
          }
        );
      } else {
        toast.info(`No jobs found at ${companyName}`, {
          description: "Try adjusting your search criteria or check the company website"
        });
      }

    } catch (error) {
      console.error('❌ OpenAI search failed:', error);
      toast.error("Search failed", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const formatMatchScore = (score: number): { text: string; color: string } => {
    if (score >= 80) return { text: `Excellent (${score.toFixed(0)}%)`, color: 'bg-green-500' };
    if (score >= 60) return { text: `Good (${score.toFixed(0)}%)`, color: 'bg-yellow-500' };
    if (score >= 40) return { text: `Fair (${score.toFixed(0)}%)`, color: 'bg-orange-500' };
    return { text: `Poor (${score.toFixed(0)}%)`, color: 'bg-red-500' };
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">OpenAI Job Search</h2>
        <p className="text-gray-400">
          Direct search using OpenAI web search capabilities
        </p>
      </div>

      {/* Search Form */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Search className="w-5 h-5" />
            Company Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Company Name *</label>
              <Input
                placeholder="e.g., Google, Microsoft, Spotify"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Company Website (optional)</label>
              <Input
                placeholder="e.g., https://company.com"
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          <Button
            onClick={handleSearch}
            disabled={isSearching || !companyName.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search Jobs
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResult && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              {searchResult.total_jobs_found > 0 ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-400" />
              )}
              Search Results for {searchResult.company}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-2xl font-bold text-white">{searchResult.total_jobs_found}</div>
                <div className="text-gray-400 text-sm">Total Jobs Found</div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-400">{searchResult.top_matches.length}</div>
                <div className="text-gray-400 text-sm">Matching Jobs</div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-400">{searchResult.average_match_score.toFixed(0)}%</div>
                <div className="text-gray-400 text-sm">Avg Match Score</div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-400">{searchResult.search_duration_seconds.toFixed(1)}s</div>
                <div className="text-gray-400 text-sm">Search Duration</div>
              </div>
            </div>

            {/* Search Queries Used */}
            {searchResult.search_queries_used.length > 0 && (
              <div>
                <h4 className="text-white font-semibold mb-2">Search Queries Used</h4>
                <div className="flex flex-wrap gap-2">
                  {searchResult.search_queries_used.map((query, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {query}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Job Matches */}
            {searchResult.top_matches.length > 0 && (
              <div>
                <h4 className="text-white font-semibold mb-4">Job Matches</h4>
                <div className="space-y-4">
                  {searchResult.top_matches.map((rankedJob, index) => {
                    const matchInfo = formatMatchScore(rankedJob.match_score);
                    
                    return (
                      <div key={index} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h5 className="text-white font-semibold text-lg">{rankedJob.job.title}</h5>
                            <p className="text-gray-400 text-sm">
                              {rankedJob.job.company} • {rankedJob.job.location}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${matchInfo.color} text-white`}>
                              {matchInfo.text}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {rankedJob.recommendation}
                            </Badge>
                          </div>
                        </div>

                        {rankedJob.job.description && (
                          <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                            {rankedJob.job.description}
                          </p>
                        )}

                        {/* Matching Skills */}
                        {rankedJob.matching_skills.length > 0 && (
                          <div className="mb-3">
                            <span className="text-gray-400 text-xs">Matching Skills: </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {rankedJob.matching_skills.map((skill, skillIndex) => (
                                <Badge key={skillIndex} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Match Explanation */}
                        {rankedJob.match_explanation && (
                          <p className="text-gray-400 text-xs italic">
                            {rankedJob.match_explanation}
                          </p>
                        )}

                        {/* Apply Button */}
                        {rankedJob.job.application_url && (
                          <div className="mt-3 pt-3 border-t border-gray-700">
                            <Button
                              size="sm"
                              onClick={() => window.open(rankedJob.job.application_url, '_blank')}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Apply Now
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No Results Message */}
            {searchResult.total_jobs_found === 0 && (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <h4 className="text-white font-semibold mb-2">No Jobs Found</h4>
                <p className="text-gray-400 text-sm">
                  We couldn't find any job listings for {searchResult.company}. 
                  Try checking the company website directly or refining your search.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};