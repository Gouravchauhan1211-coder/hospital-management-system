import { useState } from 'react'
import { Send } from 'lucide-react'

const MessageInput = ({ onSend, disabled }) => {
    const [text, setText] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()
        const trimmed = text.trim()
        if (!trimmed || disabled) return
        onSend(trimmed)
        setText('')
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e)
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-3 py-3 bg-white border-t border-gray-200"
        >
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                disabled={disabled}
                className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
            />
            <button
                type="submit"
                disabled={!text.trim() || disabled}
                className="w-9 h-9 flex items-center justify-center bg-blue-500 text-white rounded-full disabled:opacity-40 active:scale-95 transition-transform"
            >
                <Send className="w-4 h-4" />
            </button>
        </form>
    )
}

export default MessageInput
