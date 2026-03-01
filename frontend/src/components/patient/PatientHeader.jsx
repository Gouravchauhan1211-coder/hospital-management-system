import { Bell } from 'lucide-react'

const PatientHeader = ({ profile, onNotificationClick, hasNotifications }) => {
    const firstName = profile?.full_name?.split(' ')[0] || 'User'

    return (
        <header className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                {profile?.avatar_url ? (
                    <img
                        src={profile.avatar_url}
                        alt={profile.full_name}
                        className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover"
                    />
                ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg border-2 border-white shadow-sm">
                        {firstName.charAt(0)}
                    </div>
                )}
                <div>
                    <p className="text-xs text-gray-500 font-medium">Welcome back</p>
                    <h1 className="text-lg font-bold text-gray-900 leading-tight">Hello, {profile?.full_name || 'User'}</h1>
                </div>
            </div>
            <button
                onClick={onNotificationClick}
                className="relative p-2.5 bg-white rounded-xl shadow-sm border border-gray-50 transition-all hover:bg-gray-50 active:scale-95"
            >
                <Bell className="w-5 h-5 text-gray-700" />
                {hasNotifications && (
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                )}
            </button>
        </header>
    )
}

export default PatientHeader
