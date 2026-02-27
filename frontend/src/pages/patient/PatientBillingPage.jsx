import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  CreditCard,
  Receipt,
  Download,
  Search,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Wallet,
  Shield,
  ChevronRight,
  Plus,
  FileText
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getAppointments } from '../../services/api'
import { GlassCard, Badge, Button, Modal, Input } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { CardSkeleton } from '../../components/ui/Skeleton'

const PatientBillingPage = () => {
  const { user } = useAuthStore()
  const [bills, setBills] = useState([])
  const [payments, setPayments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showPayModal, setShowPayModal] = useState(false)
  const [selectedBill, setSelectedBill] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return
      
      try {
        const appointmentsData = await getAppointments({ patientId: user.id })
        
        // Create sample bills from appointments
        const sampleBills = appointmentsData
          ?.filter(apt => apt.status === 'completed' || apt.status === 'confirmed')
          .slice(0, 8)
          .map((apt, idx) => ({
            id: `bill-${apt.id}`,
            appointment_id: apt.id,
            description: `${apt.specialization} Consultation - Dr. ${apt.doctor_name}`,
            amount: [500, 800, 1200, 1500, 300, 600, 900, 1000][idx % 8],
            status: idx < 2 ? 'pending' : idx < 5 ? 'paid' : 'overdue',
            created_date: apt.date,
            due_date: new Date(new Date(apt.date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            patient_name: user.fullName || user.email
          })) || []
        
        // Sample payments
        const samplePayments = sampleBills
          .filter(b => b.status === 'paid')
          .map(b => ({
            id: `pay-${b.id}`,
            bill_id: b.id,
            amount: b.amount,
            payment_date: b.due_date,
            method: ['Credit Card', 'UPI', 'Net Banking'][Math.floor(Math.random() * 3)],
            transaction_id: `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`
          }))
        
        setBills(sampleBills)
        setPayments(samplePayments)
      } catch (error) {
        console.error('Error fetching billing data:', error)
        setBills([])
        setPayments([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user?.id])

  const filteredBills = bills.filter(bill => {
    const matchesSearch = bill.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = statusFilter === 'all' || bill.status === statusFilter
    return matchesSearch && matchesFilter
  })

  const totalPending = bills.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.amount, 0)
  const totalOverdue = bills.filter(b => b.status === 'overdue').reduce((sum, b) => sum + b.amount, 0)
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)

  const handlePayment = async () => {
    if (!selectedBill) return
    
    setIsProcessing(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Update bills
      setBills(prev => prev.map(b => 
        b.id === selectedBill.id 
          ? { ...b, status: 'paid', paid_date: new Date().toISOString() }
          : b
      ))
      
      // Add payment record
      setPayments(prev => [{
        id: `pay-${Date.now()}`,
        bill_id: selectedBill.id,
        amount: selectedBill.amount,
        payment_date: new Date().toISOString(),
        method: paymentMethod === 'card' ? 'Credit Card' : paymentMethod === 'upi' ? 'UPI' : 'Net Banking',
        transaction_id: `TXN${Date.now()}`
      }, ...prev])
      
      toast.success('Payment successful!')
      setShowPayModal(false)
      setSelectedBill(null)
    } catch (error) {
      toast.error('Payment failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Paid</Badge>
      case 'pending':
        return <Badge variant="warning">Pending</Badge>
      case 'overdue':
        return <Badge variant="error">Overdue</Badge>
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #3d7ab5 100%)', minHeight: '100vh' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-5 pt-8 pb-4" style={{ background: 'rgba(30,58,95,0.95)', backdropFilter: 'blur(10px)' }}>
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white">Billing & Payments</h1>
          <p className="text-sm text-white/60">Manage your bills and payments</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <DollarSign className="w-5 h-5 text-yellow-400 mb-1" />
            <p className="text-xs text-white/60">Pending</p>
            <p className="font-bold text-white">₹{totalPending}</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <Clock className="w-5 h-5 text-red-400 mb-1" />
            <p className="text-xs text-white/60">Overdue</p>
            <p className="font-bold text-white">₹{totalOverdue}</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <CheckCircle className="w-5 h-5 text-green-400 mb-1" />
            <p className="text-xs text-white/60">Paid</p>
            <p className="font-bold text-white">₹{totalPaid}</p>
          </div>
        </div>
      </header>

      <main className="px-5 pb-24">
        {/* Search and Filter */}
        <div className="flex gap-3 mt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search bills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-white/10 border border-white/10 rounded-xl text-white placeholder:text-white/40"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 px-4 bg-white/10 border border-white/10 rounded-xl text-white"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {/* Pending/Overdue Bills */}
        {(totalPending > 0 || totalOverdue > 0) && (
          <section className="mt-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              Outstanding Bills
            </h2>
            
            <div className="space-y-3">
              {filteredBills.filter(b => b.status !== 'paid').map((bill, index) => (
                <motion.div
                  key={bill.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="rounded-2xl p-5 border"
                  style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.1)' }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{bill.description}</h3>
                      <p className="text-sm text-white/50 mt-1">
                        Bill Date: {format(new Date(bill.created_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xl text-white">₹{bill.amount}</p>
                      {getStatusBadge(bill.status)}
                    </div>
                  </div>
                  
                  <Button 
                    variant="primary" 
                    className="w-full"
                    onClick={() => {
                      setSelectedBill(bill)
                      setShowPayModal(true)
                    }}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pay Now
                  </Button>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Payment History */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-green-400" />
            Payment History
          </h2>
          
          {isLoading ? (
            <div className="space-y-4">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : payments.length > 0 ? (
            <div className="space-y-3">
              {payments.map((payment, index) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="rounded-2xl p-4 border"
                  style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.1)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">₹{payment.amount}</p>
                        <p className="text-xs text-white/50">{payment.method}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white/70">
                        {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-white/40">{payment.transaction_id}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Receipt}
              title="No payment history"
              description="Your payment history will appear here."
            />
          )}
        </section>

        {/* Payment Methods */}
        <section className="mt-8 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-400" />
            Payment Methods
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-white">**** **** **** 4242</p>
                  <p className="text-xs text-white/50">Expires 12/26</p>
                </div>
              </div>
              <Badge variant="success">Default</Badge>
            </div>
            
            <Button variant="ghost" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Payment Method
            </Button>
          </div>
        </section>
      </main>

      {/* Payment Modal */}
      <Modal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        title="Complete Payment"
      >
        {selectedBill && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5">
              <p className="text-sm text-white/60">Amount Due</p>
              <p className="text-3xl font-bold text-white">₹{selectedBill.amount}</p>
              <p className="text-sm text-white/50 mt-2">{selectedBill.description}</p>
            </div>

            <div>
              <p className="text-sm text-white/70 mb-3">Select Payment Method</p>
              <div className="space-y-2">
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-colors ${
                    paymentMethod === 'card' ? 'border-primary bg-primary/10' : 'border-white/10'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-primary" />
                  <span className="text-white">Credit / Debit Card</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('upi')}
                  className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-colors ${
                    paymentMethod === 'upi' ? 'border-primary bg-primary/10' : 'border-white/10'
                  }`}
                >
                  <Shield className="w-5 h-5 text-green-400" />
                  <span className="text-white">UPI</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('netbanking')}
                  className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-colors ${
                    paymentMethod === 'netbanking' ? 'border-primary bg-primary/10' : 'border-white/10'
                  }`}
                >
                  <Wallet className="w-5 h-5 text-yellow-400" />
                  <span className="text-white">Net Banking</span>
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setShowPayModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1" onClick={handlePayment} isLoading={isProcessing}>
                Pay ₹{selectedBill.amount}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default PatientBillingPage
