import { create } from 'zustand'

const useThemeStore = create((set) => ({
    theme: localStorage.getItem('theme') || 'system',

    setTheme: (theme) => {
        localStorage.setItem('theme', theme)
        set({ theme })
        applyTheme(theme)
    },

    initTheme: () => {
        const theme = localStorage.getItem('theme') || 'system'
        applyTheme(theme)
    }
}))

const applyTheme = (theme) => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    let effectiveTheme = theme
    if (theme === 'system') {
        effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    root.classList.add(effectiveTheme)

    // Also update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', effectiveTheme === 'dark' ? '#0f172a' : '#f9fafb')
    }
}

export default useThemeStore
