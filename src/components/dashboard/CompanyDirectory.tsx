
import { useState, useEffect } from "react";
import { Search, Building2, X, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UserService } from "@/services/userService";
import { toast } from "sonner";

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

  const excludedCompanies = userPreferences?.excluded_companies || [];

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
          setCompanies(data);
        } else {
          // No companies in database, use demo data
          setCompanies(getDemoCompanies());
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
      id: 'demo-1',
      name: 'TechFlow Solutions',
      description: 'Leading provider of cloud infrastructure and DevOps solutions',
      industry: 'Technology',
      size_category: 'medium',
      website_url: 'https://techflow.com',
      headquarters: 'San Francisco, CA',
      founded_year: 2018
    },
    {
      id: 'demo-2',
      name: 'DataVision Analytics',
      description: 'AI-powered business intelligence and data analytics platform',
      industry: 'Data & Analytics',
      size_category: 'startup',
      website_url: 'https://datavision.com',
      headquarters: 'Austin, TX',
      founded_year: 2020
    },
    {
      id: 'demo-3',
      name: 'GreenTech Innovations',
      description: 'Sustainable technology solutions for renewable energy',
      industry: 'Clean Energy',
      size_category: 'small',
      website_url: 'https://greentech.com',
      headquarters: 'Seattle, WA',
      founded_year: 2019
    },
    {
      id: 'demo-4',
      name: 'FinanceCore Systems',
      description: 'Enterprise financial software and banking solutions',
      industry: 'Fintech',
      size_category: 'large',
      website_url: 'https://financecore.com',
      headquarters: 'New York, NY',
      founded_year: 2015
    },
    {
      id: 'demo-5',
      name: 'HealthTech Partners',
      description: 'Digital health platforms and medical device software',
      industry: 'Healthcare',
      size_category: 'medium',
      website_url: 'https://healthtech.com',
      headquarters: 'Boston, MA',
      founded_year: 2017
    },
    {
      id: 'demo-6',
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
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Company Directory</h1>
        <p className="text-gray-400">
          Browse and manage companies for job applications
        </p>
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
                  
                  {isExcluded ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleIncludeCompany(company.id)}
                      disabled={updating === company.id}
                      className="text-green-400 border-green-400 hover:bg-green-400/10"
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
