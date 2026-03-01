import { format } from 'date-fns'

const MessageBubble = ({ message, isOwn }) => {
    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
            <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm break-words ${isOwn
                        ? 'bg-blue-500 text-white rounded-br-sm'
                        : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
                    }`}
            >
                <p>{message.text}</p>
                <p className={`text-[10px] mt-1 ${isOwn ? 'text-blue-100 text-right' : 'text-gray-400'}`}>
                    {message.created_at && format(new Date(message.created_at), 'h:mm a')}
                </p>
            </div>
        </div>
    )
}

export default MessageBubble
