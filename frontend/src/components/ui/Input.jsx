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
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={clsx(
            'w-full px-4 py-2.5 rounded-lg',
            'bg-white border border-gray-300',
            'text-gray-800 placeholder-gray-400',
            'outline-none transition-all duration-200',
            'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
            error && 'border-red-500 focus:border-red-500',
            Icon && 'pl-10',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input


