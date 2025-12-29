import { useEffect, useRef, useState, useCallback } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Participant } from "../types";
import { 
  getAudioConstraints, 
  AudioProcessingOptions, 
  VoiceActivityDetector,
  HighPassFilter,
  ProfessionalAudioChain
} from "../utils/audioProcessor";

const DEBUG = import.meta.env.VITE_DEBUG === 'true';
const log = (message: string, data?: unknown) => {
  if (DEBUG) {
    console.log(`[WebRTC] ${message}`, data ?? '');
  }
};

const STUN_SERVERS = {
  iceServers: [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
      ],
    },
  ],
  iceCandidatePoolSize: 10, // Daha fazla ICE candidate topla
};

// Helper to check speaking status and get audio level
const isAudioSpeaking = (analyser: AnalyserNode) => {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    const sum = dataArray.reduce((a, b) => a + b, 0);
    const average = sum / bufferLength;
    return average > 10; // Threshold
};

const getAudioLevel = (analyser: AnalyserNode): number => {
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);
    
    // Calculate RMS (Root Mean Square) for accurate volume
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
        const normalized = (dataArray[i] - 128) / 128; // Normalize to -1 to 1
        sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / bufferLength);
    
    // Convert to 0-100 scale with much better sensitivity
    // Use logarithmic scale for better representation
    const db = 20 * Math.log10(rms + 0.0001);
    const normalizedDb = Math.max(0, Math.min(100, (db + 60) * 1.67)); // -60dB to 0dB -> 0 to 100
    return normalizedDb;
};

