import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserService, UserProfile, UserPreferences } from '@/services/userService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  userPreferences: UserPreferences | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  // Development bypass mode - works in both dev and production when VITE_BYPASS_AUTH is true
  const bypassAuth = import.meta.env.VITE_BYPASS_AUTH === 'true';

  const refreshUserData = async () => {
    if (!user) return;

    try {
      const [profile, preferences] = await Promise.all([
        UserService.getUserProfile(user.id),
        UserService.getUserPreferences(user.id)
      ]);

      setUserProfile(profile);
      setUserPreferences(preferences);
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const initializeAndLoadUserData = async (user: User) => {
    try {
      console.log('AuthContext: Starting user data initialization...');
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Initialization timeout')), 10000)
      );
      
      // Initialize user data if needed
      await Promise.race([
        UserService.initializeUserData(user),
        timeoutPromise
      ]);
      console.log('AuthContext: User data initialized');
      
      // Load user profile and preferences
      console.log('AuthContext: Loading profile and preferences...');
      const [profile, preferences] = await Promise.all([
        UserService.getUserProfile(user.id),
        UserService.getUserPreferences(user.id)
      ]);
      console.log('AuthContext: Profile and preferences loaded');

      setUserProfile(profile);
      setUserPreferences(preferences);
      console.log('AuthContext: User data set in state');
    } catch (error) {
      console.error('Error initializing user data:', error);
      // Don't let errors prevent app from loading
      setUserProfile(null);
      setUserPreferences(null);
    }
  };

  useEffect(() => {
    // Development bypass mode - but still load real data from Supabase
    if (bypassAuth) {
      console.log('🔓 Development mode: Creating mock user session with real data');
      
      // Create mock user for development with real UUID from Supabase
      const mockUser = {
        id: 'ebbae036-5dbf-4571-a29d-2318e1ce0eed',
        email: 'dev@example.com',
        user_metadata: { full_name: 'Development User' }
      } as User;
      
      const mockSession = {
        user: mockUser,
        access_token: 'mock-token'
      } as Session;

      // Set user and session first
      setUser(mockUser);
      setSession(mockSession);

      // Use the real profile data we created earlier, and create minimal preferences
      console.log('Using real Supabase profile data with minimal preferences...');
      
      const realProfile: UserProfile = {
        id: '4705463c-6f04-4572-b52c-22d2b800dc5b',
        user_id: 'ebbae036-5dbf-4571-a29d-2318e1ce0eed',
        full_name: 'Demo User',
        email: 'demo@example.com',
        phone: null,
        location: 'Berlin, Germany',
        linkedin_url: null,
        github_url: null,
        portfolio_url: null,
        professional_summary: 'Experienced software developer with expertise in full-stack development',
        current_title: 'Senior Software Engineer',
        github_username: 'demouser',
        created_at: '2025-07-01T22:09:39.821909+00:00',
        updated_at: '2025-07-01T22:09:39.821909+00:00'
      };

      const minimalPreferences: UserPreferences = {
        id: 'demo-prefs-123',
        user_id: 'ebbae036-5dbf-4571-a29d-2318e1ce0eed',
        excluded_companies: [],
        preferred_locations: ['Berlin', 'Remote'],
        min_salary: 60000,
        max_salary: 120000,
        preferred_remote: 'any',
        preferred_industries: ['Technology', 'Fintech'],
        skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python'],
        preferred_company_sizes: ['startup', 'medium'],
        preferred_job_types: ['full-time'],
        job_types: ['full-time'],
        remote_preference: 'any',
        currency: 'EUR',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setUserProfile(realProfile);
      setUserPreferences(minimalPreferences);
      setLoading(false);
      return;
    }

    // Get initial session
    const getSession = async () => {
      console.log('AuthContext: Getting session...');
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
        setLoading(false);
      } else {
        console.log('AuthContext: Session obtained:', !!session);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log('AuthContext: Initializing user data...');
          await initializeAndLoadUserData(session.user);
        }
      }
      console.log('AuthContext: Setting loading to false');
      setLoading(false);
    };


    if (!bypassAuth) {
      getSession();

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user && event === 'SIGNED_IN') {
            await initializeAndLoadUserData(session.user);
          } else if (event === 'SIGNED_OUT') {
            setUserProfile(null);
            setUserPreferences(null);
          }

          setLoading(false);
        }
      );

      return () => subscription.unsubscribe();
    }
  }, [bypassAuth]);

  useEffect(() => {
    if (user && !userProfile) {
      refreshUserData();
    }
  }, [user, userProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  };

  const value = {
    user,
    session,
    userProfile,
    userPreferences,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}