import { useState, useEffect } from 'react'
import { getPatientPrescriptionsApi, getPrescriptionForPrint, completePrescription } from '../../services/api'
import Modal from '../ui/Modal'
import Badge from '../ui/Badge'

const PrescriptionCard = ({ prescription, onView, onComplete, showPatient = false }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status) => {
    const variants = {
      active: 'success',
      completed: 'secondary',
      cancelled: 'danger'
    }
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900">
              {prescription.medications?.length || 0} Medication(s)
            </span>
            {getStatusBadge(prescription.status)}
          </div>
          <p className="text-sm text-gray-500">
            Prescribed: {formatDate(prescription.prescribed_date)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onView?.(prescription)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View Details"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button
            onClick={() => onView?.(prescription, true)}
            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="Print"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Doctor Info */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span>Dr. {prescription.doctor_name}</span>
      </div>

      {/* Medications Preview */}
      <div className="space-y-1">
        {prescription.medications?.slice(0, 3).map((med, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-gray-700">{med.name}</span>
            {med.dosage && <span className="text-gray-500">- {med.dosage}</span>}
          </div>
        ))}
        {prescription.medications?.length > 3 && (
          <p className="text-sm text-gray-500 pl-4">
            +{prescription.medications.length - 3} more
          </p>
        )}
      </div>

      {/* Follow-up */}
      {prescription.follow_up_date && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-sm text-orange-600">
            Follow-up: {formatDate(prescription.follow_up_date)}
          </p>
        </div>
      )}
    </div>
  )
}

