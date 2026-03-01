import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
 DollarSign,
 TrendingUp,
 Calendar,
 Download,
 Filter,
 ChevronDown,
 Eye,
 Wallet,
 Clock,
 CheckCircle,
 XCircle,
 ArrowUpRight,
 ArrowDownRight,
 CreditCard,
 Building2
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, subDays } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getDoctorEarnings, getAppointments } from '../../services/api'
import { DashboardLayout } from '../../components/layout'
import { GlassCard, Badge, Button, Modal, Input, Select } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { CardSkeleton } from '../../components/ui/Skeleton'

const DoctorEarningsPage = () => {
 const { user } = useAuthStore()
 
 // State
 const [isLoading, setIsLoading] = useState(true)
 const [earnings, setEarnings] = useState({
 totalEarnings: 0,
 thisMonth: 0,
 pendingPayout: 0,
 transactions: [],
 })
 const [appointments, setAppointments] = useState([])
 const [periodFilter, setPeriodFilter] = useState('all')
 const [showFilters, setShowFilters] = useState(false)
 const [showWithdrawModal, setShowWithdrawModal] = useState(false)
 const [withdrawAmount, setWithdrawAmount] = useState('')
 const [withdrawMethod, setWithdrawMethod] = useState('bank')

 // Fetch data
 useEffect(() => {
 const fetchData = async () => {
 if (!user?.id) return
 
 try {
 const [earningsData, appointmentsData] = await Promise.all([
 getDoctorEarnings(user.id),
 getAppointments({ doctorId: user.id }),
 ])
 
 setEarnings(earningsData || {
 totalEarnings: 0,
 thisMonth: 0,
 pendingPayout: 0,
 transactions: [],
 })
 setAppointments(appointmentsData || [])
 } catch (error) {
 console.error('Error fetching earnings:', error)
 toast.error('Failed to load earnings data')
 } finally {
 setIsLoading(false)
 }
 }
 
 fetchData()
 }, [user?.id])

 // Filter transactions by period
 const filteredTransactions = useMemo(() => {
 const now = new Date()
 let startDate
 
 switch (periodFilter) {
 case 'week':
 startDate = startOfWeek(now)
 break
 case 'month':
 startDate = startOfMonth(now)
 break
 case '3months':
 startDate = subMonths(now, 3)
 break
 case '6months':
 startDate = subMonths(now, 6)
 break
 default:
 return earnings.transactions
 }
 
 return earnings.transactions?.filter(t => new Date(t.date) >= startDate) || []
 }, [earnings.transactions, periodFilter])

 // Calculate stats
 const stats = useMemo(() => {
 const completedAppointments = appointments.filter(a => a.status === 'completed')
 const paidAppointments = completedAppointments.filter(a => a.payment_status === 'paid')
 
 const lastMonth = subMonths(new Date(), 1)
 const lastMonthEarnings = earnings.transactions
 ?.filter(t => {
 const date = new Date(t.date)
 return date.getMonth() === lastMonth.getMonth() && 
 date.getFullYear() === lastMonth.getFullYear()
 })
 .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) || 0
 
 const growth = lastMonthEarnings > 0 
 ? ((earnings.thisMonth - lastMonthEarnings) / lastMonthEarnings * 100).toFixed(1)
 : 0
 
 return {
 totalAppointments: completedAppointments.length,
 paidAppointments: paidAppointments.length,
 averagePerAppointment: paidAppointments.length > 0 
 ? (earnings.totalEarnings / paidAppointments.length).toFixed(2)
 : 0,
 growth: parseFloat(growth),
 }
 }, [appointments, earnings])

 // Handle withdraw
 const handleWithdraw = () => {
 const amount = parseFloat(withdrawAmount)
 if (!amount || amount <= 0) {
 toast.error('Please enter a valid amount')
 return
 }
 if (amount > earnings.pendingPayout) {
 toast.error('Insufficient balance')
 return
 }
 
 // TODO: Implement actual withdrawal logic
 toast.success(`Withdrawal request of $${amount} submitted`)
 setShowWithdrawModal(false)
 setWithdrawAmount('')
 }

 // Export transactions
 const handleExport = () => {
 const headers = ['Date', 'Patient', 'Amount', 'Status', 'Payment Method']
 const rows = filteredTransactions.map(t => [
 format(new Date(t.date), 'yyyy-MM-dd'),
 t.patient_name || 'N/A',
 `$${t.amount}`,
 t.payment_status || 'paid',
 'Online',
 ])
 
 const csvContent = [
 headers.join(','),
 ...rows.map(row => row.join(','))
 ].join('\n')
 
 const blob = new Blob([csvContent], { type: 'text/csv' })
 const url = URL.createObjectURL(blob)
 const a = document.createElement('a')
 a.href = url
 a.download = `earnings_${format(new Date(), 'yyyy-MM-dd')}.csv`
 a.click()
 URL.revokeObjectURL(url)
 toast.success('Earnings exported successfully')
 }

 return (
 <DashboardLayout>
 {/* Header */}
 <div className="mb-8">
 <div className="flex items-center justify-between">
 <div>
 <motion.h1
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 className="text-2xl font-bold text-gray-800 mb-2"
 >
 Earnings
 </motion.h1>
 <motion.p
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.1 }}
 className="text-gray-600"
 >
 Track your earnings and manage payouts
 </motion.p>
 </div>
 
 <div className="flex gap-3">
 <Button
 variant="ghost"
 onClick={handleExport}
 >
 <Download className="w-4 h-4" />
 Export
 </Button>
 <Button
 variant="primary"
 onClick={() => setShowWithdrawModal(true)}
 disabled={earnings.pendingPayout <= 0}
 >
 <Wallet className="w-4 h-4" />
 Withdraw
 </Button>
 </div>
 </div>
 </div>

 {/* Stats Cards */}
 <div className="grid grid-cols-1 gap-4 mb-8">
 {isLoading ? (
 <>
 <div className="h-32 rounded-xl bg-gray-50 animate-pulse" />
 <div className="h-32 rounded-xl bg-gray-50 animate-pulse" />
 <div className="h-32 rounded-xl bg-gray-50 animate-pulse" />
 <div className="h-32 rounded-xl bg-gray-50 animate-pulse" />
 </>
 ) : (
 <>
 {/* Total Earnings */}
 <GlassCard className="p-6">
 <div className="flex items-start justify-between">
 <div>
 <p className="text-sm text-gray-600 mb-1">Total Earnings</p>
 <p className="text-3xl font-bold text-gray-800">${earnings.totalEarnings.toFixed(2)}</p>
 <div className="flex items-center gap-1 mt-2">
 {stats.growth >= 0 ? (
 <>
 <ArrowUpRight className="w-4 h-4 text-green-600" />
 <span className="text-sm text-green-600">+{stats.growth}%</span>
 </>
 ) : (
 <>
 <ArrowDownRight className="w-4 h-4 text-red-600" />
 <span className="text-sm text-red-600">{stats.growth}%</span>
 </>
 )}
 <span className="text-xs text-gray-500">vs last month</span>
 </div>
 </div>
 <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
 <DollarSign className="w-6 h-6 text-green-600" />
 </div>
 </div>
 </GlassCard>

 {/* This Month */}
 <GlassCard className="p-6">
 <div className="flex items-start justify-between">
 <div>
 <p className="text-sm text-gray-600 mb-1">This Month</p>
 <p className="text-3xl font-bold text-gray-800">${earnings.thisMonth.toFixed(2)}</p>
 <p className="text-xs text-gray-500 mt-2">
 {format(new Date(), 'MMMM yyyy')}
 </p>
 </div>
 <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
 <Calendar className="w-6 h-6 text-blue-600" />
 </div>
 </div>
 </GlassCard>

 {/* Pending Payout */}
 <GlassCard className="p-6">
 <div className="flex items-start justify-between">
 <div>
 <p className="text-sm text-gray-600 mb-1">Pending Payout</p>
 <p className="text-3xl font-bold text-gray-800">${earnings.pendingPayout.toFixed(2)}</p>
 <p className="text-xs text-gray-500 mt-2">Available to withdraw</p>
 </div>
 <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
 <Clock className="w-6 h-6 text-yellow-600" />
 </div>
 </div>
 </GlassCard>

 {/* Average per Appointment */}
 <GlassCard className="p-6">
 <div className="flex items-start justify-between">
 <div>
 <p className="text-sm text-gray-600 mb-1">Avg. per Appointment</p>
 <p className="text-3xl font-bold text-gray-800">${stats.averagePerAppointment}</p>
 <p className="text-xs text-gray-500 mt-2">{stats.paidAppointments} paid appointments</p>
 </div>
 <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
 <TrendingUp className="w-6 h-6 text-purple-600" />
 </div>
 </div>
 </GlassCard>
 </>
 )}
 </div>

 {/* Main Content */}
 <div className="grid grid-cols-1 gap-6">
 {/* Transactions */}
 <div className="lg:col-span-2">
 <GlassCard className="p-6">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-lg font-semibold text-gray-800">Transaction History</h2>
 <div className="flex items-center gap-3">
 <select
 value={periodFilter}
 onChange={(e) => setPeriodFilter(e.target.value)}
 className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-blue-500"
 >
 <option value="all">All Time</option>
 <option value="week">This Week</option>
 <option value="month">This Month</option>
 <option value="3months">Last 3 Months</option>
 <option value="6months">Last 6 Months</option>
 </select>
 </div>
 </div>

 {isLoading ? (
 <div className="space-y-4">
 <CardSkeleton />
 <CardSkeleton />
 <CardSkeleton />
 </div>
 ) : filteredTransactions.length > 0 ? (
 <div className="space-y-3">
 {filteredTransactions.map((transaction, index) => (
 <motion.div
 key={index}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: index * 0.03 }}
 className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
 >
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
 <ArrowUpRight className="w-5 h-5 text-green-400" />
 </div>
 <div>
 <p className="text-gray-800 font-medium">{transaction.patient_name || 'Patient'}</p>
 <p className="text-sm text-gray-600">
 {format(new Date(transaction.date), 'MMM d, yyyy • h:mm a')}
 </p>
 </div>
 </div>
 <div className="text-right">
 <p className="text-gray-800 font-bold">+${parseFloat(transaction.amount).toFixed(2)}</p>
 <Badge variant="success" size="sm">
 <CheckCircle className="w-3 h-3" />
 Paid
 </Badge>
 </div>
 </motion.div>
 ))}
 </div>
 ) : (
 <EmptyState
 icon={DollarSign}
 title="No transactions found"
 description="You don't have any transactions for the selected period."
 />
 )}
 </GlassCard>
 </div>

 {/* Sidebar */}
 <div className="space-y-6">
 {/* Payout Summary */}
 <GlassCard className="p-6">
 <h2 className="text-lg font-semibold text-gray-800 mb-4">Payout Summary</h2>
 
 <div className="space-y-4">
 <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
 <span className="text-gray-600">Available Balance</span>
 <span className="text-xl font-bold text-gray-800">${earnings.pendingPayout.toFixed(2)}</span>
 </div>
 
 <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
 <span className="text-gray-600">Total Withdrawn</span>
 <span className="text-gray-800">${(earnings.totalEarnings - earnings.pendingPayout).toFixed(2)}</span>
 </div>
 
 <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
 <span className="text-gray-600">Pending Clearance</span>
 <span className="text-yellow-400">$0.00</span>
 </div>
 </div>

 <Button
 variant="primary"
 className="w-full mt-4"
 onClick={() => setShowWithdrawModal(true)}
 disabled={earnings.pendingPayout <= 0}
 >
 <Wallet className="w-4 h-4" />
 Request Withdrawal
 </Button>
 </GlassCard>

 {/* Payment Methods */}
 <GlassCard className="p-6">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-lg font-semibold text-gray-800">Payment Methods</h2>
 <Button variant="ghost" size="sm">
 Add New
 </Button>
 </div>
 
 <div className="space-y-3">
 <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-primary-500/50">
 <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
 <Building2 className="w-5 h-5 text-primary-400" />
 </div>
 <div className="flex-1">
 <p className="text-gray-800 font-medium">Bank Account</p>
 <p className="text-xs text-gray-600">**** **** **** 4532</p>
 </div>
 <Badge variant="primary" size="sm">Default</Badge>
 </div>
 
 <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
 <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
 <CreditCard className="w-5 h-5 text-blue-400" />
 </div>
 <div className="flex-1">
 <p className="text-gray-800 font-medium">PayPal</p>
 <p className="text-xs text-gray-600">doctor@email.com</p>
 </div>
 </div>
 </div>
 </GlassCard>

 {/* Quick Stats */}
 <GlassCard className="p-6">
 <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Stats</h2>
 
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <span className="text-gray-600">Completed Appointments</span>
 <span className="text-gray-800 font-medium">{stats.totalAppointments}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-gray-600">Paid Appointments</span>
 <span className="text-gray-800 font-medium">{stats.paidAppointments}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-gray-600">Collection Rate</span>
 <span className="text-green-400 font-medium">
 {stats.totalAppointments > 0 
 ? ((stats.paidAppointments / stats.totalAppointments) * 100).toFixed(0)
 : 0}%
 </span>
 </div>
 </div>
 </GlassCard>
 </div>
 </div>

 {/* Withdraw Modal */}
 <Modal
 isOpen={showWithdrawModal}
 onClose={() => {
 setShowWithdrawModal(false)
 setWithdrawAmount('')
 }}
 title="Request Withdrawal"
 >
 <div className="space-y-4">
 <div className="p-4 rounded-lg bg-gray-50">
 <p className="text-sm text-gray-600">Available Balance</p>
 <p className="text-2xl font-bold text-gray-800">${earnings.pendingPayout.toFixed(2)}</p>
 </div>
 
 <div>
 <label className="block text-sm text-gray-600 mb-2">Withdrawal Method</label>
 <select
 value={withdrawMethod}
 onChange={(e) => setWithdrawMethod(e.target.value)}
 className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-primary-500"
 >
 <option value="bank">Bank Account (**** 4532)</option>
 <option value="paypal">PayPal (doctor@email.com)</option>
 </select>
 </div>
 
 <div>
 <label className="block text-sm text-gray-600 mb-2">Amount</label>
 <div className="relative">
 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">$</span>
 <input
 type="number"
 value={withdrawAmount}
 onChange={(e) => setWithdrawAmount(e.target.value)}
 placeholder="0.00"
 className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-primary-500"
 max={earnings.pendingPayout}
 />
 </div>
 <div className="flex gap-2 mt-2">
 <button
 onClick={() => setWithdrawAmount((earnings.pendingPayout * 0.25).toFixed(2))}
 className="px-3 py-1 text-xs bg-gray-50 rounded-lg text-gray-600 hover:bg-gray-100"
 >
 25%
 </button>
 <button
 onClick={() => setWithdrawAmount((earnings.pendingPayout * 0.5).toFixed(2))}
 className="px-3 py-1 text-xs bg-gray-50 rounded-lg text-gray-600 hover:bg-gray-100"
 >
 50%
 </button>
 <button
 onClick={() => setWithdrawAmount((earnings.pendingPayout * 0.75).toFixed(2))}
 className="px-3 py-1 text-xs bg-gray-50 rounded-lg text-gray-600 hover:bg-gray-100"
 >
 75%
 </button>
 <button
 onClick={() => setWithdrawAmount(earnings.pendingPayout.toFixed(2))}
 className="px-3 py-1 text-xs bg-gray-50 rounded-lg text-gray-600 hover:bg-gray-100"
 >
 Max
 </button>
 </div>
 </div>
 
 <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
 <p className="text-xs text-yellow-400">
 Withdrawals typically take 2-3 business days to process. A small processing fee may apply.
 </p>
 </div>
 
 <div className="flex gap-3 pt-4">
 <Button
 variant="ghost"
 className="flex-1"
 onClick={() => {
 setShowWithdrawModal(false)
 setWithdrawAmount('')
 }}
 >
 Cancel
 </Button>
 <Button
 variant="primary"
 className="flex-1"
 onClick={handleWithdraw}
 >
 Request Withdrawal
 </Button>
 </div>
 </div>
 </Modal>
 </DashboardLayout>
 )
}

export default DoctorEarningsPage



