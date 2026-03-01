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
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          className={clsx(
            'w-full px-4 py-2.5 rounded-lg appearance-none cursor-pointer',
            'bg-white border border-gray-300',
            'text-gray-800',
            'outline-none transition-all duration-200',
            'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
            error && 'border-red-500 focus:border-red-500',
            className
          )}
          {...props}
        >
          <option value="" disabled className="bg-white text-gray-500">
            {placeholder}
          </option>
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              className="bg-white text-gray-800"
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <ChevronDown className="w-5 h-5" />
        </div>
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  )
})

Select.displayName = 'Select'

export default Select


