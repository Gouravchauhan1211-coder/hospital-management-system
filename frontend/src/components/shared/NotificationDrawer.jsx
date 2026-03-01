import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, Calendar, MessageSquare, CheckCircle, Info, Clock, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

const NotificationDrawer = ({ isOpen, onClose, notifications = [] }) => {
    const formatTimeAgo = (dateStr) => {
        try {
            const minDiff = Math.floor((new Date() - new Date(dateStr)) / 60000)
            if (minDiff < 1) return 'Just now'
            if (minDiff < 60) return `${minDiff}m ago`
            if (minDiff < 1440) return `${Math.floor(minDiff / 60)}h ago`
            return format(new Date(dateStr), 'MMM d')
        } catch { return 'Recent' }
    }

    const getIcon = (type) => {
        switch (type) {
            case 'appointment': return <Calendar className="w-5 h-5 text-blue-500" />
            case 'message': return <MessageSquare className="w-5 h-5 text-green-500" />
            case 'success': return <CheckCircle className="w-5 h-5 text-emerald-500" />
            default: return <Bell className="w-5 h-5 text-blue-500" />
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl z-[70] flex flex-col transition-colors"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Notifications</h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Updates & Alerts</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-400"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                            {notifications.length > 0 ? (
                                notifications.map((note, index) => (
                                    <motion.div
                                        key={note.id || index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-3xl border border-gray-100 dark:border-slate-700/50 flex gap-4 hover:border-blue-200 dark:hover:border-blue-900/30 transition-all group"
                                    >
                                        <div className="w-12 h-12 shrink-0 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center transition-colors">
                                            {getIcon(note.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{note.title}</h4>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap ml-2">
                                                    {formatTimeAgo(note.created_at)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{note.message}</p>

                                            {/* Action Hint */}
                                            <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter">
                                                View Details <ChevronRight className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                                    <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                        <Bell className="w-10 h-10 text-gray-300" />
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">All clear!</h3>
                                    <p className="text-xs text-gray-500">No new notifications for you right now.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 dark:border-slate-800">
                            <button
                                className="w-full py-4 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-2xl text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest transition-all"
                                onClick={onClose}
                            >
                                Mark all as read
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default NotificationDrawer
