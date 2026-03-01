import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Stethoscope, Calendar, Shield, Heart } from 'lucide-react'
import Button from '../../components/ui/Button'

const slides = [
  {
    icon: Stethoscope,
    title: 'Find Expert Doctors',
    description: 'Connect with verified healthcare professionals across various specializations.',
    color: 'bg-blue-500',
  },
  {
    icon: Calendar,
    title: 'Easy Appointments',
    description: 'Book appointments with just a few clicks. Manage your healthcare schedule effortlessly.',
    color: 'bg-green-500',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your medical records and personal information are protected with enterprise-grade security.',
    color: 'bg-teal-500',
  },
  {
    icon: Heart,
    title: 'Your Health, Our Priority',
    description: 'Get personalized healthcare experience with MediCare.',
    color: 'bg-red-500',
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
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-12">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
          <Stethoscope className="w-6 h-6 text-gray-800" />
        </div>
        <span className="text-2xl font-bold text-gray-800">MediCare</span>
      </div>

      {/* Slide content */}
      <div className="w-full max-w-md">
        {/* Icon */}
        <div className={`w-24 h-24 mx-auto mb-8 rounded-2xl ${slide.color} flex items-center justify-center shadow-lg`}>
          <Icon className="w-12 h-12 text-gray-800" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          {slide.title}
        </h1>

        {/* Description */}
        <p className="text-gray-600 text-center mb-8">
          {slide.description}
        </p>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'w-8 bg-blue-600' 
                  : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={prevSlide}
            className={`${currentSlide === 0 ? 'invisible' : ''}`}
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </Button>
          <Button variant="primary" onClick={nextSlide}>
            {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Skip button */}
      {currentSlide < slides.length - 1 && (
        <button
          onClick={() => navigate('/role-selection')}
          className="mt-8 text-gray-500 hover:text-gray-700"
        >
          Skip
        </button>
      )}
    </div>
  )
}

export default OnboardingPage



