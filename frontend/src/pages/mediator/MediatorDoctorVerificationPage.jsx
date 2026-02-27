import { useState, useEffect } from 'react'
import { 
  getPendingDoctors, 
  getDoctorForVerification, 
  verifyDoctor, 
  updateDoctorStatusApi, 
  getVerificationStats,
  getDoctorDocuments 
} from '../../services/api'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'

const DoctorVerificationPage = () => {
  const [doctors, setDoctors] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [processing, setProcessing] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [doctorsData, statsData] = await Promise.all([
        getPendingDoctors(page, 10, statusFilter),
        getVerificationStats()
      ])
      setDoctors(doctorsData.doctors || [])
      setTotalPages(doctorsData.pagination?.totalPages || 1)
      setStats(statsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [page, statusFilter])

  const handleViewDetails = async (doctorId) => {
    try {
      const doctor = await getDoctorForVerification(doctorId)
      setSelectedDoctor(doctor)
      setShowDetailsModal(true)
    } catch (error) {
      console.error('Error fetching doctor details:', error)
    }
  }

  const handleApprove = async (doctorId) => {
    try {
      setProcessing(true)
      await verifyDoctor(doctorId, true, null, 'mediator')
      fetchData()
      setShowDetailsModal(false)
    } catch (error) {
      console.error('Error approving doctor:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedDoctor || !rejectionReason.trim()) return
    try {
      setProcessing(true)
      await verifyDoctor(selectedDoctor.id, false, rejectionReason, 'mediator')
      fetchData()
      setShowRejectModal(false)
      setShowDetailsModal(false)
      setRejectionReason('')
    } catch (error) {
      console.error('Error rejecting doctor:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleStatusChange = async (doctorId, newStatus, reason = '') => {
    try {
      setProcessing(true)
      await updateDoctorStatusApi(doctorId, newStatus, reason, 'mediator')
      fetchData()
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setProcessing(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status, verified) => {
    if (verified) {
      return <Badge variant="success">Verified</Badge>
    }
    const variants = {
      pending: 'warning',
      active: 'success',
      inactive: 'secondary',
      suspended: 'danger',
      rejected: 'danger'
    }
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>
  }

  if (loading && doctors.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded" />
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Doctor Verification</h1>
        <p className="text-gray-600">Review and approve doctor registrations</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total_doctors}</p>
                <p className="text-sm text-gray-500">Total Doctors</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.verified_doctors}</p>
                <p className="text-sm text-gray-500">Verified</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.pending_verifications}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.suspended_doctors}</p>
                <p className="text-sm text-gray-500">Suspended</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['pending', 'active', 'suspended', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(status)
              setPage(1)
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Doctors List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Doctor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Specialization
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Registered
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {doctors.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No doctors found with status "{statusFilter}"
                </td>
              </tr>
            ) : (
              doctors.map((doctor) => (
                <tr key={doctor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        {doctor.profile_image ? (
                          <img src={doctor.profile_image} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <span className="text-blue-600 font-medium">
                            {doctor.full_name?.charAt(0) || 'D'}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{doctor.full_name}</p>
                        <p className="text-sm text-gray-500">{doctor.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {doctor.specialization}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {doctor.department?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(doctor.status, doctor.verified)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(doctor.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleViewDetails(doctor.id)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      View
                    </button>
                    {statusFilter === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(doctor.id)}
                          disabled={processing}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDoctor(doctor)
                            setShowRejectModal(true)
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {statusFilter === 'active' && (
                      <button
                        onClick={() => handleStatusChange(doctor.id, 'suspended', 'Account suspended')}
                        className="text-red-600 hover:text-red-900"
                      >
                        Suspend
                      </button>
                    )}
                    {statusFilter === 'suspended' && (
                      <button
                        onClick={() => handleStatusChange(doctor.id, 'active')}
                        className="text-green-600 hover:text-green-900"
                      >
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

      {/* Doctor Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Doctor Details"
        size="lg"
      >
        {selectedDoctor && (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                {selectedDoctor.profile_image ? (
                  <img src={selectedDoctor.profile_image} alt="" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <span className="text-2xl text-blue-600 font-medium">
                    {selectedDoctor.full_name?.charAt(0) || 'D'}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{selectedDoctor.full_name}</h3>
                <p className="text-gray-600">{selectedDoctor.specialization}</p>
                <div className="flex gap-2 mt-2">
                  {getStatusBadge(selectedDoctor.status, selectedDoctor.verified)}
                  {selectedDoctor.rating > 0 && (
                    <span className="text-sm text-gray-500">
                      ⭐ {selectedDoctor.rating.toFixed(1)} ({selectedDoctor.review_count} reviews)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{selectedDoctor.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{selectedDoctor.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Qualification</p>
                <p className="font-medium">{selectedDoctor.qualification || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Experience</p>
                <p className="font-medium">{selectedDoctor.experience_years || 0} years</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Registration Number</p>
                <p className="font-medium">{selectedDoctor.registration_number || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="font-medium">{selectedDoctor.department?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Branch</p>
                <p className="font-medium">{selectedDoctor.branch?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Appointments</p>
                <p className="font-medium">{selectedDoctor.appointments_count || 0}</p>
              </div>
            </div>

            {/* Recent Reviews */}
            {selectedDoctor.recent_reviews?.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Recent Reviews</h4>
                <div className="space-y-2">
                  {selectedDoctor.recent_reviews.map((review, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-yellow-400">{'★'.repeat(review.rating)}</span>
                        <span className="text-sm text-gray-500">{review.patient_name}</span>
                      </div>
                      {review.comment && <p className="text-sm text-gray-600">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {statusFilter === 'pending' && (
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => handleApprove(selectedDoctor.id)}
                  disabled={processing}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false)
                    setShowRejectModal(true)
                  }}
                  disabled={processing}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false)
          setRejectionReason('')
        }}
        title="Reject Doctor Application"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Please provide a reason for rejecting this doctor's application.
          </p>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
            placeholder="Enter rejection reason..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
          />
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowRejectModal(false)
                setRejectionReason('')
              }}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={!rejectionReason.trim() || processing}
              className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Reject Application
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default DoctorVerificationPage