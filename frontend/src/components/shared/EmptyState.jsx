import { motion } from 'framer-motion'
import { FileQuestion } from 'lucide-react'

const EmptyState = ({ 
  icon: Icon = FileQuestion, 
  title = 'No data found', 
  description = 'There is no data to display at the moment.',
  action
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-4"
    >
      <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-4">
        <Icon className="w-10 h-10 text-white/40" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-white/60 text-center max-w-sm mb-6">{description}</p>
      {action}
    </motion.div>
  )
}

export default EmptyState
