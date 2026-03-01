import { motion } from 'framer-motion'
import { clsx } from 'clsx'

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  trendValue,
  color = 'primary',
  delay = 0 
}) => {
  const colors = {
    primary: 'from-primary-500 to-primary-600',
    purple: 'from-accent-purple to-accent-pink',
    teal: 'from-accent-teal to-success',
    pink: 'from-accent-pink to-error',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="relative overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100 p-6"
    >
      {/* Background gradient */}
      <div 
        className={clsx(
          'absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-10 blur-2xl',
          colors[color]
        )} 
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
          {trend && (
            <p className={clsx(
              'text-sm mt-2',
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            )}>
              {trend === 'up' ? '↑' : '↓'} {trendValue}
            </p>
          )}
        </div>
        {Icon && (
          <div className={clsx(
            'p-3 rounded-xl bg-gradient-to-br',
            colors[color]
          )}>
            <Icon className="w-6 h-6 text-gray-800" />
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default StatCard


