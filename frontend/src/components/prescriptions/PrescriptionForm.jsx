import { useState } from 'react'
import { createPrescriptionApi } from '../../services/api'

const MedicationRow = ({ medication, onChange, onRemove, readonly }) => {
  return (
    <div className="grid grid-cols-12 gap-2 items-start">
      <div className="col-span-4">
        <input
          type="text"
          value={medication.name || ''}
          onChange={(e) => onChange({ ...medication, name: e.target.value })}
          placeholder="Medication name"
          disabled={readonly}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
      </div>
      <div className="col-span-2">
        <input
          type="text"
          value={medication.dosage || ''}
          onChange={(e) => onChange({ ...medication, dosage: e.target.value })}
          placeholder="Dosage"
          disabled={readonly}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
      </div>
      <div className="col-span-2">
        <input
          type="text"
          value={medication.frequency || ''}
          onChange={(e) => onChange({ ...medication, frequency: e.target.value })}
          placeholder="Frequency"
          disabled={readonly}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
      </div>
      <div className="col-span-2">
        <input
          type="text"
          value={medication.duration || ''}
          onChange={(e) => onChange({ ...medication, duration: e.target.value })}
          placeholder="Duration"
          disabled={readonly}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
      </div>
      <div className="col-span-2 flex items-center gap-1">
        <input
          type="text"
          value={medication.instructions || ''}
          onChange={(e) => onChange({ ...medication, instructions: e.target.value })}
          placeholder="Instructions"
          disabled={readonly}
          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
        {!readonly && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

const PrescriptionForm = ({
  patientId,
  doctorId,
  appointmentId,
  existingPrescription = null,
  onSuccess,
  onCancel
}) => {
  const [medications, setMedications] = useState(
    existingPrescription?.medications || [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }]
  )
  const [notes, setNotes] = useState(existingPrescription?.notes || '')
  const [followUpDate, setFollowUpDate] = useState(existingPrescription?.follow_up_date || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const addMedication = () => {
    setMedications([
      ...medications,
      { name: '', dosage: '', frequency: '', duration: '', instructions: '' }
    ])
  }

  const updateMedication = (index, updatedMed) => {
    const newMeds = [...medications]
    newMeds[index] = updatedMed
    setMedications(newMeds)
  }

  const removeMedication = (index) => {
    if (medications.length > 1) {
      setMedications(medications.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate medications
    const validMeds = medications.filter(m => m.name?.trim())
    if (validMeds.length === 0) {
      setError('Please add at least one medication')
      return
    }

    setLoading(true)

    try {
      const prescriptionData = {
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_id: appointmentId,
        medications: validMeds,
        notes: notes.trim() || null,
        follow_up_date: followUpDate || null
      }

      await createPrescriptionApi(prescriptionData)
      onSuccess?.()
    } catch (err) {
      setError(err.message || 'Failed to create prescription')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Medications Table */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Medications
        </label>
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase">
            <div className="col-span-4">Name *</div>
            <div className="col-span-2">Dosage</div>
            <div className="col-span-2">Frequency</div>
            <div className="col-span-2">Duration</div>
            <div className="col-span-2">Instructions</div>
          </div>
          
          {/* Rows */}
          {medications.map((med, index) => (
            <MedicationRow
              key={index}
              medication={med}
              onChange={(updated) => updateMedication(index, updated)}
              onRemove={() => removeMedication(index)}
            />
          ))}

          {/* Add Button */}
          <button
            type="button"
            onClick={addMedication}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Medication
          </button>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Additional Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any additional instructions or notes..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Follow-up Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Follow-up Date (Optional)
        </label>
        <input
          type="date"
          value={followUpDate}
          onChange={(e) => setFollowUpDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {loading ? 'Saving...' : 'Create Prescription'}
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

export default PrescriptionForm
export { MedicationRow }

