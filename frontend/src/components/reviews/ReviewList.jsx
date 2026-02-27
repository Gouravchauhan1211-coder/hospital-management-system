import { useState, useEffect } from 'react'
import { getDoctorReviewsApi, deleteReviewApi } from '../../services/api'
import { StarRating } from './ReviewForm'
import Modal from '../ui/Modal'
import ReviewForm from './ReviewForm'

const ReviewCard = ({ review, currentPatientId, onEdit, onDelete }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const isOwner = currentPatientId && review.patient_id === currentPatientId

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-medium">
                {review.patient_name?.charAt(0) || 'P'}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {review.patient_name || 'Anonymous'}
              </p>
              <p className="text-sm text-gray-500">{formatDate(review.created_at)}</p>
            </div>
          </div>
          <StarRating rating={review.rating} readonly />
          {review.comment && (
            <p className="mt-3 text-gray-700">{review.comment}</p>
          )}
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <button
              onClick={() => onEdit?.(review)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Edit
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Review</h3>
            <p className="text-gray-600 mb-4">Are you sure you want to delete this review?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete?.(review.id)
                  setShowDeleteConfirm(false)
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const ReviewList = ({ doctorId, patientId, showWriteReview = false }) => {
  const [reviews, setReviews] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [editingReview, setEditingReview] = useState(null)

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const data = await getDoctorReviewsApi(doctorId, page, 10)
      setReviews(data.reviews || [])
      setStats(data.stats)
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [doctorId, page])

  const handleDelete = async (reviewId) => {
    try {
      await deleteReviewApi(reviewId, patientId)
      fetchReviews()
    } catch (error) {
      console.error('Error deleting review:', error)
    }
  }

  const handleEdit = (review) => {
    setEditingReview(review)
    setShowReviewForm(true)
  }

  const handleSuccess = () => {
    setShowReviewForm(false)
    setEditingReview(null)
    fetchReviews()
  }

  const RatingBar = ({ rating, count, total }) => {
    const percentage = total > 0 ? (count / total) * 100 : 0
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 w-8">{rating}★</span>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-400 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm text-gray-500 w-8">{count}</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-32" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Section */}
      {stats && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Overall Rating */}
            <div className="flex items-center gap-4">
              <div className="text-5xl font-bold text-gray-900">
                {stats.average_rating}
              </div>
              <div>
                <StarRating rating={Math.round(stats.average_rating)} readonly />
                <p className="text-sm text-gray-500 mt-1">
                  {stats.total_reviews} reviews
                </p>
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((rating) => (
                <RatingBar
                  key={rating}
                  rating={rating}
                  count={stats.rating_distribution?.[rating] || 0}
                  total={stats.total_reviews}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Write Review Button */}
      {showWriteReview && patientId && (
        <button
          onClick={() => setShowReviewForm(true)}
          className="w-full py-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
        >
          Write a Review
        </button>
      )}

      {/* Review Form Modal */}
      {showReviewForm && (
        <Modal
          isOpen={showReviewForm}
          onClose={() => {
            setShowReviewForm(false)
            setEditingReview(null)
          }}
          title={editingReview ? 'Edit Review' : 'Write a Review'}
        >
          <ReviewForm
            doctorId={doctorId}
            patientId={patientId}
            existingReview={editingReview}
            onSuccess={handleSuccess}
            onCancel={() => {
              setShowReviewForm(false)
              setEditingReview(null)
            }}
          />
        </Modal>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No reviews yet. Be the first to review!
          </div>
        ) : (
          reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              currentPatientId={patientId}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default ReviewList
export { ReviewCard }
