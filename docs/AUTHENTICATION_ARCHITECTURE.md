# Authentication Architecture Documentation

## Overview
This document describes the authentication system implementation using Supabase Auth with React context for state management and automatic user data initialization.

## Architecture Components

### 1. Authentication Provider (`src/contexts/AuthContext.tsx`)

#### Purpose
- Centralized authentication state management
- Automatic user data initialization on signup/login
- Provides authentication methods and user data to components

#### Key Features
```typescript
interface AuthContextType {
  user: User | null;                    // Supabase Auth user
  session: Session | null;              // Current session
  userProfile: UserProfile | null;      // App-specific user profile
  userPreferences: UserPreferences | null; // User job preferences
  loading: boolean;                     // Authentication loading state
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  refreshUserData: () => Promise<void>; // Refresh user profile/preferences
}
```

#### User Data Initialization Flow
1. **On Auth State Change**: When user signs in/up
2. **Initialize User Data**: Call `UserService.initializeUserData(user)`
3. **Load Profile & Preferences**: Fetch user profile and preferences
4. **Update Context State**: Set userProfile and userPreferences

```typescript
const initializeAndLoadUserData = async (user: User) => {
  try {
    // Initialize user data if needed (creates profile + default preferences)
    await UserService.initializeUserData(user);
    
    // Load user profile and preferences
    const [profile, preferences] = await Promise.all([
      UserService.getUserProfile(user.id),
      UserService.getUserPreferences(user.id)
    ]);

    setUserProfile(profile);
    setUserPreferences(preferences);
  } catch (error) {
    console.error('Error initializing user data:', error);
  }
};
```

### 2. User Service (`src/services/userService.ts`)

#### Purpose
- Abstraction layer for all user-related database operations
- Handles user data initialization and CRUD operations
- Implements scalable patterns for multi-user environment

#### Key Methods

##### User Initialization
```typescript
static async initializeUserData(user: User): Promise<void>
```
- Checks if user profile exists
- Creates user profile if missing (fallback for trigger failure)
- Creates default user preferences
- Ensures data consistency on signup

##### Profile Management
```typescript
static async getUserProfile(userId: string): Promise<UserProfile | null>
static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null>
```

##### Preferences Management
```typescript
static async getUserPreferences(userId: string): Promise<UserPreferences | null>
static async updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences | null>
static async createDefaultUserPreferences(userId: string): Promise<void>
```

##### CV Assets Management
```typescript
static async getUserCVAssets(userId: string, assetType?: string)
static async createCVAsset(userId: string, asset: CVAssetInput)
static async updateCVAsset(assetId: string, updates: CVAssetUpdates)
static async deleteCVAsset(assetId: string)
```

##### Application Management
```typescript
static async getPendingApplications(userId: string)
static async getApplicationHistory(userId: string)
```

### 3. Protected Route Component (`src/components/auth/ProtectedRoute.tsx`)

#### Purpose
- Wraps protected components/pages
- Redirects unauthenticated users to login
- Shows loading state during authentication check

```typescript
export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or loading spinner
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};
```

### 4. Authentication Pages (`src/pages/Auth.tsx`)

#### Features
- Tabbed interface for Login/Signup
- Form validation and error handling
- Demo account functionality for testing
- Integration with AuthContext methods

#### Demo Account
- Email: `demo@autoapply.com`
- Password: `demo123456`
- Pre-populated with sample data for immediate testing

## Authentication Flow

### 1. Application Startup
```
App Loads → AuthProvider Initializes → Check Session → Load User Data
```

1. `AuthProvider` checks for existing session via `supabase.auth.getSession()`
2. If session exists, calls `initializeAndLoadUserData(user)`
3. Sets loading to false once complete

### 2. User Signup Flow
```
Form Submit → Supabase Auth Signup → Database Trigger → Context Update → User Initialization
```

1. User submits signup form with email, password, full_name
2. Supabase Auth creates user in `auth.users` table
3. Database trigger `on_auth_user_created` creates profile in `public.users`
4. AuthContext detects auth state change
5. `initializeAndLoadUserData()` ensures data consistency
6. User is redirected to dashboard

### 3. User Login Flow
```
Form Submit → Supabase Auth Login → Context Update → Load User Data → Dashboard
```

1. User submits login credentials
2. Supabase Auth validates and creates session
3. AuthContext updates user state
4. User profile and preferences are loaded
5. User is redirected to dashboard

### 4. User Logout Flow
```
Logout Button → Supabase Auth Signout → Clear Context State → Redirect to Auth
```

1. User clicks logout
2. `signOut()` called on Supabase Auth
3. Context clears all user-related state
4. User redirected to authentication page

## Security Implementation

### 1. Row Level Security (RLS)
- All user tables have RLS enabled
- Policies ensure users can only access their own data
- Uses `auth.uid()` for user identification in policies

### 2. Client-Side Route Protection
```typescript
// App.tsx routing structure
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
```

### 3. API Security
- All database operations go through UserService
- UserService enforces user scoping on all queries
- No direct database access from components

## Error Handling

### 1. Authentication Errors
- Network errors during auth operations
- Invalid credentials
- Email already exists
- Password reset failures

### 2. Data Loading Errors
- Database connection issues
- RLS policy violations
- Missing user data

### 3. Fallback Strategies
- Demo data when database unavailable
- Graceful degradation for missing user data
- Retry mechanisms for transient failures

## State Management

### 1. Authentication State
```typescript
const [user, setUser] = useState<User | null>(null);
const [session, setSession] = useState<Session | null>(null);
const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
const [loading, setLoading] = useState(true);
```

### 2. Real-time Updates
- Auth state changes automatically trigger data refresh
- `refreshUserData()` method for manual refresh
- Components can call refresh after data modifications

### 3. Loading States
- Global loading during authentication check
- Component-level loading during data operations
- Skeleton loaders for better UX

## Integration with Components

### 1. Using Authentication Context
```typescript
import { useAuth } from "@/contexts/AuthContext";

const Component = () => {
  const { user, userProfile, userPreferences, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <LoginPrompt />;
  
  // Component logic with authenticated user
};
```

### 2. Data Operations
```typescript
import { UserService } from "@/services/userService";

const saveUserData = async () => {
  if (!user) return;
  
  try {
    await UserService.updateUserProfile(user.id, updates);
    await refreshUserData(); // Refresh context
  } catch (error) {
    // Handle error
  }
};
```

## Environment Configuration

### 1. Supabase Configuration
```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 2. Required Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Testing & Development

### 1. Demo Account
- Pre-configured demo account for testing
- Sample data automatically available
- No setup required for development

### 2. Local Development
- Works with local Supabase instance
- Fallback demo data when database unavailable
- Hot reload preserves authentication state

### 3. Production Deployment
- Environment variables for Supabase connection
- Proper error handling for production issues
- Monitoring and logging integration points

## Scalability Considerations

### 1. User Data Isolation
- All queries scoped to authenticated user
- RLS policies prevent data leakage
- Efficient indexing on user_id columns

### 2. Performance Optimization
- Minimal data loading on authentication
- Lazy loading of secondary data
- Caching strategies for user preferences

### 3. Session Management
- Automatic session refresh
- Proper cleanup on logout
- Concurrent session handling