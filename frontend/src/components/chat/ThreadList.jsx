import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, Search } from 'lucide-react'
import { Avatar } from '../ui'

// Returns the name of the other participant based on the current user's role
const getOtherName = (thread, userRole) =>
    userRole === 'patient'
        ? (thread.doctor_name || 'Doctor')
        : (thread.patient_name || 'Patient')

const ThreadList = ({
    threads,
    userRole,
    onSelect,
    selectedThreadId,
    searchQuery,
    onSearchChange,
    isLoading,
}) => {
    if (isLoading) {
        return (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="w-12 h-12 rounded-full bg-gray-200" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-1/2" />
                            <div className="h-3 bg-gray-200 rounded w-3/4" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Search bar */}
            <div className="px-3 py-2 shrink-0">
                <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-2">
                    <Search className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={e => onSearchChange(e.target.value)}
                        className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
                    />
                </div>
            </div>

            {/* Thread items */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {threads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
                        <MessageSquare className="w-10 h-10" />
                        <p className="text-sm font-medium">No conversations yet</p>
                        {userRole === 'patient' && (
                            <p className="text-xs text-center px-6">Tap "New Chat" to message a doctor</p>
                        )}
                    </div>
                ) : (
                    threads.map(thread => {
                        const otherName = getOtherName(thread, userRole)
                        const isSelected = thread.id === selectedThreadId
                        return (
                            <button
                                key={thread.id}
                                onClick={() => onSelect(thread)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50 active:bg-gray-100'
                                    }`}
                            >
                                <Avatar name={otherName} size="md" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-semibold text-gray-900 text-sm truncate">{otherName}</p>
                                        {thread.last_message_at && (
                                            <span className="text-[11px] text-gray-400 shrink-0 whitespace-nowrap">
                                                {formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: false })}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between gap-2 mt-0.5">
                                        <p className="text-xs text-gray-500 truncate">
                                            {thread.last_message || 'No messages yet'}
                                        </p>
                                        {thread.unread_count > 0 && (
                                            <span className="shrink-0 bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                                {thread.unread_count > 9 ? '9+' : thread.unread_count}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        )
                    })
                )}
            </div>
        </div>
    )
}

export default ThreadList
