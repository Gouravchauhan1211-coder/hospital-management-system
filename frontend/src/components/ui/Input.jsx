import { forwardRef } from 'react'
import { clsx } from 'clsx'

const Input = forwardRef(({ 
  label,
  error,
  icon: Icon,
  className,
  type = 'text',
  ...props 
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-white/80 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={clsx(
            'w-full px-4 py-3 rounded-xl',
            'bg-white/10 backdrop-blur-md border border-white/20',
            'text-white placeholder-white/40',
            'outline-none transition-all duration-200',
            'focus:border-white/40 focus:bg-white/15',
            'focus:shadow-[0_0_20px_rgba(255,255,255,0.1)]',
            error && 'border-error/50 focus:border-error/70',
            Icon && 'pl-10',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
