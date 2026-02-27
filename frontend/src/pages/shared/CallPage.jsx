import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Phone, 
  Volume2,
  VolumeX,
  User,
  MessageSquare,
  ScreenShare
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { GlassCard, Button, Avatar } from '../../components/ui'
import supabase from '../../services/supabase'

// WebRTC configuration with STUN servers
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
}

const CallPage = () => {
  const { threadId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const callType = searchParams.get('type') || 'video'
  const isVideo = callType === 'video'
  
  // State
  const [callStatus, setCallStatus] = useState('connecting') // connecting, ringing, connected, ended
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(!isVideo)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [callDuration, setCallDuration] = useState(0)
  const [remoteUser, setRemoteUser] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  
  // Refs
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const peerConnection = useRef(null)
  const localStream = useRef(null)
  const callTimer = useRef(null)
  const callChannel = useRef(null)

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Initialize media stream
  const initializeMedia = async () => {
    try {
      const constraints = {
        audio: true,
        video: isVideo ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStream.current = stream
      
      if (localVideoRef.current && isVideo) {
        localVideoRef.current.srcObject = stream
      }
      
      return stream
    } catch (error) {
      console.error('Error accessing media devices:', error)
      throw new Error('Could not access camera/microphone. Please check permissions.')
    }
  }

  // Create WebRTC peer connection
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(rtcConfig)
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Send ICE candidate to remote peer via Supabase
        sendSignal({ type: 'ice-candidate', candidate: event.candidate })
      }
    }
    
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
      }
    }
    
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState)
      if (pc.connectionState === 'connected') {
        setCallStatus('connected')
        startCallTimer()
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall()
      }
    }
    
    return pc
  }, [])

  // Send signaling message via Supabase
  const sendSignal = async (message) => {
    if (!callChannel.current) return
    
    await callChannel.current.send({
      type: 'broadcast',
      event: 'signal',
      payload: {
        ...message,
        senderId: user.id,
        threadId
      }
    })
  }

  // Setup Supabase realtime channel for signaling
  const setupSignalingChannel = useCallback(async () => {
    const channel = supabase.channel(`call:${threadId}`)
    
    channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
      if (payload.senderId === user.id) return
      
      switch (payload.type) {
        case 'call-offer':
          // Received call offer
          setCallStatus('ringing')
          setRemoteUser({ name: payload.callerName })
          
          if (peerConnection.current) {
            const pc = peerConnection.current
            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer))
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            sendSignal({ type: 'call-answer', answer })
          }
          break
          
        case 'call-answer':
          // Received call answer
          if (peerConnection.current) {
            await peerConnection.current.setRemoteDescription(
              new RTCSessionDescription(payload.answer)
            )
          }
          break
          
        case 'ice-candidate':
          // Received ICE candidate
          if (peerConnection.current) {
            await peerConnection.current.addIceCandidate(
              new RTCIceCandidate(payload.candidate)
            )
          }
          break
          
        case 'call-end':
          // Remote party ended call
          toast.info('Call ended by remote party')
          endCall()
          break
      }
    })
    
    channel.on('broadcast', { event: 'call-request' }, async ({ payload }) => {
      if (payload.targetId === user.id) {
        // Incoming call notification
        setRemoteUser({ name: payload.callerName })
        setCallStatus('ringing')
      }
    })
    
    await channel.subscribe()
    callChannel.current = channel
    
    return channel
  }, [threadId, user.id])

  // Start call timer
  const startCallTimer = () => {
    callTimer.current = setInterval(() => {
      setCallDuration(prev => prev + 1)
    }, 1000)
  }

  // Initialize call
  const initializeCall = async () => {
    try {
      setCallStatus('connecting')
      
      // Get media stream
      const stream = await initializeMedia()
      
      // Create peer connection
      const pc = createPeerConnection()
      peerConnection.current = pc
      
      // Add local tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream)
      })
      
      // Setup signaling
      await setupSignalingChannel()
      
      // Create and send offer (caller)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      
      // Send call offer to remote
      await sendSignal({
        type: 'call-offer',
        offer,
        callerName: user.user_metadata?.full_name || 'User'
      })
      
      // Set timeout for no answer
      setTimeout(() => {
        if (callStatus === 'connecting') {
          toast.error('No answer. Call will end in 30 seconds.')
          setTimeout(() => {
            if (callStatus !== 'connected') {
              endCall()
            }
          }, 30000)
        }
      }, 30000)
      
    } catch (error) {
      console.error('Error initializing call:', error)
      setErrorMessage(error.message)
      toast.error(error.message)
    }
  }

  // End call
  const endCall = useCallback(async () => {
    // Send end signal
    await sendSignal({ type: 'call-end' })
    
    // Stop timer
    if (callTimer.current) {
      clearInterval(callTimer.current)
    }
    
    // Stop local stream
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop())
    }
    
    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close()
    }
    
    // Unsubscribe from channel
    if (callChannel.current) {
      await callChannel.current.unsubscribe()
    }
    
    setCallStatus('ended')
    
    // Navigate back after short delay
    setTimeout(() => {
      navigate(-1)
    }, 1500)
  }, [navigate])

  // Toggle mute
  const toggleMute = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = isMuted
        setIsMuted(!isMuted)
      }
    }
  }

  // Toggle video
  const toggleVideo = () => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = isVideoOff
        setIsVideoOff(!isVideoOff)
      }
    }
  }

  // Initialize on mount
  useEffect(() => {
    initializeCall()
    
    return () => {
      endCall()
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Remote Video (Full Screen) */}
      {isVideo && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      
      {/* Local Video (Picture-in-Picture) */}
      {isVideo && !isVideoOff && (
        <motion.video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-4 right-4 w-32 h-48 md:w-48 md:h-36 rounded-2xl object-cover border-2 border-white/20 shadow-lg z-10"
        />
      )}
      
      {/* Audio Call UI */}
      {!isVideo && (
        <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-primary-900 to-black">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-8"
          >
            <Avatar 
              name={remoteUser?.name || 'User'} 
              size="xl"
              className="w-32 h-32 text-4xl"
            />
          </motion.div>
          
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-semibold text-white mb-2"
          >
            {remoteUser?.name || 'Connecting...'}
          </motion.h2>
          
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white/60"
          >
            {callStatus === 'connecting' && 'Calling...'}
            {callStatus === 'ringing' && 'Ringing...'}
            {callStatus === 'connected' && formatDuration(callDuration)}
            {callStatus === 'ended' && 'Call ended'}
          </motion.p>
        </div>
      )}
      
      {/* Video Call Overlay Info */}
      {isVideo && (
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2">
            <p className="text-white font-medium">{remoteUser?.name || 'Connecting...'}</p>
            <p className="text-white/60 text-sm">
              {callStatus === 'connecting' && 'Calling...'}
              {callStatus === 'ringing' && 'Ringing...'}
              {callStatus === 'connected' && formatDuration(callDuration)}
              {callStatus === 'ended' && 'Call ended'}
            </p>
          </div>
        </div>
      )}
      
      {/* Error Message */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500/90 backdrop-blur-sm rounded-2xl px-6 py-4 text-white text-center z-20"
          >
            <p className="font-medium mb-2">Call Error</p>
            <p className="text-sm text-white/80">{errorMessage}</p>
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mt-4"
            >
              Go Back
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Call Controls */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="absolute bottom-0 left-0 right-0 p-6 z-10"
      >
        <div className="flex items-center justify-center gap-4">
          {/* Mute Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isMuted ? 'bg-red-500' : 'bg-white/20 backdrop-blur-sm'
            }`}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </motion.button>
          
          {/* Video Toggle (only for video calls) */}
          {isVideo && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                isVideoOff ? 'bg-red-500' : 'bg-white/20 backdrop-blur-sm'
              }`}
            >
              {isVideoOff ? (
                <VideoOff className="w-6 h-6 text-white" />
              ) : (
                <Video className="w-6 h-6 text-white" />
              )}
            </motion.button>
          )}
          
          {/* End Call Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={endCall}
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </motion.button>
          
          {/* Speaker Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              !isSpeakerOn ? 'bg-red-500' : 'bg-white/20 backdrop-blur-sm'
            }`}
          >
            {isSpeakerOn ? (
              <Volume2 className="w-6 h-6 text-white" />
            ) : (
              <VolumeX className="w-6 h-6 text-white" />
            )}
          </motion.button>
          
          {/* Message Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
          >
            <MessageSquare className="w-6 h-6 text-white" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

export default CallPage