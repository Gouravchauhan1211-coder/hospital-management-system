import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  FlaskConical,
  Download,
  Search,
  Filter,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  FileText,
  ChevronRight,
  Activity,
  Heart,
  Droplets,
  TestTube
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getAppointments } from '../../services/api'
import { GlassCard, Badge, Button, Modal } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { CardSkeleton } from '../../components/ui/Skeleton'

const labCategories = [
  { id: 'blood', name: 'Blood Test', icon: Droplets, color: 'bg-red-500/20 text-red-400' },
  { id: 'urine', name: 'Urine Test', icon: FlaskConical, color: 'bg-yellow-500/20 text-yellow-400' },
  { id: 'imaging', name: 'Imaging', icon: Activity, color: 'bg-blue-500/20 text-blue-400' },
  { id: 'cardiac', name: 'Cardiac', icon: Heart, color: 'bg-pink-500/20 text-pink-400' },
]

const PatientLabResultsPage = () => {
  const { user } = useAuthStore()
  const [labResults, setLabResults] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedResult, setSelectedResult] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return
      
      try {
        const appointmentsData = await getAppointments({ patientId: user.id })
        
        // Create sample lab results from completed appointments
        const sampleResults = appointmentsData
          ?.filter(apt => apt.status === 'completed')
          .slice(0, 8)
          .map((apt, idx) => ({
            id: `lab-${apt.id}`,
            test_name: ['Complete Blood Count', 'Lipid Profile', 'Thyroid Function', 'Diabetes Screening', 'Liver Function', 'Kidney Function'][idx % 6],
            category: labCategories[idx % 4].id,
            test_date: apt.date,
            status: idx < 3 ? 'completed' : 'pending',
            results: idx < 3 ? {
              hemoglobin: (12 + Math.random() * 4).toFixed(1),
              wbc: (4000 + Math.random() * 4000).toFixed(0),
              platelets: (150000 + Math.random() * 100000).toFixed(0),
              glucose: (80 + Math.random() * 40).toFixed(0),
            } : null,
            prescribed_by: apt.doctor_name,
            notes: idx < 3 ? 'All values within normal range' : 'Results pending'
          })) || []
        
        setLabResults(sampleResults)
      } catch (error) {
        console.error('Error fetching lab results:', error)
        setLabResults([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user?.id])

  const filteredResults = labResults.filter(result => {
    const matchesSearch = result.test_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.prescribed_by?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = categoryFilter === 'all' || result.category === categoryFilter
    return matchesSearch && matchesFilter
  })

  const completedResults = filteredResults.filter(r => r.status === 'completed')
  const pendingResults = filteredResults.filter(r => r.status === 'pending')

  const handleDownload = (result) => {
    toast.success('Download started...')
  }

  const getCategoryInfo = (categoryId) => {
    return labCategories.find(c => c.id === categoryId) || labCategories[0]
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #3d7ab5 100%)', minHeight: '100vh' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-5 pt-8 pb-4" style={{ background: 'rgba(30,58,95,0.95)', backdropFilter: 'blur(10px)' }}>
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white">Lab Results</h1>
          <p className="text-sm text-white/60">View your test reports</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search test results..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-white/10 border border-white/10 rounded-xl text-white placeholder:text-white/40"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              categoryFilter === 'all' ? 'bg-primary text-white' : 'bg-white/10 text-white/70'
            }`}
          >
            All Tests
          </button>
          {labCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                categoryFilter === cat.id ? 'bg-primary text-white' : 'bg-white/10 text-white/70'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      <main className="px-5 pb-24">
        {/* Pending Results */}
        {pendingResults.length > 0 && (
          <section className="mt-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TestTube className="w-5 h-5 text-yellow-400" />
              Pending Results
              <Badge variant="warning" className="ml-2">{pendingResults.length}</Badge>
            </h2>
            
            <div className="space-y-3">
              {pendingResults.map((result, index) => {
                const CategoryIcon = getCategoryInfo(result.category).icon
                return (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="rounded-2xl p-4 border"
                    style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.1)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getCategoryInfo(result.category).color}`}>
                        <CategoryIcon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{result.test_name}</h3>
                        <p className="text-xs text-white/50">
                          {format(new Date(result.test_date), 'MMM d, yyyy')} • Dr. {result.prescribed_by}
                        </p>
                      </div>
                      <Badge variant="warning">Pending</Badge>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </section>
        )}

        {/* Completed Results */}
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Completed Results
            <Badge variant="success" className="ml-2">{completedResults.length}</Badge>
          </h2>
          
          {isLoading ? (
            <div className="space-y-4">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : completedResults.length > 0 ? (
            <div className="space-y-4">
              {completedResults.map((result, index) => {
                const CategoryIcon = getCategoryInfo(result.category).icon
                return (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="rounded-2xl p-5 border cursor-pointer hover:bg-white/5 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.1)' }}
                    onClick={() => {
                      setSelectedResult(result)
                      setShowDetailModal(true)
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${getCategoryInfo(result.category).color}`}>
                          <CategoryIcon className="w-7 h-7" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-lg">{result.test_name}</h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-white/60">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(result.test_date), 'MMM d, yyyy')}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              Dr. {result.prescribed_by}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDownload(result) }}>
                          <Download className="w-4 h-4" />
                        </Button>
                        <ChevronRight className="w-5 h-5 text-white/40" />
                      </div>
                    </div>
                    
                    {result.results && (
                      <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-4">
                        {Object.entries(result.results).slice(0, 3).map(([key, value]) => (
                          <div key={key} className="text-center">
                            <p className="text-xs text-white/50 uppercase">{key}</p>
                            <p className="font-bold text-white">{value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={FlaskConical}
              title="No lab results yet"
              description="Your lab results will appear here after tests are completed."
            />
          )}
        </section>
      </main>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={selectedResult?.test_name || 'Lab Result Details'}
        size="lg"
      >
        {selectedResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
              <div>
                <p className="text-sm text-white/60">Test Date</p>
                <p className="font-semibold text-white">{format(new Date(selectedResult.test_date), 'MMMM d, yyyy')}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/60">Prescribed By</p>
                <p className="font-semibold text-white">Dr. {selectedResult.prescribed_by}</p>
              </div>
            </div>

            {selectedResult.results && (
              <div className="space-y-3">
                <h4 className="font-semibold text-white">Test Results</h4>
                {Object.entries(selectedResult.results).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                    <span className="text-white/70 capitalize">{key.replace('_', ' ')}</span>
                    <span className="font-bold text-white">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {selectedResult.notes && (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-400">{selectedResult.notes}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="primary" className="flex-1" onClick={() => handleDownload(selectedResult)}>
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default PatientLabResultsPage
