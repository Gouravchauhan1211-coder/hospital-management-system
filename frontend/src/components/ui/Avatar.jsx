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
    if (!name) return 'bg-primary-500'
    const colors = [
      'bg-primary-500',
      'bg-accent-purple',
      'bg-accent-pink',
      'bg-accent-teal',
      'bg-success',
      'bg-info',
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
          'rounded-full object-cover ring-2 ring-white/20',
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
          'rounded-full flex items-center justify-center font-medium text-white ring-2 ring-white/20',
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
        'rounded-full flex items-center justify-center bg-white/10 text-white/60 ring-2 ring-white/20',
        sizes[size],
        className
      )}
    >
      <User className="w-1/2 h-1/2" />
    </div>
  )
}

export default Avatar
