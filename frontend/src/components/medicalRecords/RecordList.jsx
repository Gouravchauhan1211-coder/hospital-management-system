import { useState, useEffect } from 'react'
import { getPatientMedicalRecordsApi, deleteMedicalRecordApi, getMedicalRecordDownloadUrl } from '../../services/api'
import Modal from '../ui/Modal'
import RecordUpload from './RecordUpload'

const TYPE_COLORS = {
  consultation: 'bg-blue-100 text-blue-700',
  lab_result: 'bg-purple-100 text-purple-700',
  prescription: 'bg-green-100 text-green-700',
  imaging: 'bg-orange-100 text-orange-700',
  report: 'bg-yellow-100 text-yellow-700',
  other: 'bg-gray-100 text-gray-700'
}

const TYPE_LABELS = {
  consultation: 'Consultation',
  lab_result: 'Lab Result',
  prescription: 'Prescription',
  imaging: 'Imaging',
  report: 'Report',
  other: 'Other'
}

const RecordCard = ({ record, onDelete, onDownload, onShare }) => {
  const [downloading, setDownloading] = useState(false)

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleDownload = async () => {
    if (!record.file_url) return
    setDownloading(true)
    try {
      const data = await getMedicalRecordDownloadUrl(record.id)
      window.open(data.download_url, '_blank')
    } catch (error) {
      console.error('Download error:', error)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[record.type] || TYPE_COLORS.other}`}>
              {TYPE_LABELS[record.type] || 'Other'}
            </span>
            <span className="text-sm text-gray-500">{formatDate(record.date || record.created_at)}</span>
          </div>
          <h3 className="font-medium text-gray-900 mb-1">{record.title}</h3>
          {record.description && (
            <p className="text-sm text-gray-600 line-clamp-2">{record.description}</p>
          )}
          {record.doctor_name && (
            <p className="text-sm text-gray-500 mt-2">
              By: Dr. {record.doctor_name}
            </p>
          )}
        </div>
        <div className="flex gap-2 ml-4">
          {record.file_url && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Download"
            >
              {downloading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
            </button>
          )}
          <button
            onClick={() => onShare?.(record)}
            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="Share"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete?.(record.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

const RecordList = ({ patientId, showUpload = false }) => {
  const [records, setRecords] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filter, setFilter] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)

  const fetchRecords = async () => {
    try {
      setLoading(true)
      const filters = {}
      if (filter) filters.type = filter
      const data = await getPatientMedicalRecordsApi(patientId, { ...filters, page, limit: 20 })
      setRecords(data.records || [])
      setSummary(data.summary)
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (error) {
      console.error('Error fetching records:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [patientId, page, filter])

  const handleDelete = async (recordId) => {
    try {
      await deleteMedicalRecordApi(recordId)
      setShowDeleteConfirm(null)
      fetchRecords()
    } catch (error) {
      console.error('Error deleting record:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-24" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      {summary && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{summary.total_records}</p>
                <p className="text-sm text-gray-500">Total Records</p>
              </div>
            </div>
            {Object.entries(summary.by_type || {}).map(([type, count]) => (
              <div key={type} className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[type]}`}>
                  {TYPE_LABELS[type]}
                </span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Upload Button */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('')}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filter === '' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(filter === value ? '' : value)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filter === value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {showUpload && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Record
          </button>
        )}
      </div>

      {/* Records List */}
      <div className="space-y-3">
        {records.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No medical records found</p>
            {showUpload && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-4 text-blue-600 hover:text-blue-800"
              >
                Upload your first record
              </button>
            )}
          </div>
        ) : (
          records.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              onDelete={(id) => setShowDeleteConfirm(id)}
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

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Medical Record"
      >
        <RecordUpload
          patientId={patientId}
          onSuccess={() => {
            setShowUploadModal(false)
            fetchRecords()
          }}
          onCancel={() => setShowUploadModal(false)}
        />
      </Modal>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Record</h3>
            <p className="text-gray-600 mb-4">Are you sure you want to delete this medical record? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
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

export default RecordList
export { RecordCard }