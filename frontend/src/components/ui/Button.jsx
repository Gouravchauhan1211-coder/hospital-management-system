import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

const Button = ({ 
  children, 
  variant = 'glass', 
  size = 'md', 
  className,
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  ...props 
}) => {
  const baseClasses = clsx(
    'inline-flex items-center justify-center gap-2 font-medium rounded-xl',
    'transition-all duration-200 ease-out',
    'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-transparent',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
  )

  const variants = {
    glass: clsx(
      'bg-white/10 backdrop-blur-md border border-white/20 text-white',
      'hover:bg-white/20 hover:scale-[1.02]',
      'active:bg-white/15 active:scale-[0.98]'
    ),
    primary: clsx(
      'bg-gradient-to-r from-primary-500 to-accent-purple text-white',
      'hover:from-primary-600 hover:to-accent-purple/90 hover:scale-[1.02]',
      'active:scale-[0.98]',
      'shadow-lg shadow-primary-500/25'
    ),
    secondary: clsx(
      'bg-white/20 backdrop-blur-md border border-white/30 text-white',
      'hover:bg-white/30 hover:scale-[1.02]',
      'active:bg-white/25 active:scale-[0.98]'
    ),
    danger: clsx(
      'bg-error/20 backdrop-blur-md border border-error/30 text-error',
      'hover:bg-error/30 hover:scale-[1.02]',
      'active:bg-error/25 active:scale-[0.98]'
    ),
    success: clsx(
      'bg-success/20 backdrop-blur-md border border-success/30 text-success',
      'hover:bg-success/30 hover:scale-[1.02]',
      'active:bg-success/25 active:scale-[0.98]'
    ),
    ghost: clsx(
      'text-white/70 hover:text-white hover:bg-white/10',
      'active:bg-white/5'
    ),
    outline: clsx(
      'border-2 border-white/30 text-white',
      'hover:bg-white/10 hover:border-white/50',
      'active:bg-white/5'
    ),
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
  }

  return (
    <motion.button
      whileHover={disabled || loading ? {} : { scale: 1.02 }}
      whileTap={disabled || loading ? {} : { scale: 0.98 }}
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
    </motion.button>
  )
}

export default Button
