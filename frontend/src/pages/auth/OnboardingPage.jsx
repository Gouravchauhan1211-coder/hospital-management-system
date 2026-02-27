import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Stethoscope, Calendar, Shield, Heart } from 'lucide-react'
import Button from '../../components/ui/Button'

const slides = [
  {
    icon: Stethoscope,
    title: 'Find Expert Doctors',
    description: 'Connect with verified healthcare professionals across various specializations.',
    color: 'from-primary-500 to-primary-600',
  },
  {
    icon: Calendar,
    title: 'Easy Appointments',
    description: 'Book appointments with just a few clicks. Manage your healthcare schedule effortlessly.',
    color: 'from-accent-purple to-accent-pink',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your medical records and personal information are protected with enterprise-grade security.',
    color: 'from-accent-teal to-success',
  },
  {
    icon: Heart,
    title: 'Your Health, Our Priority',
    description: 'Get personalized healthcare experience with MediCare. Start your journey to better health today.',
    color: 'from-accent-pink to-error',
  },
]

const OnboardingPage = () => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const navigate = useNavigate()

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    } else {
      navigate('/role-selection')
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const slide = slides[currentSlide]
  const Icon = slide.icon

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* Animated background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute -top-40 -left-40 w-80 h-80 bg-primary-500/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute top-1/2 -right-40 w-96 h-96 bg-accent-purple/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute -bottom-40 left-1/3 w-72 h-72 bg-accent-pink/30 rounded-full blur-3xl"
        />
      </div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-12"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center">
          <Stethoscope className="w-6 h-6 text-white" />
        </div>
        <span className="text-2xl font-bold text-white font-display">MediCare</span>
      </motion.div>

      {/* Slide content */}
      <div className="relative w-full max-w-md">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            {/* Icon */}
            <div className={`w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br ${slide.color} flex items-center justify-center shadow-glass-lg`}>
              <Icon className="w-12 h-12 text-white" />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-white mb-4 font-display">
              {slide.title}
            </h1>

            {/* Description */}
            <p className="text-white/70 text-lg mb-8">
              {slide.description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'w-8 bg-white' 
                  : 'bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between gap-4">
          <Button
            variant="ghost"
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className={`${currentSlide === 0 ? 'invisible' : ''}`}
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </Button>
          <Button
            variant="primary"
            onClick={nextSlide}
          >
            {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Skip button */}
      {currentSlide < slides.length - 1 && (
        <button
          onClick={() => navigate('/role-selection')}
          className="mt-8 text-white/50 hover:text-white transition-colors"
        >
          Skip
        </button>
      )}
    </div>
  )
}

export default OnboardingPage