export function useWebRTC(
  roomId: string | null,
  user: { uid: string; displayName: string } | null,
  audioOptions: AudioProcessingOptions = {
      noiseSuppression: true,
      echoCancellation: true,
      autoGainControl: true,
      suppressionLevel: "medium",
      useRNNoise: false,
      vadEnabled: true,          // Voice Activity Detection aktif
      vadThreshold: 40,          // Daha yüksek hassasiyet (daha az gürültü)
      vadGracePeriod: 300,       // 300ms grace period
      highPassFilter: true,      // Fan/AC gürültüsü filtrele
      highPassCutoff: 80         // 80Hz altını kes
  },
  selectedDeviceId?: string // Optional microphone device ID
) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [speakingPeers, setSpeakingPeers] = useState<Set<string>>(new Set());
  const [voiceLevel, setVoiceLevel] = useState<number>(0);
  const [isSelfMonitoring, setIsSelfMonitoring] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | undefined>(selectedDeviceId);
  
  const peerConnections = useRef<{ [key: string]: RTCPeerConnection }>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const participantsRef = useRef<Participant[]>([]);
  const currentAudioOptionsRef = useRef<AudioProcessingOptions>(audioOptions);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map()); // Track audio elements for cleanup
  const remoteStreamSourcesRef = useRef<Map<string, MediaStreamAudioSourceNode>>(new Map()); // Track remote stream sources
  
  // Audio analysis and RNNoise
  const audioContextRef = useRef<AudioContext | null>(null);
  const rnnoiseNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const destinationNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const analysersRef = useRef<{ [key: string]: AnalyserNode }>({}); // uid -> Analyser
  const animationFrameRef = useRef<number | null>(null);
  
  // Advanced noise suppression
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const highPassFilterRef = useRef<HighPassFilter | null>(null);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const professionalChainRef = useRef<ProfessionalAudioChain | null>(null);
  const audioMonitorGainRef = useRef<GainNode | null>(null);

  // Load RNNoise Module
  const loadRNNoise = useCallback(async (context: AudioContext) => {
    try {
      log("Loading RNNoise worklet...");
      await context.audioWorklet.addModule('/rnnoise/rnnoise-processor.js');
      log("RNNoise worklet loaded successfully");
    } catch (e) {
      log("Failed to load RNNoise worklet");
      throw e; // Re-throw to handle in initLocalStream
    }
  }, []);

  // Update RNNoise state when options change
  useEffect(() => {
    currentAudioOptionsRef.current = audioOptions;
    
    if (rnnoiseNodeRef.current) {
        try {
            rnnoiseNodeRef.current.port.postMessage({
                type: 'enable',
                value: audioOptions.useRNNoise
            });
            log(`RNNoise enabled: ${audioOptions.useRNNoise}`);
        } catch (e) {
            log("Failed to update RNNoise state");
        }
    }

    // Apply new constraints to existing track if possible
    // Note: When RNNoise is active, we can't modify the original track constraints
    // because the audio is being processed through AudioWorklet
    if (localStreamRef.current && !audioOptions.useRNNoise) {
       const audioTrack = localStreamRef.current.getAudioTracks()[0];
       if (audioTrack) {
           // Check current capabilities first to avoid applying unsupported constraints
           const capabilities = audioTrack.getCapabilities ? audioTrack.getCapabilities() : null;
           
           // Build constraints object with only supported properties
           const softConstraints: MediaTrackConstraints = {};
           
           // Only add constraints if they're supported by the device
           if (!capabilities || 'echoCancellation' in capabilities) {
               softConstraints.echoCancellation = { ideal: audioOptions.echoCancellation };
           }
           if (!capabilities || 'noiseSuppression' in capabilities) {
               softConstraints.noiseSuppression = { ideal: audioOptions.noiseSuppression };
           }
           if (!capabilities || 'autoGainControl' in capabilities) {
               softConstraints.autoGainControl = { ideal: audioOptions.autoGainControl };
           }
           
           // Only apply if we have constraints to apply
           if (Object.keys(softConstraints).length > 0) {
               audioTrack.applyConstraints(softConstraints)
                .then(() => {
                    const settings = audioTrack.getSettings();
                    log(`Audio constraints updated: EC=${settings.echoCancellation}, NS=${settings.noiseSuppression}, AGC=${settings.autoGainControl}`);
                })
                .catch((err) => {
                    log(`Failed to apply constraints: ${err.message}. Using browser defaults.`);
                });
           } else {
               log("No supported audio constraints available, using browser defaults");
           }
       }
    } else if (audioOptions.useRNNoise) {
       log("RNNoise is active - audio processing handled by AudioWorklet, browser constraints disabled");
    }
  }, [audioOptions]);

  // Initialize Media Stream
  const initLocalStream = useCallback(async (deviceId?: string) => {
    try {
      log("Initializing local stream...");
      const baseConstraints = getAudioConstraints(currentAudioOptionsRef.current);
      
      // Add device selection if specified
      const constraints = deviceId 
        ? { ...baseConstraints, deviceId: { exact: deviceId } }
        : baseConstraints;
      
      log(`Requesting microphone with constraints: ${JSON.stringify(constraints)}`);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: constraints,
        video: false,
      });
      log("Microphone access granted");
      
      // Log the actual settings that were applied
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const settings = audioTrack.getSettings();
        log(`Audio track settings: EC=${settings.echoCancellation}, NS=${settings.noiseSuppression}, AGC=${settings.autoGainControl}, SR=${settings.sampleRate}, DeviceId=${settings.deviceId}`);
      }
      
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Setup Audio Analysis and RNNoise for Local Stream
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      log(`AudioContext created. State: ${audioContext.state}`);

      try {
          await loadRNNoise(audioContext);
      } catch {
          log("RNNoise load failed, using fallback");
      }
      
      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;
      
      const destination = audioContext.createMediaStreamDestination();
      destinationNodeRef.current = destination;
      
      // Analyser for raw input (for accurate voice level display)
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.3;
      
      // Connect analyser directly to source for real-time level monitoring
      source.connect(analyser);
      
      // Monitor gain node for self-monitoring (loopback)
      // Use raw source for cleaner monitoring (avoid processed audio feedback)
      const monitorGain = audioContext.createGain();
      monitorGain.gain.value = 0; // Start muted
      
      // Create stereo panner for centered audio
      const stereoPanner = audioContext.createStereoPanner();
      stereoPanner.pan.value = 0; // Center (both ears equally)
      
      // Connect: source → monitorGain → stereoPanner → speakers
      source.connect(monitorGain);
      monitorGain.connect(stereoPanner);
      stereoPanner.connect(audioContext.destination);
      
      audioMonitorGainRef.current = monitorGain;
      
      // Check if we should use RNNoise or basic mode
      const useRNNoiseProcessing = currentAudioOptionsRef.current.useRNNoise && 
                                    currentAudioOptionsRef.current.audioQuality !== 'basic';
      
      if (!useRNNoiseProcessing) {
        // CLEAN MODE: Browser işlemcisini kullan (Discord ile aynı teknoloji)
        // Chrome'un yerleşik noiseSuppression'ı RNNoise tabanlı - profesyonel kalite
        log("Setting up CLEAN audio mode (browser-native processing)...");
        
        // Direkt bağlantı - browser zaten tüm işlemeyi yaptı
        // HPF gereksiz çünkü browser NS zaten düşük frekanslara bakıyor
        source.connect(destination);
        
        // Use the processed stream for transmission
        const processedStream = destination.stream;
        const processedAudioTrack = processedStream.getAudioTracks()[0];
        if (processedAudioTrack) {
          log(`Basic audio track ready: enabled=${processedAudioTrack.enabled}`);
          const finalStream = new MediaStream();
          finalStream.addTrack(processedAudioTrack);
          
          localStreamRef.current = finalStream;
          setLocalStream(finalStream);
          
          audioContextRef.current = audioContext;
          if (user) {
            analysersRef.current[user.uid] = analyser;
          }
          
          log("BASIC audio chain setup complete - using browser noise suppression");
          return finalStream;
        }
      }
      
      // RNNoise / Professional Mode
      try {
          log("Creating RNNoise AudioWorkletNode...");
          const rnnoiseNode = new AudioWorkletNode(audioContext, 'rnnoise-processor');
          rnnoiseNode.port.onmessage = (event) => {
              if (event.data.type === 'error') {
                  log("RNNoise Processor Error");
              } else if (event.data.type === 'ready') {
                  log("RNNoise Processor Ready");
              }
          };

          // Fetch WASM file
          let wasmBytes = null;
          try {
              const response = await fetch('/rnnoise/rnnoise.wasm');
              if (response.ok) {
                  wasmBytes = await response.arrayBuffer();
                  log("Fetched RNNoise WASM successfully");
              } else {
                  log("Failed to fetch RNNoise WASM");
              }
          } catch (fetchError) {
              log("Error fetching RNNoise WASM");
          }

          rnnoiseNode.port.postMessage({
              type: 'init',
              wasmBytes: wasmBytes
          });
          // Always start with RNNoise enabled if useRNNoise is true
          rnnoiseNode.port.postMessage({
              type: 'enable',
              value: true  // Start enabled, will be controlled via options
          });
          rnnoiseNodeRef.current = rnnoiseNode;

          // Check if using professional audio chain
          const useProfessional = currentAudioOptionsRef.current.audioQuality === 'professional' ||
                                  currentAudioOptionsRef.current.audioQuality === 'balanced' ||
                                  currentAudioOptionsRef.current.audioQuality === 'ultra';
          const isUltraMode = currentAudioOptionsRef.current.audioQuality === 'ultra';

          if (useProfessional) {
            // Use professional audio chain (or ultra mode)
            log(`Setting up ${isUltraMode ? 'ULTRA (Discord-level)' : 'professional'} audio chain...`);
            const proChain = new ProfessionalAudioChain(audioContext, isUltraMode);
            professionalChainRef.current = proChain;

            // Connect the professional chain with RNNoise
            proChain.connectWithRNNoise(source, rnnoiseNode, destination);
            
            // Note: Self-monitoring is already connected to raw source above
            // This prevents feedback and provides cleaner audio
            
            // Apply custom settings
            if (currentAudioOptionsRef.current.noiseGateThreshold !== undefined) {
              proChain.setNoiseGateThreshold(currentAudioOptionsRef.current.noiseGateThreshold);
            }
            if (currentAudioOptionsRef.current.outputGain !== undefined) {
              proChain.setOutputGain(currentAudioOptionsRef.current.outputGain);
            }
            
            log(`${isUltraMode ? 'ULTRA' : 'Professional'} audio chain setup complete`);
          } else {
            // Legacy simple chain
            log("Setting up simple audio chain...");
            
            // Setup High-Pass Filter (removes fan noise, AC hum, rumble)
            let graphStart: AudioNode = source;
            if (currentAudioOptionsRef.current.highPassFilter !== false) {
              const hpf = new HighPassFilter(
                audioContext, 
                currentAudioOptionsRef.current.highPassCutoff || 80
              );
              source.connect(hpf.getNode());
              graphStart = hpf.getNode();
              highPassFilterRef.current = hpf;
              log(`High-pass filter enabled: ${hpf.getNode().frequency.value}Hz cutoff`);
            }

            // Connect graph: Source -> [HPF] -> RNNoise -> Compressor -> Destination/Analyser
            const compressor = audioContext.createDynamicsCompressor();
            // Gentle compression to avoid distortion
            compressor.threshold.setValueAtTime(-50, audioContext.currentTime);
            compressor.knee.setValueAtTime(20, audioContext.currentTime);
            compressor.ratio.setValueAtTime(6, audioContext.currentTime);
            compressor.attack.setValueAtTime(0.005, audioContext.currentTime);
            compressor.release.setValueAtTime(0.15, audioContext.currentTime);

            graphStart.connect(rnnoiseNode);
            rnnoiseNode.connect(compressor);
            compressor.connect(destination);
            
            // Connect monitor for self-monitoring (loopback)
            destination.connect(monitorGain);
            monitorGain.connect(audioContext.destination);
            
            log("Simple audio chain setup complete");
          }

          // Setup Voice Activity Detection
          if (currentAudioOptionsRef.current.vadEnabled !== false) {
            const vad = new VoiceActivityDetector(
              stream,
              audioContext,
              currentAudioOptionsRef.current.vadThreshold || 25,
              currentAudioOptionsRef.current.vadGracePeriod || 300
            );
            vadRef.current = vad;
            log(`VAD enabled: threshold=${vad['threshold']}`);
            
            // VAD artık sadece gösterge için kullanılıyor, audio track'i disable etmiyor
            // Bu sayede ses kesintisi olmuyor
            vadIntervalRef.current = setInterval(() => {
              if (vadRef.current) {
                // Sadece speaking state'i güncellemek için kullan
                // Track'i disable etme - Noise Gate bunu daha iyi yapıyor
                vadRef.current.isSpeaking();
              }
            }, 100); // 100ms interval (daha az CPU kullanımı)
          }

          // Use the processed stream for transmission
          const processedStream = destination.stream;
          const processedAudioTrack = processedStream.getAudioTracks()[0];
          if (processedAudioTrack) {
               log(`Processed audio track ready: enabled=${processedAudioTrack.enabled}, readyState=${processedAudioTrack.readyState}`);
               const finalStream = new MediaStream();
               finalStream.addTrack(processedAudioTrack);
               
               localStreamRef.current = finalStream;
               setLocalStream(finalStream);
               
               audioContextRef.current = audioContext;
               if (user) {
                   analysersRef.current[user.uid] = analyser;
               }
               
               return finalStream;
          } else {
               log("No processed audio track available, using original stream");
               localStreamRef.current = stream;
               setLocalStream(stream);
               return stream;
          }

      } catch (e) {
          log("Error setting up RNNoise graph, falling back to simple graph");
          
          // Fallback graph - 중요: destination에 연결해야 함!
          const compressor = audioContext.createDynamicsCompressor();
          source.connect(compressor);
          compressor.connect(analyser);
          compressor.connect(destination); // CRITICAL: destination에 연결
          
          audioContextRef.current = audioContext;
          if (user) {
              analysersRef.current[user.uid] = analyser;
          }
          
          // Use destination stream
          const fallbackTrack = destination.stream.getAudioTracks()[0];
          if (fallbackTrack) {
              const fallbackStream = new MediaStream([fallbackTrack]);
              localStreamRef.current = fallbackStream;
              setLocalStream(fallbackStream);
              return fallbackStream;
          }
          
          // Last resort: original stream
          log("Fallback failed, using original stream");
          localStreamRef.current = stream;
          setLocalStream(stream);
          return stream;
      }

      return stream;
    } catch (error) {
      log("Error accessing microphone");
      alert("Microphone permission denied. Please enable it to join the voice chat.");
      return null;
    }
  }, [user, loadRNNoise]);

  // Speaking Detection Loop
  const detectSpeaking = useCallback(() => {
    const currentlySpeaking = new Set<string>();
    let maxLevel = 0;

    Object.entries(analysersRef.current).forEach(([uid, analyser]) => {
        if (isAudioSpeaking(analyser)) {
            currentlySpeaking.add(uid);
        }
        // Get level for local user (user.uid)
        if (user && uid === user.uid) {
            maxLevel = Math.max(maxLevel, getAudioLevel(analyser));
        }
    });

    // Update voice level
    setVoiceLevel(maxLevel);

    setSpeakingPeers(prev => {
        // Only update if changed to avoid re-renders
        const isSame = prev.size === currentlySpeaking.size && 
                       [...prev].every(value => currentlySpeaking.has(value));
        return isSame ? prev : currentlySpeaking;
    });

    animationFrameRef.current = requestAnimationFrame(detectSpeaking);
  }, [user]);

  // Start/Stop detection loop
  useEffect(() => {
      if (localStream) {
          detectSpeaking();
      }
      return () => {
          if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
          }
      };
  }, [localStream, detectSpeaking]);


  // Helper to create PeerConnection
  const createPeerConnection = useCallback((targetUserId: string, stream: MediaStream) => {
    const pc = new RTCPeerConnection(STUN_SERVERS);
    
    // Add local tracks with logging
    const tracks = stream.getTracks();
    log(`Adding ${tracks.length} tracks to connection with ${targetUserId}`);
    tracks.forEach((track) => {
      log(`Adding track: ${track.kind}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
      pc.addTrack(track, stream);
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && roomId && user) {
        const candidateRef = collection(db, "rooms", roomId, "participants", targetUserId, "incoming_ice");
        addDoc(candidateRef, {
          candidate: event.candidate.toJSON(),
          from: user.uid,
        }).catch(() => log("Failed to add ICE candidate"));
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      log(`Connection state with ${targetUserId}: ${pc.connectionState}`);
      
      if (pc.connectionState === 'connected') {
        log(`Successfully connected to ${targetUserId}`);
      } else if (pc.connectionState === 'failed') {
        log(`Connection failed with ${targetUserId}, ICE state: ${pc.iceConnectionState}`);
        // Temizlik yap ama hemen silme, reconnect şansı ver
        setTimeout(() => {
          if (pc.connectionState === 'failed') {
            log(`Connection still failed with ${targetUserId}, closing...`);
            pc.close();
            delete peerConnections.current[targetUserId];
          }
        }, 3000); // 3 saniye bekle
      } else if (pc.connectionState === 'disconnected') {
        log(`Connection disconnected with ${targetUserId}, waiting for reconnection...`);
        // Disconnected durumunda hemen kapatma, reconnect deneyebilir
      }
    };
    
    // ICE connection state değişikliklerini de izle
    pc.oniceconnectionstatechange = () => {
      log(`ICE connection state with ${targetUserId}: ${pc.iceConnectionState}`);
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      log(`Receiving remote track from ${targetUserId}`);
      
      // Audio Playback - use Map to track audio elements
      let audioElement = audioElementsRef.current.get(targetUserId);
      if (!audioElement) {
        audioElement = document.createElement("audio");
        audioElement.id = `audio-${targetUserId}`;
        audioElement.autoplay = true;
        (audioElement as HTMLMediaElement & { playsInline?: boolean }).playsInline = true;
        audioElement.muted = false; // CRITICAL: Remote audio should NOT be muted
        audioElement.volume = 1.0; // Full volume
        document.body.appendChild(audioElement);
        audioElementsRef.current.set(targetUserId, audioElement);
        log(`Created audio element for ${targetUserId}`);
      }
      
      audioElement.srcObject = remoteStream;
      
      // Explicitly play the audio (some browsers require this)
      audioElement.play().then(() => {
        log(`Audio playback started for ${targetUserId}`);
      }).catch((e) => {
        log(`Failed to start audio playback for ${targetUserId}`);
      });

      // Audio Analysis for Remote Stream
      if (audioContextRef.current) {
          const analyser = audioContextRef.current.createAnalyser();
          analyser.fftSize = 256;
          // Only connect to analyser, NOT to destination (speaker playback handled by <audio> tag)
          // This prevents feedback and ensures remote stream audio is only analyzed, not mixed back
          const source = audioContextRef.current.createMediaStreamSource(remoteStream);
          source.connect(analyser);
          analysersRef.current[targetUserId] = analyser;
          remoteStreamSourcesRef.current.set(targetUserId, source);
          log(`Setup audio analysis for ${targetUserId}`);
      }
    };

    peerConnections.current[targetUserId] = pc;
    return pc;
  }, [roomId, user]);

  // Join Room Logic
  useEffect(() => {
    if (!roomId || !user) return;

    let unsubParticipants: () => void;
    let unsubOffers: () => void;
    let unsubAnswers: () => void;
    let unsubIce: () => void;

    const join = async () => {
      const stream = await initLocalStream();
      if (!stream) return;

      // Add self to Firestore
      const participantRef = doc(db, "rooms", roomId, "participants", user.uid);
      await setDoc(participantRef, {
        displayName: user.displayName,
        isMuted: false,
        joinedAt: serverTimestamp(),
      });

      // Listen to participants
      const participantsCollection = collection(db, "rooms", roomId, "participants");
      unsubParticipants = onSnapshot(participantsCollection, async (snapshot) => {
        const currentParticipants: Participant[] = [];
        
        for (const doc of snapshot.docs) {
          const data = doc.data();
          currentParticipants.push({
            id: doc.id,
            displayName: data.displayName,
            isMuted: data.isMuted,
          });

          // Check for new peers to connect to
          if (doc.id !== user.uid && !peerConnections.current[doc.id]) {
            if (user.uid < doc.id) {
               log(`Initiating connection to ${doc.id}`);
               const pc = createPeerConnection(doc.id, stream);
               const offer = await pc.createOffer();
               await pc.setLocalDescription(offer);

               const offerRef = collection(db, "rooms", roomId, "participants", doc.id, "incoming_offers");
               await addDoc(offerRef, {
                 sdp: JSON.stringify(offer),
                 from: user.uid,
                 type: 'offer'
               });
            }
          }
        }
        setParticipants(currentParticipants);
        participantsRef.current = currentParticipants;
      });

      // Listen for incoming offers
      const myOffersRef = collection(db, "rooms", roomId, "participants", user.uid, "incoming_offers");
      unsubOffers = onSnapshot(myOffersRef, async (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            const fromUserId = data.from;
            
            if (!peerConnections.current[fromUserId]) {
                log(`Received offer from ${fromUserId}`);
                const pc = createPeerConnection(fromUserId, stream);
                
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.sdp)));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    const answerRef = collection(db, "rooms", roomId, "participants", fromUserId, "incoming_answers");
                    await addDoc(answerRef, {
                        sdp: JSON.stringify(answer),
                        from: user.uid,
                        type: 'answer'
                    });
                    log(`Sent answer to ${fromUserId}`);
                } catch (e) {
                    log(`Failed to handle offer from ${fromUserId}`);
                }
            }
            await deleteDoc(change.doc.ref);
          }
        });
      });

      // Listen for incoming answers
      const myAnswersRef = collection(db, "rooms", roomId, "participants", user.uid, "incoming_answers");
      unsubAnswers = onSnapshot(myAnswersRef, (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
              if (change.type === "added") {
                  const data = change.doc.data();
                  const fromUserId = data.from;
                  const pc = peerConnections.current[fromUserId];
                  if (pc && pc.signalingState === 'have-local-offer') {
                      try {
                          log(`Received answer from ${fromUserId}`);
                          await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.sdp)));
                          log(`Set remote description for ${fromUserId}`);
                      } catch (e) {
                          log(`Failed to set remote description for ${fromUserId}`);
                      }
                  } else if (pc) {
                      log(`Ignoring answer from ${fromUserId}, wrong signaling state: ${pc.signalingState}`);
                  }
                  await deleteDoc(change.doc.ref);
              }
          });
      });

      // Listen for incoming ICE candidates
      const myIceRef = collection(db, "rooms", roomId, "participants", user.uid, "incoming_ice");
      unsubIce = onSnapshot(myIceRef, (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
              if (change.type === "added") {
                  const data = change.doc.data();
                  const fromUserId = data.from;
                  const pc = peerConnections.current[fromUserId];
                  if (pc && pc.remoteDescription) {
                      // Sadece remote description setlenmisse ICE candidate ekle
                      try {
                          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                          log(`Added ICE candidate from ${fromUserId}`);
                      } catch (e) {
                          log(`Failed to add ICE candidate from ${fromUserId}`);
                      }
                  }
                  await deleteDoc(change.doc.ref);
              }
          });
      });
    };

    join();

    const handleBeforeUnload = () => {
       if (roomId && user) {
           const participantRef = doc(db, "rooms", roomId, "participants", user.uid);
           deleteDoc(participantRef).catch(console.error);
       }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      log("Cleaning up WebRTC resources...");
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Copy ref values to local variables - safe for cleanup
      const audioElements = new Map(audioElementsRef.current);
      const remoteSources = new Map(remoteStreamSourcesRef.current);

      // Stop local stream tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop();
          log(`Stopped local track: ${track.kind}`);
        });
      }
      
      // Close all peer connections
      Object.entries(peerConnections.current).forEach(([userId, pc]) => {
        pc.close();
        log(`Closed peer connection with ${userId}`);
      });
      peerConnections.current = {};

      // Clean up audio elements
      audioElements.forEach((audioElement, userId) => {
        if (audioElement.parentNode) {
          audioElement.parentNode.removeChild(audioElement);
          log(`Removed audio element for ${userId}`);
        }
      });
      audioElementsRef.current.clear();

      // Clean up remote stream sources
      remoteSources.forEach((source, userId) => {
        try {
          source.disconnect();
          log(`Disconnected audio source for ${userId}`);
        } catch (e) {
          log(`Error disconnecting source for ${userId}`);
        }
      });
      remoteStreamSourcesRef.current.clear();

      // Remove from database
      if (roomId && user) {
          const participantRef = doc(db, "rooms", roomId, "participants", user.uid);
          deleteDoc(participantRef).catch(() => log("Failed to remove participant on cleanup"));
      }
      
      // Cleanup Audio Nodes
      if (vadIntervalRef.current) {
          clearInterval(vadIntervalRef.current);
          vadIntervalRef.current = null;
          log("Stopped VAD interval");
      }
      if (vadRef.current) {
          try {
              vadRef.current.disconnect();
              vadRef.current = null;
              log("Disconnected VAD");
          } catch { /* ignore */ }
      }
      if (highPassFilterRef.current) {
          try {
              highPassFilterRef.current.disconnect();
              highPassFilterRef.current = null;
              log("Disconnected High-Pass Filter");
          } catch { /* ignore */ }
      }
      if (professionalChainRef.current) {
          try {
              professionalChainRef.current.disconnect();
              professionalChainRef.current = null;
              log("Disconnected Professional Audio Chain");
          } catch { /* ignore */ }
      }
      if (rnnoiseNodeRef.current) {
          try {
              rnnoiseNodeRef.current.disconnect();
              rnnoiseNodeRef.current = null;
              log("Disconnected RNNoise node");
          } catch { /* ignore */ }
      }
      if (sourceNodeRef.current) {
          try {
              sourceNodeRef.current.disconnect();
              sourceNodeRef.current = null;
              log("Disconnected source node");
          } catch { /* ignore */ }
      }
      if (destinationNodeRef.current) {
          try {
              destinationNodeRef.current.disconnect();
              destinationNodeRef.current = null;
              log("Disconnected destination node");
          } catch { /* ignore */ }
      }
      if (audioMonitorGainRef.current) {
          try {
              audioMonitorGainRef.current.disconnect();
              audioMonitorGainRef.current = null;
              log("Disconnected audio monitor");
          } catch { /* ignore */ }
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().then(() => log("AudioContext closed"));
      }
      audioContextRef.current = null;

      if (unsubParticipants) unsubParticipants();
      if (unsubOffers) unsubOffers();
      if (unsubAnswers) unsubAnswers();
      if (unsubIce) unsubIce();
      
      log("WebRTC cleanup completed");
    };
  }, [roomId, user, initLocalStream, createPeerConnection]);

  const toggleMute = async () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        
        if (roomId && user) {
             const participantRef = doc(db, "rooms", roomId, "participants", user.uid);
             await updateDoc(participantRef, {
                 isMuted: !audioTrack.enabled
             });
        }
      }
    }
  };

  const toggleSelfMonitor = () => {
    if (audioMonitorGainRef.current) {
      const newState = !isSelfMonitoring;
      audioMonitorGainRef.current.gain.setValueAtTime(
        newState ? 0.8 : 0, // 80% volume when on, muted when off
        audioContextRef.current?.currentTime || 0
      );
      setIsSelfMonitoring(newState);
      log(`Self-monitoring ${newState ? 'enabled' : 'disabled'}`);
    }
  };

  // Change input device (microphone)
  const changeInputDevice = useCallback(async (deviceId: string) => {
    log(`Changing input device to: ${deviceId}`);
    setCurrentDeviceId(deviceId);
    
    // Stop current stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Reinitialize with new device
    const newStream = await initLocalStream(deviceId || undefined);
    
    if (newStream) {
      // Update all peer connections with new track
      const newTrack = newStream.getAudioTracks()[0];
      if (newTrack) {
        Object.values(peerConnections.current).forEach(pc => {
          const senders = pc.getSenders();
          const audioSender = senders.find(s => s.track?.kind === 'audio');
          if (audioSender) {
            audioSender.replaceTrack(newTrack);
            log('Replaced audio track in peer connection');
          }
        });
      }
    }
  }, [initLocalStream]);

  // Change output device (speaker/headphones)
  const changeOutputDevice = useCallback(async (deviceId: string) => {
    log(`Changing output device to: ${deviceId}`);
    
    // Update all audio elements
    audioElementsRef.current.forEach((audioElement, peerId) => {
      if (typeof audioElement.setSinkId === 'function') {
        audioElement.setSinkId(deviceId)
          .then(() => log(`Set output device for peer ${peerId}`))
          .catch(err => log(`Failed to set output device: ${err}`));
      }
    });
  }, []);

  return {
    participants,
    isMuted,
    toggleMute,
    localStream,
    speakingPeers,
    voiceLevel,
    isSelfMonitoring,
    toggleSelfMonitor,
    peerConnections: peerConnections.current, // Expose peer connections for monitoring
    changeInputDevice,
    changeOutputDevice,
  };
}
