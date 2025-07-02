import { useState, useEffect } from "react";
import { CheckCircle, Circle, DollarSign, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { GitHubService } from "@/services/githubService";
import { GoogleScholarService } from "@/services/googleScholarService";
import { supabase } from "@/integrations/supabase/client";

interface QuickStartItem {
  id: number;
  label: string;
  completed: boolean;
  loading?: boolean;
}

interface DashboardStats {
  jobsInPipeline: number;
  companiesCount: number;
  applicationsThisWeek: number;
}

export const DashboardHome = () => {
  const { user, userPreferences } = useAuth();
  const [quickStartItems, setQuickStartItems] = useState<QuickStartItem[]>([
    { id: 1, label: "Connect GitHub Account", completed: false, loading: true },
    { id: 2, label: "Connect Google Scholar", completed: false, loading: true },
    { id: 3, label: "Set Job Preferences", completed: false, loading: true },
    { id: 4, label: "Connect Job Sources", completed: false, loading: true },
    { id: 5, label: "Configure Automation Settings", completed: false, loading: true },
  ]);

  const [statusLoading, setStatusLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    jobsInPipeline: 0,
    companiesCount: 0,
    applicationsThisWeek: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Fetch all data in parallel
        const [
          isGitHubConnected,
          isScholarConnected,
          jobSourcesResult,
          jobListingsResult,
          companiesResult,
          applicationsResult,
        ] = await Promise.all([
          GitHubService.isGitHubConnected(user.id),
          GoogleScholarService.isScholarConnected(user.id),
          supabase.from('job_sources').select('id').limit(1),
          supabase.from('job_listings').select('id', { count: 'exact', head: true }),
          supabase.from('companies').select('id', { count: 'exact', head: true }),
          supabase
            .from('application_history')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('submitted_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        ]);

        // Check if job preferences are set up (has meaningful data)
        const hasJobPreferences = userPreferences && (
          (userPreferences.preferred_job_types && userPreferences.preferred_job_types.length > 0) ||
          (userPreferences.preferred_locations && userPreferences.preferred_locations.length > 0) ||
          (userPreferences.skills && userPreferences.skills.length > 0) ||
          userPreferences.min_salary !== null ||
          userPreferences.max_salary !== null
        );

        // Check if user has configured any job sources
        const hasJobSources = jobSourcesResult.data && jobSourcesResult.data.length > 0;

        // Check if automation settings are configured 
        const hasAutomationSettings = hasJobPreferences;

        // Update the status of each item
        setQuickStartItems([
          { id: 1, label: "Connect GitHub Account", completed: isGitHubConnected, loading: false },
          { id: 2, label: "Connect Google Scholar", completed: isScholarConnected, loading: false },
          { id: 3, label: "Set Job Preferences", completed: !!hasJobPreferences, loading: false },
          { id: 4, label: "Connect Job Sources", completed: !!hasJobSources, loading: false },
          { id: 5, label: "Configure Automation Settings", completed: !!hasAutomationSettings, loading: false },
        ]);

        // Update dashboard stats with real data
        setDashboardStats({
          jobsInPipeline: jobListingsResult.count || 0,
          companiesCount: companiesResult.count || 0,
          applicationsThisWeek: applicationsResult.count || 0
        });

      } catch (error) {
        console.error('Error checking integration statuses:', error);
        // Set all to not loading and keep false status
        setQuickStartItems(items => items.map(item => ({ ...item, loading: false })));
      } finally {
        setStatusLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, userPreferences]);

  const completedCount = quickStartItems.filter(item => item.completed).length;
  const progressPercentage = (completedCount / quickStartItems.length) * 100;

  const stats = [
    {
      title: "Applications This Week",
      value: dashboardStats.applicationsThisWeek.toString(),
      icon: TrendingUp,
      change: dashboardStats.applicationsThisWeek > 0 
        ? `+${dashboardStats.applicationsThisWeek} this week` 
        : "No applications yet"
    },
    {
      title: "Companies in Company Directory",
      value: dashboardStats.companiesCount.toString(),
      icon: Users,
      change: `${dashboardStats.jobsInPipeline} jobs discovered`
    },
    {
      title: "Estimated Weekly Cost",
      value: "$0.00",
      icon: DollarSign,
      change: "Based on current settings"
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Welcome to AutoApply</h1>
        <p className="text-gray-400">
          Your intelligent job application automation dashboard
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Start Checklist */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Quick Start Checklist</CardTitle>
          <p className="text-sm text-gray-400">
            Complete these steps to get your automation running
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-400">Progress</span>
            <span className="text-sm text-gray-400">
              {statusLoading ? "Checking..." : `${completedCount}/${quickStartItems.length} completed`}
            </span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="mb-6 bg-gray-700 [&>div]:bg-green-500" 
          />
          
          <div className="space-y-3">
            {quickStartItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                {item.loading ? (
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                ) : item.completed ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400" />
                )}
                <span className={`${item.completed ? 'text-green-300' : 'text-gray-300'} ${item.completed ? 'line-through' : ''}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
