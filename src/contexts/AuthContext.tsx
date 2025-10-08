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
    // Development bypass mode - load real user data from database
    if (bypassAuth) {
      console.log('🔓 Development mode: Creating authenticated session with real database data');

      const targetUserId = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed';

      const setupBypassAuth = async () => {
        try {
          // First sign out any existing session
          await supabase.auth.signOut();

          // Sign in anonymously to get a valid auth token
          const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

          let bypassUser: User;
          let bypassSession: Session;

          if (authError) {
            console.error('Failed to sign in anonymously:', authError);
            // Fall back to creating a mock session
            bypassUser = {
              id: targetUserId,
              email: 'dev@example.com',
              user_metadata: { full_name: 'Development User' }
            } as User;

            bypassSession = {
              user: bypassUser,
              access_token: 'mock-token'
            } as Session;
          } else if (authData?.session && authData?.user) {
            // Use the anonymous session but override the user ID
            bypassUser = {
              ...authData.user,
              id: targetUserId,
              email: 'dev@example.com',
              user_metadata: { full_name: 'Development User' }
            } as User;

            bypassSession = authData.session;
          } else {
            throw new Error('No auth data returned');
          }

          // Set user and session first
          setUser(bypassUser);
          setSession(bypassSession);

          // Fetch real profile
          const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', targetUserId)
            .single();

          if (profileError) {
            console.error('Error fetching real profile:', profileError);
            // Fallback to mock data if no real profile exists
            const fallbackProfile: UserProfile = {
              id: '4705463c-6f04-4572-b52c-22d2b800dc5b',
              user_id: targetUserId,
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
            setUserProfile(fallbackProfile);
          } else {
            console.log('Real profile data loaded:', profileData);
            setUserProfile(profileData);
          }

          // Fetch real preferences
          const { data: prefsData, error: prefsError } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', targetUserId)
            .single();

          if (prefsError) {
            console.error('Error fetching real preferences:', prefsError);
            // Create minimal fallback preferences
            const fallbackPreferences: UserPreferences = {
              id: 'demo-prefs-123',
              user_id: targetUserId,
              excluded_companies: [],
              preferred_locations: [],
              min_salary: 50000,
              max_salary: 150000,
              preferred_remote: 'any',
              preferred_industries: [],
              skills: [],
              preferred_company_sizes: [],
              preferred_job_types: [],
              job_types: [],
              remote_preference: 'any',
              currency: 'USD',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            setUserPreferences(fallbackPreferences);
          } else {
            console.log('Real preferences data loaded:', prefsData);
            setUserPreferences(prefsData);
          }

        } catch (error) {
          console.error('Error loading real user data:', error);
        } finally {
          setLoading(false);
        }
      };

      // Execute the bypass auth setup
      setupBypassAuth();
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