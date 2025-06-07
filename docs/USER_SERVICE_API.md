# UserService API Documentation

## Overview
The UserService class provides a comprehensive abstraction layer for all user-related database operations in the AutoApply application. It implements scalable patterns for multi-user environments with proper error handling and data isolation.

## Architecture

### Location
`src/services/userService.ts`

### Design Principles
- **Single Responsibility**: Each method handles one specific operation
- **User Isolation**: All operations are scoped to the authenticated user
- **Error Handling**: Comprehensive try-catch blocks with meaningful error messages
- **Type Safety**: Full TypeScript support with defined interfaces
- **Scalability**: Efficient queries with proper indexing considerations

## Type Definitions

### UserProfile Interface
```typescript
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  github_username: string | null;
  scholar_url: string | null;
  created_at: string;
  updated_at: string;
}
```

### UserPreferences Interface
```typescript
export interface UserPreferences {
  id: string;
  user_id: string;
  preferred_locations: string[];
  preferred_remote: 'on-site' | 'remote' | 'hybrid' | 'any';
  preferred_job_types: string[];
  min_salary: number | null;
  max_salary: number | null;
  preferred_industries: string[];
  preferred_company_sizes: string[];
  skills: string[];
  excluded_companies: string[];
  created_at: string;
  updated_at: string;
}
```

## API Methods

### User Initialization

#### `initializeUserData(user: User): Promise<void>`
Initializes user data when a new user signs up or logs in for the first time.

```typescript
static async initializeUserData(user: User): Promise<void>
```

**Purpose**: Ensures user has complete profile and default preferences
**Parameters**:
- `user`: Supabase Auth User object

**Behavior**:
1. Checks if user profile already exists
2. Creates user profile if missing (fallback for database trigger failure)
3. Creates default user preferences if they don't exist
4. Ensures data consistency across tables

**Error Handling**: Logs errors but doesn't throw (graceful degradation)

**Usage**:
```typescript
// Called automatically by AuthContext on user login/signup
await UserService.initializeUserData(user);
```

#### `createDefaultUserPreferences(userId: string): Promise<void>`
Creates default preferences for a new user.

```typescript
static async createDefaultUserPreferences(userId: string): Promise<void>
```

**Default Values**:
```typescript
{
  preferred_locations: [],
  preferred_remote: 'any',
  preferred_job_types: ['full-time'],
  min_salary: null,
  max_salary: null,
  preferred_industries: [],
  preferred_company_sizes: [],
  skills: [],
  excluded_companies: []
}
```

### User Profile Management

#### `getUserProfile(userId: string): Promise<UserProfile | null>`
Retrieves user profile information.

```typescript
static async getUserProfile(userId: string): Promise<UserProfile | null>
```

**Parameters**:
- `userId`: UUID of the user

**Returns**: UserProfile object or null if not found

**RLS**: Automatically enforced - users can only access their own profile

**Error Handling**: Returns null for missing users, throws for other errors

#### `updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null>`
Updates user profile information.

```typescript
static async updateUserProfile(
  userId: string, 
  updates: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>
): Promise<UserProfile | null>
```

**Parameters**:
- `userId`: UUID of the user
- `updates`: Partial UserProfile object with fields to update

**Returns**: Updated UserProfile object

**Updatable Fields**:
- `email`
- `full_name`
- `github_username`
- `scholar_url`

**Auto-managed Fields**: `updated_at` is automatically set by database trigger

### User Preferences Management

#### `getUserPreferences(userId: string): Promise<UserPreferences | null>`
Retrieves user job search preferences.

```typescript
static async getUserPreferences(userId: string): Promise<UserPreferences | null>
```

**Auto-creation**: If preferences don't exist, creates default preferences and returns them

**Usage Pattern**:
```typescript
const preferences = await UserService.getUserPreferences(user.id);
// Always returns preferences (creates defaults if missing)
```

#### `updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences | null>`
Updates user job search preferences.

```typescript
static async updateUserPreferences(
  userId: string, 
  updates: Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<UserPreferences | null>
```

**Updatable Fields**:
- `preferred_locations: string[]`
- `preferred_remote: 'on-site' | 'remote' | 'hybrid' | 'any'`
- `preferred_job_types: string[]`
- `min_salary: number | null`
- `max_salary: number | null`
- `preferred_industries: string[]`
- `preferred_company_sizes: string[]`
- `skills: string[]`
- `excluded_companies: string[]`

### CV Assets Management

#### `getUserCVAssets(userId: string, assetType?: string)`
Retrieves user's CV assets with optional type filtering.

```typescript
static async getUserCVAssets(userId: string, assetType?: string)
```

**Parameters**:
- `userId`: UUID of the user
- `assetType`: Optional filter by asset type

**Asset Types**:
- `'experience'`: Professional work experience
- `'education'`: Educational background
- `'other'`: Certifications, organizations, volunteer work
- `'repository'`: GitHub repositories
- `'publication'`: Academic publications
- `'skill'`: Technical skills

**Returns**: Array of CV assets ordered by creation date (newest first)

**Usage Examples**:
```typescript
// Get all assets
const allAssets = await UserService.getUserCVAssets(user.id);

// Get only experience assets
const experience = await UserService.getUserCVAssets(user.id, 'experience');
```

#### `createCVAsset(userId: string, asset: CVAssetInput)`
Creates a new CV asset for the user.

```typescript
static async createCVAsset(userId: string, asset: {
  asset_type: string;
  title: string;
  description?: string;
  metadata?: any;
  tags?: string[];
  external_url?: string;
})
```

**Required Fields**:
- `asset_type`: One of the supported asset types
- `title`: Human-readable title

**Optional Fields**:
- `description`: Detailed description
- `metadata`: JSONB object for flexible data storage
- `tags`: Array of categorization tags
- `external_url`: Link to external resource

