# Component Architecture Documentation

## Overview
This document describes the React component architecture for the AutoApply application, including component organization, data flow, and integration patterns.

## Architecture Principles

### 1. Component Hierarchy
```
App
├── AuthProvider (Context)
├── ProtectedRoute
└── Dashboard
    ├── Sidebar
    └── Main Content
        ├── DashboardHome
        ├── ProfileAssets
        ├── CompanyDirectory
        ├── JobPreferences
        ├── ReviewQueue
        ├── ApplicationHistory
        └── Settings
```

### 2. Design Patterns
- **Container/Presentation Pattern**: Separate data logic from UI logic
- **Custom Hooks**: Reusable state logic across components
- **Context Pattern**: Global state for authentication and user data
- **Service Layer**: Abstracted database operations

### 3. State Management Strategy
- **Local State**: Component-specific state (forms, UI toggles)
- **Context State**: User authentication and profile data
- **Server State**: Database-synchronized data with loading/error states

## Core Components

### 1. App Component (`src/App.tsx`)

#### Purpose
- Application root with providers and routing setup
- Wraps app with necessary context providers

#### Structure
```typescript
const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);
```

#### Key Features
- React Query for server state management
- Toast notifications (dual system: radix + sonner)
- Tooltip provider for enhanced UX
- Protected routing

### 2. Dashboard Index (`src/pages/Index.tsx`)

#### Purpose
- Main dashboard layout and view management
- Sidebar integration and responsive design

#### State Management
```typescript
export type DashboardView = 
  | 'dashboard' 
  | 'profile' 
  | 'companies' 
  | 'preferences' 
  | 'queue' 
  | 'history' 
  | 'settings';

const [currentView, setCurrentView] = useState<DashboardView>('dashboard');
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
```

#### Responsive Layout
- Collapsible sidebar for desktop
- Mobile-responsive design
- Dynamic content area based on current view

### 3. Sidebar Component (`src/components/Sidebar.tsx`)

#### Purpose
- Navigation between dashboard views
- User information display
- Real-time pending applications badge

#### Key Features
```typescript
interface SidebarProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}
```

#### Real-time Data
- Fetches pending applications count
- Subscribes to real-time updates via Supabase
- Updates badge automatically when new applications arrive

#### Navigation Items
```typescript
const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'profile', label: 'My Profile & CV Assets', icon: User },
  { id: 'companies', label: 'Company Directory', icon: Building2 },
  { id: 'preferences', label: 'Job Preferences', icon: Target },
  { id: 'queue', label: 'Review Queue', icon: Clock },
  { id: 'history', label: 'Application History', icon: FileText },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];
```

## Dashboard Components

### 1. ProfileAssets Component (`src/components/dashboard/ProfileAssets.tsx`)

#### Purpose
- Comprehensive CV management system
- Tabbed interface for different asset types
- CRUD operations for experience, education, and other achievements

#### Architecture
```typescript
interface CVAsset {
  id: string;
  asset_type: 'repository' | 'publication' | 'skill' | 'experience' | 'education' | 'other';
  title: string;
  description: string | null;
  metadata: any;  // Flexible JSONB storage
  tags: string[];
  external_url: string | null;
}
```

#### Tab Structure
- **Experience**: Professional work history with achievements
- **Education**: Academic background with GPA and descriptions
- **Other**: Certifications, student organizations, volunteer work, awards
- **Repositories**: GitHub integration (placeholder)
- **Publications**: Google Scholar integration (placeholder)

#### Form Management
```typescript
interface ExperienceForm {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
  achievements: string;
  current: boolean;
}
```

#### Key Features
- Modal forms for adding/editing assets
- Drag-and-drop reordering (future enhancement)
- Rich metadata storage using JSONB
- Tag-based categorization
- External URL linking for certifications

### 2. JobPreferences Component (`src/components/dashboard/JobPreferences.tsx`)

#### Purpose
- Comprehensive job search criteria management
- Real-time database synchronization
- User preference persistence

#### Data Structure
```typescript
interface UserPreferences {
  preferred_job_types: string[];       // Job titles/roles
  preferred_locations: string[];       // Geographic preferences
  preferred_remote: 'on-site' | 'remote' | 'hybrid' | 'any';
  min_salary: number;                  // Salary range minimum
  max_salary: number;                  // Salary range maximum
  preferred_industries: string[];      // Industry preferences
  preferred_company_sizes: string[];   // Company size preferences
  skills: string[];                    // Technical skills and technologies
}
```

#### Form Components
- **Dynamic Tag Input**: Add/remove tags for job titles, locations, industries, skills
- **Salary Range Slider**: Dual-range slider with real-time updates
- **Company Size Multi-Select**: Toggle-based selection for company sizes
- **Remote Preference**: Radio button selection for work arrangement

#### State Management
```typescript
const [saving, setSaving] = useState(false);
const [loading, setLoading] = useState(true);

// Form state mirrors database structure
const [jobTitles, setJobTitles] = useState<string[]>([]);
const [locations, setLocations] = useState<string[]>([]);
const [remotePreference, setRemotePreference] = useState<'on-site' | 'remote' | 'hybrid' | 'any'>('any');
```

#### Save Flow
```typescript
const handleSavePreferences = async () => {
  setSaving(true);
  try {
    await UserService.updateUserPreferences(user.id, {
      preferred_job_types: jobTitles,
      preferred_locations: locations,
      preferred_remote: remotePreference,
      min_salary: salaryRange[0],
      max_salary: salaryRange[1],
      preferred_industries: preferredIndustries,
      preferred_company_sizes: companySizes,
      skills: skills
    });
    
    await refreshUserData(); // Update context
    toast.success("Preferences saved successfully!");
  } catch (error) {
    toast.error("Failed to save preferences. Please try again.");
  } finally {
    setSaving(false);
  }
};
```

