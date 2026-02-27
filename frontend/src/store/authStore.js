import { create } from 'zustand'
import { supabase } from '../services/supabase'

// Get user from localStorage
const getStoredUser = () => {
  try {
    const stored = localStorage.getItem('hospital_user')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

const useAuthStore = create((set, get) => ({
  // State
  user: getStoredUser(),
  role: null,
  isLoading: false,
  error: null,

  // Actions
  setUser: (user) => {
    if (user) {
      localStorage.setItem('hospital_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('hospital_user')
    }
    set({ user, error: null })
  },

  setRole: (role) => {
    set({ role })
  },

  setLoading: (isLoading) => {
    set({ isLoading })
  },

  setError: (error) => {
    set({ error })
  },

  // Login function
  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        // Get user profile to determine role - check all three tables
        let profile = null
        let role = 'patient'
        
        // Try patients table first
        const { data: patientData } = await supabase
          .from('patients')
          .select('*')
          .eq('id', data.user.id)
          .single()
        
        if (patientData) {
          profile = patientData
          role = 'patient'
        } else {
          // Try doctors table
          const { data: doctorData } = await supabase
            .from('doctors')
            .select('*')
            .eq('id', data.user.id)
            .single()
          
          if (doctorData) {
            profile = doctorData
            role = 'doctor'
          } else {
            // Try mediators table
            const { data: mediatorData } = await supabase
              .from('mediators')
              .select('*')
              .eq('id', data.user.id)
              .single()
            
            if (mediatorData) {
              profile = mediatorData
              role = 'mediator'
            }
          }
        }

        const userData = {
          id: data.user.id,
          email: data.user.email,
          role: role,
          fullName: profile?.full_name || data.user.email?.split('@')[0],
          avatarUrl: profile?.avatar_url || null,
        }

        // Save to localStorage
        localStorage.setItem('hospital_user', JSON.stringify(userData))
        set({ user: userData, isLoading: false })
        return { success: true, user: userData }
      }
    } catch (error) {
      const errorMessage = error.message || 'Login failed'
      set({ error: errorMessage, isLoading: false })
      return { success: false, error: errorMessage }
    }
  },

  // Signup function
  signup: async (email, password, fullName, role = 'patient') => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      })

      if (error) throw error

      if (data.user) {
        // Create profile in the correct table based on role
        const tableName = role === 'doctor' ? 'doctors' : role === 'mediator' ? 'mediators' : 'patients'
        
        await supabase.from(tableName).insert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
          role: role,
        })

        const userData = {
          id: data.user.id,
          email: data.user.email,
          role: role,
          fullName: fullName,
        }

        set({ user: userData, isLoading: false })
        return { success: true, user: userData }
      }
    } catch (error) {
      const errorMessage = error.message || 'Signup failed'
      set({ error: errorMessage, isLoading: false })
      return { success: false, error: errorMessage }
    }
  },

  // Logout function
  logout: async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Logout error:', error)
    }
    // Clear ALL stored data
    localStorage.removeItem('hospital_user')
    localStorage.removeItem('supabase.auth.token')
    sessionStorage.clear()
    set({ user: null, role: null, isLoading: false, error: null })
  },

  // Check current session
  checkSession: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        const userData = {
          id: session.user.id,
          email: session.user.email,
          role: profile?.role || 'patient',
          fullName: profile?.full_name || session.user.email?.split('@')[0],
          avatarUrl: profile?.avatar_url || null,
        }

        set({ user: userData })
      } else {
        // No session - clear stored user
        localStorage.removeItem('hospital_user')
        set({ user: null, role: null })
      }
    } catch (error) {
      console.error('Session check error:', error)
      localStorage.removeItem('hospital_user')
      set({ user: null, role: null })
    }
  },

  // Initialize - verify session on app start and check all user tables
  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // Check patients table
        const { data: patientData } = await supabase
          .from('patients')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (patientData) {
          set({ user: { ...patientData, role: 'patient' }, role: 'patient' })
          return
        }
        
        // Check doctors table
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (doctorData) {
          set({ user: { ...doctorData, role: 'doctor' }, role: 'doctor' })
          return
        }
        
        // Check mediators table
        const { data: mediatorData } = await supabase
          .from('mediators')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (mediatorData) {
          set({ user: { ...mediatorData, role: 'mediator' }, role: 'mediator' })
          return
        }
      }
      // No valid session
      localStorage.removeItem('hospital_user')
      set({ user: null, role: null })
    } catch (error) {
      console.error('Init error:', error)
      localStorage.removeItem('hospital_user')
      set({ user: null, role: null })
    }
  },
}))

export default useAuthStore
