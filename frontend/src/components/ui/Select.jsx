import { forwardRef } from 'react'
import { clsx } from 'clsx'
import { ChevronDown } from 'lucide-react'

const Select = forwardRef(({ 
  label,
  error,
  options = [],
  placeholder = 'Select an option',
  className,
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
        <select
          ref={ref}
          className={clsx(
            'w-full px-4 py-3 rounded-xl appearance-none cursor-pointer',
            'bg-white/10 backdrop-blur-md border border-white/20',
            'text-white',
            'outline-none transition-all duration-200',
            'focus:border-white/40 focus:bg-white/15',
            'focus:shadow-[0_0_20px_rgba(255,255,255,0.1)]',
            error && 'border-error/50 focus:border-error/70',
            className
          )}
          {...props}
        >
          <option value="" disabled className="bg-gray-800 text-white">
            {placeholder}
          </option>
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              className="bg-gray-800 text-white"
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
          <ChevronDown className="w-5 h-5" />
        </div>
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  )
})

Select.displayName = 'Select'

export default Select
