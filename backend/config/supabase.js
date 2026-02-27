const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Warning: Supabase credentials not found in environment variables');
}

// Create Supabase client
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// Export as named export for compatibility with routes
module.exports = { supabase };
