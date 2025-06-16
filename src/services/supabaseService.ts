import { createClient } from '@supabase/supabase-js';

// Create a service client for development mode that bypasses RLS
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

export const supabaseService = serviceKey 
  ? createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Function to save data with service client in development mode
export async function saveToSupabaseService<T>(
  table: string,
  data: T[],
  userId: string,
  idField: string = 'user_id'
): Promise<boolean> {
  if (!supabaseService) {
    console.log('Service client not available');
    return false;
  }

  try {
    // Check if user exists first (for development mode)
    const { data: userExists } = await supabaseService
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!userExists) {
      console.log('📝 Mock user does not exist in database');
      console.log('💡 Run setup-development-database.sql in Supabase dashboard to enable database saves');
      return false;
    }

    console.log('🗄️ User exists, saving to Supabase database...');

    // Delete existing records for this user
    await supabaseService
      .from(table)
      .delete()
      .eq(idField, userId);

    // Insert new records
    if (data.length > 0) {
      const { error } = await supabaseService
        .from(table)
        .insert(data);

      if (error) {
        console.error('Supabase service save error:', error);
        return false;
      }
    }

    console.log(`Successfully saved ${data.length} records to Supabase ${table}`);
    return true;
  } catch (error) {
    console.error('Supabase service operation failed:', error);
    return false;
  }
}

// Function to load data with service client in development mode
export async function loadFromSupabaseService<T>(
  table: string,
  userId: string,
  idField: string = 'user_id'
): Promise<T[] | null> {
  if (!supabaseService) {
    console.log('Service client not available');
    return null;
  }

  try {
    const { data, error } = await supabaseService
      .from(table)
      .select('*')
      .eq(idField, userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Supabase service load error:', error);
      return null;
    }

    console.log(`Successfully loaded ${data?.length || 0} records from Supabase ${table}`);
    return data || [];
  } catch (error) {
    console.error('Supabase service load failed:', error);
    return null;
  }
}