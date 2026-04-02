import { clsx } from 'clsx'

const Badge = ({ 
  children, 
  variant = 'default', 
  size = 'md',
  className 
}) => {
  const getVariantStyle = () => {
    switch(variant) {
      case 'primary':
      case 'info':
        return { backgroundColor: '#3b82f6', color: '#ffffff' }
      case 'success':
        return { backgroundColor: '#22c55e', color: '#ffffff' }
      case 'warning':
        return { backgroundColor: '#f59e0b', color: '#ffffff' }
      case 'error':
        return { backgroundColor: '#ef4444', color: '#ffffff' }
      case 'purple':
        return { backgroundColor: '#a855f7', color: '#ffffff' }
      case 'pink':
        return { backgroundColor: '#ec4899', color: '#ffffff' }
      case 'teal':
        return { backgroundColor: '#14b8a6', color: '#ffffff' }
      default:
        return { backgroundColor: '#e5e7eb', color: '#1f2937' }
    }
  }

  const sizeStyle = {
    sm: { padding: '2px 8px', fontSize: '11px' },
    md: { padding: '4px 10px', fontSize: '12px' },
    lg: { padding: '6px 12px', fontSize: '14px' },
  }

  const style = { ...getVariantStyle(), ...sizeStyle[size] }

  return (
    <span
      className={clsx(
        'inline-flex items-center font-bold rounded-full',
        className
      )}
      style={style}
    >
      {children}
    </span>
  )
}

export default Badge