**Metadata Examples**:
```typescript
// Experience metadata
{
  company: "TechCorp",
  position: "Senior Engineer",
  startDate: "2021-03",
  endDate: "2023-12",
  location: "San Francisco, CA",
  achievements: "Led team of 5 developers",
  current: false
}

// Education metadata
{
  institution: "Stanford University",
  degree: "Master of Science",
  field: "Computer Science",
  startDate: "2017-09",
  endDate: "2019-05",
  gpa: "3.8",
  current: false
}
```

#### `updateCVAsset(assetId: string, updates: CVAssetUpdates)`
Updates an existing CV asset.

```typescript
static async updateCVAsset(assetId: string, updates: {
  title?: string;
  description?: string;
  metadata?: any;
  tags?: string[];
  external_url?: string;
})
```

**RLS Protection**: Users can only update their own assets

#### `deleteCVAsset(assetId: string): Promise<boolean>`
Deletes a CV asset.

```typescript
static async deleteCVAsset(assetId: string): Promise<boolean>
```

**Returns**: `true` if successful
**RLS Protection**: Users can only delete their own assets

### Application Management

#### `getPendingApplications(userId: string)`
Retrieves user's pending job applications awaiting review.

```typescript
static async getPendingApplications(userId: string)
```

**Returns**: Array of pending applications with joined job and company data

**Query Structure**:
```sql
SELECT 
  pending_applications.*,
  job_listings.*,
  companies.*
FROM pending_applications
JOIN job_listings ON pending_applications.job_listing_id = job_listings.id
JOIN companies ON job_listings.company_id = companies.id
WHERE pending_applications.user_id = $1
ORDER BY created_at DESC
```

#### `getApplicationHistory(userId: string)`
Retrieves user's application history and outcomes.

```typescript
static async getApplicationHistory(userId: string)
```

**Returns**: Array of submitted applications with job and company details

**Includes**:
- Application submission details
- Current status (submitted, acknowledged, rejected, interview, offer)
- Job listing information
- Company information
- Submission method and timestamps

## Error Handling Patterns

### 1. Graceful Degradation
```typescript
static async getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // User not found - not an error
      }
      throw error; // Re-throw other errors
    }

    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null; // Graceful degradation
  }
}
```

### 2. Auto-retry for Missing Data
```typescript
static async getUserPreferences(userId: string): Promise<UserPreferences | null> {
  try {
    // Try to get existing preferences
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No preferences found, create default ones
      await this.createDefaultUserPreferences(userId);
      return await this.getUserPreferences(userId); // Recursive retry
    }

    return data;
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return null;
  }
}
```

### 3. Comprehensive Error Logging
```typescript
static async createCVAsset(userId: string, asset: CVAssetInput) {
  try {
    const { data, error } = await supabase
      .from('cv_assets')
      .insert({ user_id: userId, ...asset })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error creating CV asset:', error);
    throw error; // Re-throw for component handling
  }
}
```

## Usage Patterns

### 1. Component Integration
```typescript
import { UserService } from "@/services/userService";
import { useAuth } from "@/contexts/AuthContext";

const Component = () => {
  const { user } = useAuth();
  const [data, setData] = useState([]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const result = await UserService.getUserCVAssets(user.id);
      setData(result);
    } catch (error) {
      // Handle error
    }
  };
};
```

### 2. Form Submission
```typescript
const handleSave = async (formData) => {
  try {
    if (editingId) {
      await UserService.updateCVAsset(editingId, formData);
    } else {
      await UserService.createCVAsset(user.id, formData);
    }
    
    await refreshData(); // Reload component data
    toast.success("Saved successfully!");
  } catch (error) {
    toast.error("Save failed!");
  }
};
```

### 3. Real-time Updates
```typescript
const handleDelete = async (assetId) => {
  try {
    await UserService.deleteCVAsset(assetId);
    
    // Update local state immediately
    setAssets(prev => prev.filter(asset => asset.id !== assetId));
    
    toast.success("Deleted successfully!");
  } catch (error) {
    toast.error("Delete failed!");
  }
};
```

## Performance Considerations

### 1. Efficient Queries
- All queries use indexed columns (`user_id`, `asset_type`)
- SELECT only necessary fields
- Use single() for expected single results
- Implement proper ordering for consistent results

### 2. Batch Operations
```typescript
// Load multiple related data sets efficiently
const [profile, preferences] = await Promise.all([
  UserService.getUserProfile(user.id),
  UserService.getUserPreferences(user.id)
]);
```

### 3. Caching Strategy
- AuthContext caches user profile and preferences
- Components can use cached data when appropriate
- Manual refresh available for real-time updates

## Security Implementation

### 1. Row Level Security
- All methods rely on RLS policies in database
- No additional access control needed in service layer
- Users automatically isolated by database policies

### 2. Input Validation
- TypeScript provides compile-time type checking
- Database constraints provide runtime validation
- Service methods assume valid input types

### 3. SQL Injection Prevention
- All queries use Supabase parameterized queries
- No raw SQL string concatenation
- ORM-style query building prevents injection

## Testing Support

### 1. Mockable Interface
```typescript
// Service can be easily mocked for testing
jest.mock('@/services/userService', () => ({
  UserService: {
    getUserProfile: jest.fn(),
    updateUserProfile: jest.fn(),
    // ... other methods
  }
}));
```

### 2. Error Simulation
```typescript
// Test error handling
UserService.getUserProfile.mockRejectedValue(new Error('Database error'));
```

### 3. Data Consistency
```typescript
// Test data isolation
const user1Data = await UserService.getUserCVAssets('user1-id');
const user2Data = await UserService.getUserCVAssets('user2-id');
// Should never overlap
```