import { useState } from 'react'
import { createReviewApi, updateReviewApi } from '../../services/api'

const StarRating = ({ rating, setRating, readonly = false }) => {
  const [hover, setHover] = useState(0)

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`text-2xl transition-colors ${
            readonly ? 'cursor-default' : 'cursor-pointer'
          }`}
          onClick={() => !readonly && setRating && setRating(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
        >
          <span
            className={
              (hover || rating) >= star ? 'text-yellow-400' : 'text-gray-300'
            }
          >
            ★
          </span>
        </button>
      ))}
    </div>
  )
}

const ReviewForm = ({
  doctorId,
  patientId,
  appointmentId,
  existingReview = null,
  onSuccess,
  onCancel
}) => {
  const [rating, setRating] = useState(existingReview?.rating || 0)
  const [comment, setComment] = useState(existingReview?.comment || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    setLoading(true)

    try {
      const reviewData = {
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_id: appointmentId,
        rating,
        comment: comment.trim() || null
      }

      if (existingReview) {
        await updateReviewApi(existingReview.id, {
          rating,
          comment: comment.trim() || null,
          patient_id: patientId
        })
      } else {
        await createReviewApi(reviewData)
      }

      onSuccess?.()
    } catch (err) {
      setError(err.message || 'Failed to submit review')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Rating
        </label>
        <StarRating rating={rating} setRating={setRating} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Review (Optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="Share your experience with this doctor..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || rating === 0}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            loading || rating === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {loading ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

export default ReviewForm
export { StarRating }
