
import { CheckCircle, Circle, DollarSign, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const DashboardHome = () => {
  const quickStartItems = [
    { id: 1, label: "Connect GitHub Account", completed: false },
    { id: 2, label: "Connect Google Scholar", completed: false },
    { id: 3, label: "Set Job Preferences", completed: false },
    { id: 4, label: "Review Company Directory", completed: false },
    { id: 5, label: "Configure Automation Settings", completed: false },
  ];

  const stats = [
    {
      title: "Applications This Week",
      value: "0",
      icon: TrendingUp,
      change: "+0% from last week"
    },
    {
      title: "Potential Jobs in Pipeline",
      value: "247",
      icon: Users,
      change: "Across 23 companies"
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
            <span className="text-sm text-gray-400">0/5 completed</span>
          </div>
          <Progress value={0} className="mb-6" />
          
          <div className="space-y-3">
            {quickStartItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                {item.completed ? (
                  <CheckCircle className="w-5 h-5 text-gray-400" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400" />
                )}
                <span className={`${item.completed ? 'text-white line-through' : 'text-gray-300'}`}>
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