### 3. CompanyDirectory Component (`src/components/dashboard/CompanyDirectory.tsx`)

#### Purpose
- Browse and manage companies for job applications
- Company filtering and search functionality
- Company exclusion management

#### Features
- **Search Functionality**: Real-time search across company name, description, industry, location
- **Company Cards**: Rich display with industry emojis, company information
- **Exclude/Include Actions**: Manage excluded companies list
- **Responsive Grid**: Adaptive layout for different screen sizes

#### Data Flow
```typescript
const fetchCompanies = async () => {
  try {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .order('name');
    
    if (data && data.length > 0) {
      setCompanies(data);
    } else {
      setCompanies(getDemoCompanies()); // Fallback
    }
  } catch (error) {
    setCompanies(getDemoCompanies());
  }
};
```

### 4. ReviewQueue Component (`src/components/dashboard/ReviewQueue.tsx`)

#### Purpose
- Review AI-generated job applications before submission
- Approve or discard pending applications
- View match scores and generated CVs

#### Architecture
```typescript
interface PendingApplication {
  id: string;
  user_id: string;
  job_listing: {
    title: string;
    company: Company;
    location: string;
    salary_range: string;
    external_url: string;
  };
  generated_cv_url: string;
  cover_letter: string;
  match_score: number;
  status: 'pending' | 'approved' | 'rejected';
}
```

#### Key Features
- **Application Cards**: Rich display of job information and match scores
- **CV Preview**: Show AI-generated CV content
- **Action Buttons**: Approve or discard applications
- **External Links**: Direct links to original job postings
- **Match Scoring**: Visual indicators for application compatibility

### 5. ApplicationHistory Component (`src/components/dashboard/ApplicationHistory.tsx`)

#### Purpose
- Track submitted applications and their outcomes
- Display application statistics and success rates
- Show generated CV content for each application

#### Features
- **Summary Statistics**: Total applications, pending, interviews, success rate
- **Expandable Cards**: Detailed view of each application with CV content
- **Status Tracking**: Visual status indicators (pending, interview, rejected, etc.)
- **CV Archive**: View the exact CV that was submitted for each application

#### Status Management
```typescript
const getStatusColor = (status: string) => {
  switch (status) {
    case 'submitted': return 'bg-yellow-600';
    case 'acknowledged': return 'bg-blue-600';
    case 'rejected': return 'bg-red-600';
    case 'interview': return 'bg-green-600';
    case 'offer': return 'bg-purple-600';
    default: return 'bg-gray-600';
  }
};
```

## UI Component Library

### 1. Shadcn/ui Integration
- Consistent design system using shadcn/ui components
- Customized theme for dark mode application
- Tailwind CSS for styling

### 2. Common Components
```typescript
// Card components for consistent layout
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Form components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

// Navigation and layout
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
```

### 3. Custom Styling
- Dark theme with gray color palette
- Blue accent colors for primary actions
- Consistent spacing and typography
- Responsive design patterns

## Data Flow Patterns

### 1. Server State Management
```typescript
// Component level data fetching
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  if (user) {
    fetchData();
  }
}, [user]);

const fetchData = async () => {
  try {
    const result = await UserService.getData(user.id);
    setData(result);
  } catch (error) {
    // Handle error
  } finally {
    setLoading(false);
  }
};
```

### 2. Form State Management
```typescript
// Local form state
const [formData, setFormData] = useState(initialState);
const [saving, setSaving] = useState(false);

// Handle form updates
const handleSave = async () => {
  setSaving(true);
  try {
    await UserService.saveData(user.id, formData);
    await refreshUserData(); // Update global state
    toast.success("Saved successfully!");
  } catch (error) {
    toast.error("Save failed!");
  } finally {
    setSaving(false);
  }
};
```

### 3. Real-time Updates
```typescript
// Supabase real-time subscriptions
useEffect(() => {
  const channel = supabase
    .channel('table_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'table_name'
    }, () => {
      fetchData(); // Refresh on changes
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, []);
```

## Error Handling Patterns

### 1. Component Level Error Handling
```typescript
const [error, setError] = useState<string | null>(null);

const handleOperation = async () => {
  try {
    setError(null);
    await dangerousOperation();
  } catch (err) {
    setError(err.message);
    toast.error("Operation failed");
  }
};
```

### 2. Fallback UI Patterns
```typescript
// Loading states
if (loading) return <LoadingSkeleton />;

// Error states
if (error) return <ErrorMessage error={error} onRetry={fetchData} />;

// Empty states
if (data.length === 0) return <EmptyState />;

// Success state
return <DataDisplay data={data} />;
```

## Performance Optimizations

### 1. Code Splitting
- Lazy loading of dashboard components
- Route-based code splitting
- Dynamic imports for heavy components

### 2. Memoization
```typescript
// Expensive calculations
const memoizedData = useMemo(() => {
  return processExpensiveData(data);
}, [data]);

// Event handlers
const handleClick = useCallback(() => {
  // Handle click
}, [dependency]);
```

### 3. Virtualization
- Virtual scrolling for large lists (future enhancement)
- Pagination for large datasets
- Infinite scrolling for feeds

## Testing Strategy

### 1. Component Testing
- Unit tests for individual components
- Integration tests for component interactions
- Mock data for isolated testing

### 2. User Flow Testing
- End-to-end tests for critical paths
- Authentication flow testing
- Data persistence testing

### 3. Accessibility Testing
- Screen reader compatibility
- Keyboard navigation
- Color contrast validation