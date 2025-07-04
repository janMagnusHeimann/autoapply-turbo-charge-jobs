import { 
  Home, 
  User, 
  Building2, 
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  LogOut,
  Zap,
  Globe,
  ChevronDown,
  ChevronUp,
  Briefcase,
  UserCircle,
  Target,
  FileText
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

interface NavigationSection {
  id: string;
  label: string;
  icon: any;
  items: {
    id: DashboardView;
    label: string;
    icon: any;
  }[];
}

const navigationSections: NavigationSection[] = [
  {
    id: 'profile',
    label: 'Profile',
    icon: UserCircle,
    items: [
      { id: 'profile' as DashboardView, label: 'My Profile & CV Assets', icon: User },
      { id: 'preferences' as DashboardView, label: 'Job Preferences', icon: Target }
    ]
  },
  {
    id: 'jobs',
    label: 'Job Discovery',
    icon: Briefcase,
    items: [
      { id: 'jobs' as DashboardView, label: 'My Jobs', icon: FileText },
      { id: 'agent' as DashboardView, label: 'AI Job Agent', icon: Zap },
      { id: 'companies' as DashboardView, label: 'Company Directory', icon: Building2 },
      { id: 'sources' as DashboardView, label: 'Job Sources', icon: Globe },
      { id: 'queue' as DashboardView, label: 'Review Queue', icon: Clock }
    ]
  }
];

export const Sidebar = ({ currentView, onViewChange, collapsed, onToggleCollapse }: SidebarProps) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [expandedSections, setExpandedSections] = useState<string[]>(['profile', 'jobs']);
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

  const toggleSection = (sectionId: string) => {
    if (collapsed) return; // Don't toggle when collapsed
    
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const isItemActive = (itemId: DashboardView) => currentView === itemId;

  const isSectionActive = (section: NavigationSection) => 
    section.items.some(item => isItemActive(item.id));

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
      <nav className="p-4 space-y-1">
        {/* Dashboard - always at top */}
        <button
          onClick={() => onViewChange('dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
            isItemActive('dashboard')
              ? 'bg-gray-700 text-white border-l-2 border-gray-400' 
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
          title={collapsed ? 'Dashboard' : undefined}
        >
          <Home size={20} className="flex-shrink-0" />
          {!collapsed && <span className="font-medium">Dashboard</span>}
        </button>

        {/* Dropdown Sections */}
        {navigationSections.map((section) => {
          const SectionIcon = section.icon;
          const isExpanded = expandedSections.includes(section.id);
          const hasActiveItem = isSectionActive(section);

          return (
            <div key={section.id} className="space-y-1">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                  hasActiveItem
                    ? 'bg-gray-700/50 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
                title={collapsed ? section.label : undefined}
              >
                <SectionIcon size={20} className="flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="font-medium flex-1 text-left">{section.label}</span>
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-gray-500" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-500" />
                    )}
                  </>
                )}
              </button>

              {/* Section Items */}
              {!collapsed && isExpanded && (
                <div className="ml-4 space-y-1">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    const showBadge = item.id === 'queue' && pendingCount > 0;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => onViewChange(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 relative ${
                          isItemActive(item.id)
                            ? 'bg-gray-700 text-white border-l-2 border-gray-400' 
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                      >
                        <ItemIcon size={18} className="flex-shrink-0" />
                        <span className="font-medium text-sm">{item.label}</span>
                        {showBadge && (
                          <span className="absolute right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                            {pendingCount > 99 ? '99+' : pendingCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Collapsed state - show active items */}
              {collapsed && hasActiveItem && (
                <div className="space-y-1">
                  {section.items
                    .filter(item => isItemActive(item.id))
                    .map((item) => {
                      const ItemIcon = item.icon;
                      const showBadge = item.id === 'queue' && pendingCount > 0;
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => onViewChange(item.id)}
                          className="w-full flex items-center justify-center p-3 rounded-lg bg-gray-700 text-white relative"
                          title={item.label}
                        >
                          <ItemIcon size={18} className="flex-shrink-0" />
                          {showBadge && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                              {pendingCount > 99 ? '99+' : pendingCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="absolute bottom-16 left-4 right-4">
        {/* Settings */}
        <button
          onClick={() => onViewChange('settings')}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-3 rounded-lg transition-all duration-200 mb-2 ${
            isItemActive('settings')
              ? 'bg-gray-700 text-white' 
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
          title={collapsed ? 'Settings' : undefined}
        >
          <SettingsIcon size={20} className="flex-shrink-0" />
          {!collapsed && <span className="font-medium">Settings</span>}
        </button>
      </div>

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