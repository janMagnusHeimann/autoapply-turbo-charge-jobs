
import { 
  Home, 
  User, 
  Building2, 
  Target, 
  FileText, 
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { DashboardView } from "@/pages/Index";

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
  { id: 'preferences' as DashboardView, label: 'Job Preferences', icon: Target },
  { id: 'history' as DashboardView, label: 'Application History', icon: FileText },
  { id: 'settings' as DashboardView, label: 'Settings', icon: SettingsIcon },
];

export const Sidebar = ({ currentView, onViewChange, collapsed, onToggleCollapse }: SidebarProps) => {
  return (
    <div className={`fixed left-0 top-0 h-full bg-gray-900 border-r border-gray-800 transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <h1 className="text-xl font-bold text-white">AutoApply</h1>
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
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} className="flex-shrink-0" />
              {!collapsed && (
                <span className="font-medium">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
