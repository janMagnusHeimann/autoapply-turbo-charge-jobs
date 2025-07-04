
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { ProfileAssets } from "@/components/dashboard/ProfileAssets";
import { CompanyDirectory } from "@/components/dashboard/CompanyDirectory";
import { JobSources } from "@/components/dashboard/JobSources";
import { JobPreferences } from "@/components/dashboard/JobPreferences";
import { Settings } from "@/components/dashboard/Settings";
import { ReviewQueue } from "@/components/dashboard/ReviewQueue";
import { AutomatedAgent } from "@/components/dashboard/AutomatedAgent";

export type DashboardView = 'dashboard' | 'profile' | 'companies' | 'sources' | 'preferences' | 'agent' | 'queue' | 'settings';

const Index = () => {
  const [currentView, setCurrentView] = useState<DashboardView>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardHome />;
      case 'profile':
        return <ProfileAssets />;
      case 'companies':
        return <CompanyDirectory />;
      case 'sources':
        return <JobSources />;
      case 'preferences':
        return <JobPreferences />;
      case 'agent':
        return <AutomatedAgent />;
      case 'queue':
        return <ReviewQueue />;
      case 'settings':
        return <Settings />;
      default:
        return <DashboardHome />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar 
        currentView={currentView}
        onViewChange={setCurrentView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <main className={`flex-1 transition-all duration-300 ${
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      }`}>
        <div className="p-8">
          {renderCurrentView()}
        </div>
      </main>
    </div>
  );
};

export default Index;
