import { Link } from 'react-router-dom'
import { ArrowLeft, Clock } from 'lucide-react'
import Button from '../ui/Button'

const ComingSoon = ({ featureName = 'This Feature' }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Coming Soon
        </h1>
        <p className="text-gray-600 mb-6">
          {featureName} is currently under development. 
          Check back soon for updates!
        </p>
        <Link to="/">
          <Button variant="primary">
            <ArrowLeft className="w-4 h-4" />
            Go Back Home
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default ComingSoon


