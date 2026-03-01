import { clsx } from 'clsx'

const Skeleton = ({ 
  className, 
  variant = 'text',
  width,
  height,
  rounded = 'md'
}) => {
  const variants = {
    text: 'h-4',
    circular: 'rounded-full',
    rectangular: '',
    card: 'h-32 rounded-2xl',
    avatar: 'w-10 h-10 rounded-full',
    button: 'h-10 w-24 rounded-xl',
  }

  const roundeds = {
    none: 'rounded-none',
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  }

  return (
    <div
      className={clsx(
        'bg-gray-100 animate-pulse',
        variants[variant],
        roundeds[rounded],
        className
      )}
      style={{ width, height }}
    />
  )
}

// Skeleton presets for common use cases
export const CardSkeleton = () => (
  <div className="bg-gray-100 backdrop-blur-xl border border-white/20 rounded-2xl p-6 space-y-4">
    <div className="flex items-center gap-4">
      <Skeleton variant="avatar" />
      <div className="flex-1 space-y-2">
        <Skeleton className="w-3/4 h-4" />
        <Skeleton className="w-1/2 h-3" />
      </div>
    </div>
    <Skeleton className="w-full h-20" />
    <div className="flex gap-2">
      <Skeleton className="w-20 h-6" rounded="full" />
      <Skeleton className="w-20 h-6" rounded="full" />
    </div>
  </div>
)

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="space-y-3">
    <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
      <Skeleton className="w-1/4 h-4" />
      <Skeleton className="w-1/4 h-4" />
      <Skeleton className="w-1/4 h-4" />
      <Skeleton className="w-1/4 h-4" />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
        <Skeleton className="w-1/4 h-4" />
        <Skeleton className="w-1/4 h-4" />
        <Skeleton className="w-1/4 h-4" />
        <Skeleton className="w-1/4 h-4" />
      </div>
    ))}
  </div>
)

export const StatCardSkeleton = () => (
  <div className="bg-gray-100 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
    <Skeleton className="w-12 h-12 rounded-xl mb-4" />
    <Skeleton className="w-24 h-8 mb-2" />
    <Skeleton className="w-32 h-4" />
  </div>
)

export default Skeleton


