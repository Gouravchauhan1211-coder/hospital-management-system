import { motion } from 'framer-motion'
import { clsx } from 'clsx'

const GlassCard = ({ 
  children, 
  className, 
  hover = true, 
  animate = true,
  delay = 0,
  ...props 
}) => {
  const baseClasses = clsx(
    'bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-glass',
    'transition-all duration-300 ease-out',
    hover && 'hover:bg-white/15 hover:shadow-glass-lg hover:-translate-y-0.5',
    className
  )

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay, ease: 'easeOut' }}
        className={baseClasses}
        {...props}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div className={baseClasses} {...props}>
      {children}
    </div>
  )
}

export default GlassCard
