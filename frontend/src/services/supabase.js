import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Create Supabase client
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === '' || supabaseAnonKey === '') {
    throw new Error('Missing Supabase credentials. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file')
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  })
}

export const supabase = createSupabaseClient()

// Helper to get the current session
export const getSession = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  } catch (e) {
    return null
  }
}

// Helper to get the current user
export const getUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (e) {
    return null
  }
}

export default supabase
