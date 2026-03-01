import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className,
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  ...props 
}) => {
  const baseClasses = clsx(
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg',
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  )

  const variants = {
    primary: clsx(
      'bg-blue-600 text-white',
      'hover:bg-blue-700',
      'active:bg-blue-800'
    ),
    secondary: clsx(
      'bg-gray-200 text-gray-800',
      'hover:bg-gray-300',
      'active:bg-gray-400'
    ),
    danger: clsx(
      'bg-red-600 text-white',
      'hover:bg-red-700',
      'active:bg-red-800'
    ),
    success: clsx(
      'bg-green-600 text-white',
      'hover:bg-green-700',
      'active:bg-green-800'
    ),
    ghost: clsx(
      'text-gray-600 hover:bg-gray-100',
      'active:bg-gray-200'
    ),
    outline: clsx(
      'border-2 border-gray-300 text-gray-700',
      'hover:bg-gray-50',
      'active:bg-gray-100'
    ),
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      className={clsx(
        baseClasses,
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <Loader2 className="w-4 h-4 animate-spin" />
      )}
      {!loading && Icon && iconPosition === 'left' && (
        <Icon className="w-4 h-4" />
      )}
      {children}
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="w-4 h-4" />
      )}
    </button>
  )
}

export default Button