const PrescriptionDetail = ({ prescription, onPrint, onComplete }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Prescription</h3>
          <p className="text-sm text-gray-500">Date: {formatDate(prescription.prescribed_date)}</p>
        </div>
        <Badge variant={prescription.status === 'active' ? 'success' : 'secondary'}>
          {prescription.status}
        </Badge>
      </div>

      {/* Doctor & Patient Info */}
      <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
        <div>
          <p className="text-sm text-gray-500">Doctor</p>
          <p className="font-medium">Dr. {prescription.doctor?.full_name || prescription.doctor_name}</p>
          {prescription.doctor?.specialization && (
            <p className="text-sm text-gray-600">{prescription.doctor.specialization}</p>
          )}
        </div>
        {prescription.patient && (
          <div>
            <p className="text-sm text-gray-500">Patient</p>
            <p className="font-medium">{prescription.patient.full_name}</p>
          </div>
        )}
      </div>

      {/* Medications */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Medications</h4>
        <div className="space-y-3">
          {prescription.medications?.map((med, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">{med.name}</p>
                  <div className="flex gap-4 mt-1 text-sm text-gray-600">
                    {med.dosage && <span>Dosage: {med.dosage}</span>}
                    {med.frequency && <span>Frequency: {med.frequency}</span>}
                    {med.duration && <span>Duration: {med.duration}</span>}
                  </div>
                  {med.instructions && (
                    <p className="text-sm text-gray-500 mt-1">
                      Instructions: {med.instructions}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {prescription.notes && (
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
          <p className="text-gray-600 bg-gray-50 rounded-lg p-3">{prescription.notes}</p>
        </div>
      )}

      {/* Follow-up */}
      {prescription.follow_up_date && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-orange-800">
            <span className="font-medium">Follow-up Date:</span>{' '}
            {formatDate(prescription.follow_up_date)}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={() => onPrint?.(prescription)}
          className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print
        </button>
        {prescription.status === 'active' && onComplete && (
          <button
            onClick={() => onComplete(prescription.id)}
            className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Mark as Completed
          </button>
        )}
      </div>
    </div>
  )
}

const PrescriptionList = ({ patientId, showActions = true }) => {
  const [prescriptions, setPrescriptions] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedPrescription, setSelectedPrescription] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const fetchPrescriptions = async () => {
    try {
      setLoading(true)
      const filters = {}
      if (statusFilter) filters.status = statusFilter
      const data = await getPatientPrescriptionsApi(patientId, { ...filters, page, limit: 20 })
      setPrescriptions(data.prescriptions || [])
      setSummary(data.summary)
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (error) {
      console.error('Error fetching prescriptions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrescriptions()
  }, [patientId, page, statusFilter])

  const handleView = (prescription, print = false) => {
    setSelectedPrescription(prescription)
    setShowDetailModal(true)
    if (print) {
      handlePrint(prescription.id)
    }
  }

  const handlePrint = async (prescriptionId) => {
    try {
      const printData = await getPrescriptionForPrint(prescriptionId)
      // Open print window
      const printWindow = window.open('', '_blank')
      printWindow.document.write(`
        <html>
          <head>
            <title>Prescription</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; }
              .header { text-align: center; margin-bottom: 30px; }
              .doctor-info { margin-bottom: 20px; }
              .patient-info { margin-bottom: 20px; padding: 10px; background: #f5f5f5; }
              .medications { margin-bottom: 20px; }
              .medication { margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; }
              .notes { margin-top: 20px; padding: 10px; background: #fffbea; }
              @media print { body { padding: 20px; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Hospital Management System</h1>
              <p>Prescription</p>
            </div>
            <div class="doctor-info">
              <strong>${printData.doctor.name}</strong><br>
              ${printData.doctor.specialization || ''}<br>
              ${printData.doctor.qualification || ''}
            </div>
            <div class="patient-info">
              <strong>Patient:</strong> ${printData.patient.name}<br>
              ${printData.patient.age ? `<strong>Age:</strong> ${printData.patient.age} years<br>` : ''}
              ${printData.patient.phone ? `<strong>Phone:</strong> ${printData.patient.phone}` : ''}
            </div>
            <div class="medications">
              <h3>Medications</h3>
              ${printData.medications.map(med => `
                <div class="medication">
                  <strong>${med.name}</strong><br>
                  ${med.dosage ? `Dosage: ${med.dosage}<br>` : ''}
                  ${med.frequency ? `Frequency: ${med.frequency}<br>` : ''}
                  ${med.duration ? `Duration: ${med.duration}` : ''}
                </div>
              `).join('')}
            </div>
            ${printData.notes ? `<div class="notes"><strong>Notes:</strong> ${printData.notes}</div>` : ''}
            ${printData.follow_up_date ? `<p><strong>Follow-up:</strong> ${printData.follow_up_date}</p>` : ''}
            <p style="margin-top: 40px; text-align: right;">
              Date: ${printData.date}<br>
              Signature: _______________
            </p>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    } catch (error) {
      console.error('Error printing prescription:', error)
    }
  }

  const handleComplete = async (prescriptionId) => {
    try {
      await completePrescription(prescriptionId)
      setShowDetailModal(false)
      fetchPrescriptions()
    } catch (error) {
      console.error('Error completing prescription:', error)
    }
  }

  if (loading && prescriptions.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-40" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{summary.total_prescriptions}</p>
                <p className="text-sm text-gray-500">Total Prescriptions</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600 font-medium">{summary.active_prescriptions}</span>
              <span className="text-gray-500">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600 font-medium">{summary.total_active_medications}</span>
              <span className="text-gray-500">Active Medications</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {['', 'active', 'completed', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(status)
              setPage(1)
            }}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'All'}
          </button>
        ))}
      </div>

      {/* Prescriptions List */}
      <div className="space-y-3">
        {prescriptions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No prescriptions found</p>
          </div>
        ) : (
          prescriptions.map((prescription) => (
            <PrescriptionCard
              key={prescription.id}
              prescription={prescription}
              onView={handleView}
              onComplete={showActions ? handleComplete : undefined}
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

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Prescription Details"
        size="lg"
      >
        {selectedPrescription && (
          <PrescriptionDetail
            prescription={selectedPrescription}
            onPrint={(p) => handlePrint(p.id)}
            onComplete={showActions ? handleComplete : undefined}
          />
        )}
      </Modal>
    </div>
  )
}

export default PrescriptionList
export { PrescriptionCard, PrescriptionDetail }

