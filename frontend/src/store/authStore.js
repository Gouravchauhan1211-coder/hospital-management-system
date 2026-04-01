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
        // Get user profile to determine role - check ALL tables
        let role = 'patient'

        // Try profiles table first (source of truth for role)
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role, full_name, avatar_url')
            .eq('id', data.user.id)
            .single()

          if (profileData?.role) {
            role = profileData.role
          } else if (!profileData) {
            // Profile doesn't exist, check role-specific tables
            // Try doctors table
            const { data: doctorData } = await supabase
              .from('doctors')
              .select('full_name')
              .eq('id', data.user.id)
              .single()

            if (doctorData) {
              role = 'doctor'
            } else {
              // Try mediators table
              const { data: mediatorData } = await supabase
                .from('mediators')
                .select('full_name')
                .eq('id', data.user.id)
                .single()

              if (mediatorData) {
                role = 'mediator'
              }
            }
          }
        } catch (e) {
          console.error('Profile lookup error:', e)
          // Continue with default role
        }

        const userData = {
          id: data.user.id,
          email: data.user.email,
          role: role,
          fullName: email?.split('@')[0],
          avatarUrl: null,
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
        // Create profile in profiles table first (source of truth for role)
        await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
          role: role,
        })

        // Create profile in the role-specific table
        const tableName = role === 'doctor' ? 'doctors' : role === 'mediator' ? 'mediators' : 'patients'

        await supabase.from(tableName).insert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
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
        // Check the profiles table first (source of truth for role)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileData) {
          const role = profileData.role || 'patient'
          set({ user: { ...profileData, role: role }, role: role })
          return
        }

        // Fallback: check role-specific tables
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

  // Update profile function
  updateProfile: async (profileData) => {
    const { user } = get()
    if (!user?.id) return { success: false, error: 'User not logged in' }

    try {
      // Update role-specific table (patients, doctors, etc.)
      const tableName = user.role === 'doctor' ? 'doctors' :
        user.role === 'mediator' ? 'mediators' : 'patients'

      // Build update payload based on role - only include relevant fields
      const baseFields = {
        full_name: profileData.fullName,
        phone: profileData.phone,
        address: profileData.address,
        date_of_birth: profileData.dateOfBirth || null,
      }

      // Doctor-specific fields
      const doctorFields = user.role === 'doctor' ? {
        bio: profileData.bio,
        consultation_fee: profileData.consultationFee,
        experience_years: profileData.experienceYears,
      } : {}

      // Patient-specific fields (also used for mediators)
      const patientFields = user.role === 'patient' || user.role === 'mediator' ? {
        blood_group: profileData.bloodGroup,
        emergency_contact: profileData.emergencyContact,
        allergies: profileData.allergies,
      } : {}

      const updatePayload = { ...baseFields, ...doctorFields, ...patientFields }

      // Filter out undefined/null values
      const cleanUpdate = Object.fromEntries(
        Object.entries(updatePayload).filter(([_, v]) => v !== undefined)
      )

      // 1. Update general profiles table
      await supabase
        .from('profiles')
        .update({
          full_name: profileData.fullName,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      // 2. Update role-specific table
      const { data, error } = await supabase
        .from(tableName)
        .update(cleanUpdate)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      // Update local state and localStorage
      const updatedUser = {
        ...user,
        ...data,
        fullName: data.full_name,
        dateOfBirth: data.date_of_birth,
        bloodGroup: data.blood_group,
        emergencyContact: data.emergency_contact
      }

      localStorage.setItem('hospital_user', JSON.stringify(updatedUser))
      set({ user: updatedUser })

      return { success: true, user: updatedUser }
    } catch (error) {
      console.error('Update profile error:', error)
      return { success: false, error: error.message }
    }
  },
}))

export default useAuthStore
