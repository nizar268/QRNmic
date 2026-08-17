import { createClient } from '@supabase/supabase-js';

// Baca konfigurasi dari fail .env (Vite)
const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const envSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Konfigurasi lalai / fallback
export const SUPABASE_URL = envSupabaseUrl || 'https://your-project.supabase.co';
export const SUPABASE_ANON_KEY = envSupabaseAnonKey || 'your-anon-key';

export const isSupabaseConfigured = Boolean(
    envSupabaseUrl && 
    envSupabaseAnonKey && 
    envSupabaseUrl !== 'https://your-project.supabase.co' && 
    envSupabaseAnonKey !== 'your-anon-key'
);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});
