import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  github_username: string | null;
  scholar_url: string | null;
  created_at: string;
  updated_at: string;
}

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

export class UserService {
  static async initializeUserData(user: User): Promise<void> {
    try {
      console.log('UserService: Checking existing user...');
      
      // Add timeout to database queries
      const timeoutMs = 5000;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), timeoutMs)
      );
      
      // Check if user profile already exists
      const { data: existingUser, error: checkError } = await Promise.race([
        supabase.from('users').select('id').eq('id', user.id).single(),
        timeoutPromise
      ]) as any;

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('UserService: Error checking user:', checkError);
        throw checkError;
      }

      console.log('UserService: Existing user check result:', !!existingUser);
      if (existingUser) {
        console.log('UserService: User already exists, skipping initialization');
        return; // User already initialized
      }

      console.log('UserService: Creating user profile...');
      // Create user profile if it doesn't exist (fallback for trigger failure)
      const { error: userError } = await Promise.race([
        supabase.from('users').insert({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || null,
          github_username: null,
          scholar_url: null
        }),
        timeoutPromise
      ]) as any;

      if (userError && !userError.message.includes('duplicate key')) {
        console.error('UserService: Error creating user profile:', userError);
        throw userError;
      }
      console.log('UserService: User profile created');

      console.log('UserService: Creating default preferences...');
      // Initialize default user preferences
      await this.createDefaultUserPreferences(user.id);
      console.log('UserService: Default preferences created');

    } catch (error) {
      console.error('Error initializing user data:', error);
      // Don't throw - let the app continue without user data
      console.warn('UserService: Continuing without user initialization');
    }
  }

  static async createDefaultUserPreferences(userId: string): Promise<void> {
    try {
      console.log('UserService: Inserting default preferences for user:', userId);
      const { error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          preferred_locations: [],
          preferred_remote: 'any',
          preferred_job_types: ['full-time'],
          min_salary: null,
          max_salary: null,
          preferred_industries: [],
          preferred_company_sizes: [],
          skills: [],
          excluded_companies: []
        });

      if (error && !error.message.includes('duplicate key')) {
        console.error('UserService: Error creating preferences:', error);
        throw error;
      }
      console.log('UserService: Default preferences inserted successfully');
    } catch (error) {
      console.error('Error creating default user preferences:', error);
      throw error;
    }
  }

  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      console.log('UserService: Fetching user profile...');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile query timeout')), 3000)
      );

      const { data, error } = await Promise.race([
        supabase.from('users').select('*').eq('id', userId).single(),
        timeoutPromise
      ]) as any;

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('UserService: User profile not found');
          return null; // User not found
        }
        throw error;
      }

      console.log('UserService: User profile fetched successfully');
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  static async updateUserProfile(userId: string, updates: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  static async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      console.log('UserService: Fetching user preferences...');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Preferences query timeout')), 3000)
      );

      const { data, error } = await Promise.race([
        supabase.from('user_preferences').select('*').eq('user_id', userId).single(),
        timeoutPromise
      ]) as any;

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('UserService: User preferences not found, creating defaults...');
          // No preferences found, create default ones
          await this.createDefaultUserPreferences(userId);
          return await this.getUserPreferences(userId);
        }
        throw error;
      }

      console.log('UserService: User preferences fetched successfully');
      return data;
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      return null;
    }
  }

  static async updateUserPreferences(userId: string, updates: Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<UserPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  static async getUserCVAssets(userId: string, assetType?: string) {
    try {
      let query = supabase
        .from('cv_assets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (assetType) {
        query = query.eq('asset_type', assetType);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching CV assets:', error);
      return [];
    }
  }

  static async createCVAsset(userId: string, asset: {
    asset_type: string;
    title: string;
    description?: string;
    metadata?: any;
    tags?: string[];
    external_url?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('cv_assets')
        .insert({
          user_id: userId,
          ...asset
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error creating CV asset:', error);
      throw error;
    }
  }

  static async updateCVAsset(assetId: string, updates: {
    title?: string;
    description?: string;
    metadata?: any;
    tags?: string[];
    external_url?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('cv_assets')
        .update(updates)
        .eq('id', assetId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating CV asset:', error);
      throw error;
    }
  }

  static async deleteCVAsset(assetId: string) {
    try {
      const { error } = await supabase
        .from('cv_assets')
        .delete()
        .eq('id', assetId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error deleting CV asset:', error);
      throw error;
    }
  }

  static async getPendingApplications(userId: string) {
    try {
      const { data, error } = await supabase
        .from('pending_applications')
        .select(`
          *,
          job_listing:job_listings(
            *,
            company:companies(*)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching pending applications:', error);
      return [];
    }
  }

  static async getApplicationHistory(userId: string) {
    try {
      const { data, error } = await supabase
        .from('application_history')
        .select(`
          *,
          job_listing:job_listings(
            *,
            company:companies(*)
          ),
          company:companies(*)
        `)
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching application history:', error);
      return [];
    }
  }

  static async excludeCompany(userId: string, companyId: string): Promise<void> {
    try {
      const preferences = await this.getUserPreferences(userId);
      if (!preferences) {
        throw new Error('User preferences not found');
      }

      const currentExcluded = preferences.excluded_companies || [];
      if (currentExcluded.includes(companyId)) {
        return; // Already excluded
      }

      await this.updateUserPreferences(userId, {
        excluded_companies: [...currentExcluded, companyId]
      });
    } catch (error) {
      console.error('Error excluding company:', error);
      throw error;
    }
  }

  static async includeCompany(userId: string, companyId: string): Promise<void> {
    try {
      const preferences = await this.getUserPreferences(userId);
      if (!preferences) {
        throw new Error('User preferences not found');
      }

      const currentExcluded = preferences.excluded_companies || [];
      if (!currentExcluded.includes(companyId)) {
        return; // Not excluded
      }

      await this.updateUserPreferences(userId, {
        excluded_companies: currentExcluded.filter(id => id !== companyId)
      });
    } catch (error) {
      console.error('Error including company:', error);
      throw error;
    }
  }

  static async getFilteredCompanies(userId: string) {
    try {
      const [companiesResult, preferences] = await Promise.all([
        supabase.from('companies').select('*').order('name'),
        this.getUserPreferences(userId)
      ]);

      if (companiesResult.error) {
        throw companiesResult.error;
      }

      const excludedCompanies = preferences?.excluded_companies || [];
      const filteredCompanies = (companiesResult.data || []).filter(
        company => !excludedCompanies.includes(company.id)
      );

      return filteredCompanies;
    } catch (error) {
      console.error('Error fetching filtered companies:', error);
      return [];
    }
  }
}