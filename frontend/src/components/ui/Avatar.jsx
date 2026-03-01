import { clsx } from 'clsx'
import { User } from 'lucide-react'

const Avatar = ({ 
  src, 
  alt = 'Avatar', 
  size = 'md',
  name,
  className 
}) => {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl',
  }

  // Get initials from name
  const getInitials = (name) => {
    if (!name) return ''
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Generate a consistent color based on name
  const getColorClass = (name) => {
    if (!name) return 'bg-blue-500'
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-teal-500',
      'bg-green-500',
      'bg-indigo-500',
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={clsx(
          'rounded-full object-cover',
          sizes[size],
          className
        )}
      />
    )
  }

  if (name) {
    return (
      <div
        className={clsx(
          'rounded-full flex items-center justify-center font-medium text-gray-800',
          sizes[size],
          getColorClass(name),
          className
        )}
      >
        {getInitials(name)}
      </div>
    )
  }

  return (
    <div
      className={clsx(
        'rounded-full flex items-center justify-center bg-gray-200 text-gray-500',
        sizes[size],
        className
      )}
    >
      <User className="w-1/2 h-1/2" />
    </div>
  )
}

export default Avatar


