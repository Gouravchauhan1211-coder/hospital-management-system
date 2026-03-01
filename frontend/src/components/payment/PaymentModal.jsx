import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  CreditCard, 
  Lock, 
  CheckCircle, 
  Loader2,
  Wallet,
  Building2,
  Smartphone
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Input } from '../ui'

const PaymentModal = ({ 
  isOpen, 
  onClose, 
  amount, 
  doctorName, 
  appointmentDetails,
  onPaymentSuccess 
}) => {
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [cardDetails, setCardDetails] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: ''
  })

  const handleCardChange = (field, value) => {
    let formattedValue = value
    
    // Format card number with spaces
    if (field === 'number') {
      formattedValue = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim()
      if (formattedValue.length > 19) return
    }
    
    // Format expiry date
    if (field === 'expiry') {
      formattedValue = value.replace(/\D/g, '')
      if (formattedValue.length >= 2) {
        formattedValue = formattedValue.slice(0, 2) + '/' + formattedValue.slice(2, 4)
      }
      if (formattedValue.length > 5) return
    }
    
    // CVV should be 3-4 digits
    if (field === 'cvv') {
      formattedValue = value.replace(/\D/g, '')
      if (formattedValue.length > 4) return
    }
    
    setCardDetails(prev => ({ ...prev, [field]: formattedValue }))
  }

  const handlePayment = async () => {
    // Validate card details for card payment
    if (paymentMethod === 'card') {
      if (cardDetails.number.replace(/\s/g, '').length < 16) {
        toast.error('Please enter a valid card number')
        return
      }
      if (!cardDetails.name.trim()) {
        toast.error('Please enter cardholder name')
        return
      }
      if (cardDetails.expiry.length < 5) {
        toast.error('Please enter a valid expiry date')
        return
      }
      if (cardDetails.cvv.length < 3) {
        toast.error('Please enter a valid CVV')
        return
      }
    }

    setIsProcessing(true)

    // Simulate payment processing
    try {
      // In a real app, you would integrate with Stripe, Razorpay, etc.
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate successful payment
      setIsSuccess(true)
      toast.success('Payment successful!')
      
      // Call success callback after showing success state
      setTimeout(() => {
        onPaymentSuccess()
      }, 1500)
      
    } catch (error) {
      toast.error('Payment failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const paymentMethods = [
    { id: 'card', label: 'Credit/Debit Card', icon: CreditCard },
    { id: 'upi', label: 'UPI', icon: Smartphone },
    { id: 'netbanking', label: 'Net Banking', icon: Building2 },
    { id: 'wallet', label: 'Wallet', icon: Wallet }
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Payment</h2>
                <p className="text-sm text-gray-600">Complete your booking</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {isSuccess ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Payment Successful!</h3>
                  <p className="text-gray-600">Your appointment has been confirmed</p>
                </motion.div>
              ) : (
                <>
                  {/* Order Summary */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-primary-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{doctorName}</p>
                        <p className="text-sm text-gray-600">{appointmentDetails}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <span className="text-gray-600">Total Amount</span>
                      <span className="text-2xl font-bold text-gray-800">${amount}</span>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-3">Select Payment Method</p>
                    <div className="grid grid-cols-2 gap-3">
                      {paymentMethods.map(method => (
                        <button
                          key={method.id}
                          onClick={() => setPaymentMethod(method.id)}
                          className={`p-3 rounded-xl border transition-all flex items-center gap-2 ${
                            paymentMethod === method.id
                              ? 'border-primary-500 bg-primary-500/10'
                              : 'border-gray-200 hover:border-white/20'
                          }`}
                        >
                          <method.icon className={`w-5 h-5 ${
                            paymentMethod === method.id ? 'text-primary-400' : 'text-gray-600'
                          }`} />
                          <span className={`text-sm ${
                            paymentMethod === method.id ? 'text-gray-800' : 'text-gray-600'
                          }`}>
                            {method.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card Details */}
                  {paymentMethod === 'card' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4 mb-6"
                    >
                      <Input
                        label="Card Number"
                        placeholder="1234 5678 9012 3456"
                        value={cardDetails.number}
                        onChange={(e) => handleCardChange('number', e.target.value)}
                        icon={CreditCard}
                      />
                      <Input
                        label="Cardholder Name"
                        placeholder="John Doe"
                        value={cardDetails.name}
                        onChange={(e) => handleCardChange('name', e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Expiry Date"
                          placeholder="MM/YY"
                          value={cardDetails.expiry}
                          onChange={(e) => handleCardChange('expiry', e.target.value)}
                        />
                        <Input
                          label="CVV"
                          placeholder="123"
                          type="password"
                          value={cardDetails.cvv}
                          onChange={(e) => handleCardChange('cvv', e.target.value)}
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* UPI */}
                  {paymentMethod === 'upi' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6"
                    >
                      <Input
                        label="UPI ID"
                        placeholder="yourname@upi"
                      />
                    </motion.div>
                  )}

                  {/* Net Banking */}
                  {paymentMethod === 'netbanking' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6"
                    >
                      <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-primary-500">
                        <option value="">Select Bank</option>
                        <option value="sbi">State Bank of India</option>
                        <option value="hdfc">HDFC Bank</option>
                        <option value="icici">ICICI Bank</option>
                        <option value="axis">Axis Bank</option>
                        <option value="kotak">Kotak Mahindra Bank</option>
                      </select>
                    </motion.div>
                  )}

                  {/* Wallet */}
                  {paymentMethod === 'wallet' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6"
                    >
                      <div className="grid grid-cols-3 gap-3">
                        {['Paytm', 'PhonePe', 'Amazon Pay'].map(wallet => (
                          <button
                            key={wallet}
                            className="p-3 rounded-xl border border-gray-200 hover:border-primary-500 transition-colors"
                          >
                            <span className="text-sm text-gray-700">{wallet}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Security Note */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                    <Lock className="w-4 h-4" />
                    <span>Your payment is secured with 256-bit encryption</span>
                  </div>

                  {/* Pay Button */}
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={handlePayment}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      `Pay $${amount}`
                    )}
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default PaymentModal

