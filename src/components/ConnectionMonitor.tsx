import { useEffect, useState } from 'react';
import { Activity, Wifi, WifiOff, Users, Loader2 } from 'lucide-react';

interface ConnectionStats {
  latency: number;        // RTT in ms
  jitter: number;         // Jitter in ms
  packetLoss: number;     // Packet loss percentage
  bitrate: number;        // Audio bitrate in kbps
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

interface ConnectionMonitorProps {
  peerConnection: RTCPeerConnection | null;
  isConnected: boolean;
  connectionState?: ConnectionState;
  participantCount?: number;
}

export const ConnectionMonitor = ({ 
  peerConnection, 
  isConnected, 
  connectionState = 'disconnected',
  participantCount = 1 
}: ConnectionMonitorProps) => {
  const [stats, setStats] = useState<ConnectionStats>({
    latency: 0,
    jitter: 0,
    packetLoss: 0,
    bitrate: 0,
  });

  useEffect(() => {
    if (!peerConnection || !isConnected) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const statsReport = await peerConnection.getStats();
        
        let latency = 0;
        let jitter = 0;
        let packetLoss = 0;
        let bitrate = 0;

        statsReport.forEach((report) => {
          // Inbound audio stats
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            jitter = (report.jitter || 0) * 1000; // Convert to ms
            packetLoss = report.packetsLost || 0;
            bitrate = Math.round((report.bytesReceived || 0) * 8 / 1024); // kbps
          }

          // Candidate pair for RTT
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            latency = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0;
          }
        });

        setStats({
          latency: Math.round(latency),
          jitter: Math.round(jitter * 10) / 10, // 1 decimal
          packetLoss: Math.round(packetLoss),
          bitrate: Math.round(bitrate),
        });
      } catch (error) {
        console.error('[ConnectionMonitor] Error getting stats:', error);
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [peerConnection, isConnected]);

  // Quality indicator based on latency and jitter
  const getQualityColor = () => {
    if (!isConnected) return 'text-gray-500';
    
    const totalDelay = stats.latency + stats.jitter;
    if (totalDelay < 50) return 'text-green-500';
    if (totalDelay < 100) return 'text-yellow-500';
    if (totalDelay < 200) return 'text-orange-500';
    return 'text-red-500';
  };

  const getQualityLabel = () => {
    if (!isConnected) return 'Disconnected';
    
    const totalDelay = stats.latency + stats.jitter;
    if (totalDelay < 50) return 'Excellent';
    if (totalDelay < 100) return 'Good';
    if (totalDelay < 200) return 'Fair';
    return 'Poor';
  };

  // Alone in room - show waiting message
  if (participantCount <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
        <Users className="w-4 h-4 text-blue-400" />
        <span className="text-sm text-blue-400">Waiting for others...</span>
      </div>
    );
  }

  // Connecting state
  if (connectionState === 'connecting') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
        <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
        <span className="text-sm text-yellow-400">Connecting...</span>
      </div>
    );
  }

  // Not connected
  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
        <WifiOff className="w-4 h-4 text-red-400" />
        <span className="text-sm text-red-400">Connection Lost</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
      {/* Quality Indicator */}
      <div className="flex items-center gap-2">
        <Wifi className={`w-4 h-4 ${getQualityColor()}`} />
        <span className={`text-sm font-medium ${getQualityColor()}`}>
          {getQualityLabel()}
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        {/* Latency */}
        <div className="flex items-center gap-1">
          <Activity className="w-3 h-3" />
          <span className="font-mono">
            {stats.latency}ms
          </span>
        </div>

        {/* Jitter */}
        <div className="flex items-center gap-1">
          <span className="opacity-70">Jitter:</span>
          <span className="font-mono">
            {stats.jitter.toFixed(1)}ms
          </span>
        </div>

        {/* Packet Loss */}
        {stats.packetLoss > 0 && (
          <div className="flex items-center gap-1 text-orange-400">
            <span className="opacity-70">Loss:</span>
            <span className="font-mono">
              {stats.packetLoss}
            </span>
          </div>
        )}

        {/* Bitrate */}
        <div className="flex items-center gap-1">
          <span className="opacity-70">Rate:</span>
          <span className="font-mono">
            {stats.bitrate}kbps
          </span>
        </div>
      </div>
    </div>
  );
};
