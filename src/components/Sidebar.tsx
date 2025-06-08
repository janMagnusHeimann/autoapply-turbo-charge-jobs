
import { 
  Home, 
  User, 
  Building2, 
  Target, 
  FileText, 
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  LogOut,
  Zap,
  Globe
} from "lucide-react";
import { DashboardView } from "@/pages/Index";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const navigationItems = [
  { id: 'dashboard' as DashboardView, label: 'Dashboard', icon: Home },
  { id: 'profile' as DashboardView, label: 'My Profile & CV Assets', icon: User },
  { id: 'companies' as DashboardView, label: 'Company Directory', icon: Building2 },
  { id: 'sources' as DashboardView, label: 'Job Sources', icon: Globe },
  { id: 'preferences' as DashboardView, label: 'Job Preferences', icon: Target },
  { id: 'agent' as DashboardView, label: 'AI Job Agent', icon: Zap },
  { id: 'queue' as DashboardView, label: 'Review Queue', icon: Clock },
  { id: 'history' as DashboardView, label: 'Application History', icon: FileText },
  { id: 'settings' as DashboardView, label: 'Settings', icon: SettingsIcon },
];

export const Sidebar = ({ currentView, onViewChange, collapsed, onToggleCollapse }: SidebarProps) => {
  const [pendingCount, setPendingCount] = useState(0);
  const { user, signOut } = useAuth();

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const { data, error } = await supabase
          .from('pending_applications')
          .select('id', { count: 'exact' });
        
        if (!error && data) {
          setPendingCount(data.length);
        }
      } catch (error) {
        console.error('Error fetching pending count:', error);
      }
    };

    fetchPendingCount();

    // Set up real-time subscription for pending applications
    const channel = supabase
      .channel('pending_applications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pending_applications'
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className={`fixed left-0 top-0 h-full bg-gray-900 border-r border-gray-800 transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold text-white">AutoApply</h1>
              {user && (
                <p className="text-sm text-gray-400 mt-1">{user.email}</p>
              )}
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const showBadge = item.id === 'queue' && pendingCount > 0;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 relative ${
                isActive 
                  ? 'bg-gray-700 text-white border-l-2 border-gray-400' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} className="flex-shrink-0" />
              {!collapsed && (
                <span className="font-medium">{item.label}</span>
              )}
              {showBadge && (
                <span className={`absolute ${collapsed ? '-top-1 -right-1' : 'right-2'} bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold`}>
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sign Out Button */}
      <div className="absolute bottom-4 left-4 right-4">
        <Button
          onClick={signOut}
          variant="ghost"
          className={`w-full text-gray-400 hover:text-white hover:bg-gray-800 ${
            collapsed ? 'px-2' : 'px-3'
          }`}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut size={20} className="flex-shrink-0" />
          {!collapsed && <span className="ml-3">Sign Out</span>}
        </Button>
      </div>
    </div>
  );
};
