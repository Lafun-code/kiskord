import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWebRTC } from "../hooks/useWebRTC";
import { Button } from "../components/ui/Button";
import { ParticipantCard } from "../components/ParticipantCard";
import { Mic, MicOff, PhoneOff, Copy, Check, MessageSquare, Settings } from "lucide-react";
import { Header } from "../components/Header";
import { ChatPanel } from "../components/chat/ChatPanel";
import { AudioSettings } from "../components/AudioSettings";
import { ConnectionMonitor } from "../components/ConnectionMonitor";
import { AudioProcessingOptions } from "../utils/audioProcessor";

export function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, userDisplayName } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [audioOptions, setAudioOptions] = useState<AudioProcessingOptions>({
      audioQuality: "ultra",      // ULTRA mode (Discord-level) varsayılan
      useRNNoise: true,           // RNNoise varsayılan olarak açık
      noiseSuppression: false,    // Browser NS kapalı (RNNoise kullanıyoruz)
      echoCancellation: false,    // Browser EC kapalı (RNNoise kullanıyoruz)
      autoGainControl: false,     // Browser AGC kapalı (RNNoise kullanıyoruz)
      suppressionLevel: "medium",
      vadEnabled: true,           // VAD açık
      vadThreshold: 80,           // Maksimum agresif (nefes/klavye/alkış filtreleme)
      vadGracePeriod: 150,        // Çok kısa grace period
      highPassFilter: true,       // HPF açık
      highPassCutoff: 150,        // Çok yüksek cutoff (nefes seslerini kes)
      // Ultra features
      useNoiseGate: true,
      noiseGateThreshold: -70,    // Ekstrem agresif gate (nefes/klavye/alkış)
      useVoiceEQ: true,
      useDeEsser: true,
      useLimiter: true,
      outputGain: 1.4
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!user || !userDisplayName) {
      navigate("/");
    }
  }, [user, userDisplayName, navigate]);

  const webRTCUser = useMemo(() => {
    return user && userDisplayName ? { uid: user.uid, displayName: userDisplayName } : null;
  }, [user, userDisplayName]);

  const { participants, isMuted, toggleMute, speakingPeers, voiceLevel, isSelfMonitoring, toggleSelfMonitor, peerConnections } = useWebRTC(
    roomId || null,
    webRTCUser,
    audioOptions
  );

  // Get first peer connection for monitoring (typically the most active)
  const activePeerConnection = useMemo(() => {
    const connections = Object.values(peerConnections);
    // Find a connected peer (not just any peer)
    const connectedPeer = connections.find(pc => 
      pc.connectionState === 'connected' || pc.iceConnectionState === 'connected'
    );
    return connectedPeer || (connections.length > 0 ? connections[0] : null);
  }, [peerConnections]);

  // Check if we have any active peer connections
  const hasActiveConnection = useMemo(() => {
    return activePeerConnection !== null && 
           (activePeerConnection.connectionState === 'connected' || 
            activePeerConnection.iceConnectionState === 'connected');
  }, [activePeerConnection]);

  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeave = () => {
    navigate("/");
  };

  if (!user || !userDisplayName) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 pt-24 pb-8 flex flex-col">
        {/* Room Info */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold">Room</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-muted-foreground font-mono bg-secondary px-2 py-1 rounded text-sm">
                {roomId}
              </span>
              <button
                onClick={copyRoomId}
                className="p-1 hover:bg-secondary rounded-md transition-colors text-muted-foreground hover:text-foreground"
                title="Copy Room ID"
                aria-label="Copy Room ID to clipboard"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
          
          {/* Connection Monitor */}
          <div className="flex items-center gap-4">
            <ConnectionMonitor 
              peerConnection={activePeerConnection}
              isConnected={hasActiveConnection}
            />
            <div className="text-sm text-muted-foreground">
              {participants.length} Participant{participants.length !== 1 && "s"}
            </div>
          </div>
        </div>

        {/* Participants Grid */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 content-start">
          {participants.map((p) => (
            <ParticipantCard
              key={p.id}
              name={p.displayName}
              isMuted={p.isMuted}
              isSpeaking={speakingPeers.has(p.id)}
              isLocal={p.id === user.uid}
            />
          ))}
          {participants.length === 0 && (
             <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p>Waiting for others to join...</p>
             </div>
          )}
        </div>

        {/* Controls */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-secondary/80 backdrop-blur-md p-4 rounded-full border border-border shadow-2xl z-40">
          <Button
            variant={isMuted ? "danger" : "secondary"}
            size="icon"
            className="h-14 w-14 rounded-full"
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>
          
          <Button
             variant="secondary"
             size="icon"
             className="h-14 w-14 rounded-full relative"
             onClick={() => setIsChatOpen(!isChatOpen)}
          >
             <MessageSquare className="h-6 w-6" />
          </Button>

          <Button
             variant="secondary"
             size="icon"
             className="h-14 w-14 rounded-full"
             onClick={() => setShowSettings(!showSettings)}
          >
             <Settings className="h-6 w-6" />
          </Button>

          <Button
            variant="danger"
            size="icon"
            className="h-14 w-14 rounded-full"
            onClick={handleLeave}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </main>

      {/* Chat Panel */}
      <ChatPanel 
         roomId={roomId || ""} 
         isOpen={isChatOpen} 
         onClose={() => setIsChatOpen(false)} 
      />

      {/* Audio Settings Panel */}
      <AudioSettings
        options={audioOptions}
        onOptionsChange={setAudioOptions}
        voiceLevel={voiceLevel || 0}
        isSelfMonitoring={isSelfMonitoring}
        onToggleSelfMonitor={toggleSelfMonitor}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}
