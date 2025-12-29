import { Mic, MicOff, User, Crown } from "lucide-react";
import { cn } from "../lib/utils";
import { memo, useMemo } from "react";

interface ParticipantCardProps {
  name: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isLocal?: boolean;
}

// Generate consistent color from name
const getAvatarColor = (name: string) => {
  const colors = [
    "from-red-500 to-orange-500",
    "from-orange-500 to-yellow-500",
    "from-yellow-500 to-green-500",
    "from-green-500 to-teal-500",
    "from-teal-500 to-cyan-500",
    "from-cyan-500 to-blue-500",
    "from-blue-500 to-indigo-500",
    "from-indigo-500 to-purple-500",
    "from-purple-500 to-pink-500",
    "from-pink-500 to-red-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const ParticipantCard = memo(function ParticipantCard({
  name,
  isMuted,
  isSpeaking,
  isLocal,
}: ParticipantCardProps) {
  const avatarColor = useMemo(() => getAvatarColor(name), [name]);
  const initials = useMemo(() => name.slice(0, 2).toUpperCase(), [name]);
  
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-secondary/60 to-secondary/30 border transition-all duration-300 hover:scale-105 hover:shadow-xl",
        isSpeaking 
          ? "border-green-500/50 shadow-[0_0_25px_rgba(34,197,94,0.3)] ring-2 ring-green-500/30" 
          : "border-border/30 hover:border-border/50",
        "aspect-square min-w-[120px] backdrop-blur-sm"
      )}
    >
      {/* Speaking Animation Rings */}
      {isSpeaking && !isMuted && (
        <>
          <div className="absolute inset-0 rounded-2xl border-2 border-green-500/20 animate-ping" />
          <div className="absolute inset-2 rounded-xl border border-green-500/10 animate-pulse" />
        </>
      )}
      
      <div className="relative z-10">
        <div className={cn(
          "h-16 w-16 rounded-full bg-gradient-to-br flex items-center justify-center mb-3 text-white font-bold text-lg shadow-lg",
          avatarColor,
          isSpeaking && !isMuted && "ring-4 ring-green-500/50"
        )}>
          {initials}
        </div>
        
        {/* Status Badge */}
        {isMuted ? (
          <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1.5 border-2 border-background shadow-lg">
            <MicOff className="h-3 w-3 text-white" />
          </div>
        ) : isSpeaking ? (
          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1.5 border-2 border-background shadow-lg">
            <Mic className="h-3 w-3 text-white animate-pulse" />
          </div>
        ) : (
          <div className="absolute -bottom-1 -right-1 bg-secondary rounded-full p-1.5 border-2 border-background">
            <Mic className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
        
        {/* Local User Crown */}
        {isLocal && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-500 rounded-full p-1 border-2 border-background">
            <Crown className="h-2.5 w-2.5 text-white" />
          </div>
        )}
      </div>

      <span className={cn(
        "font-semibold text-sm truncate max-w-full text-center",
        isLocal && "text-purple-400"
      )}>
        {name}
      </span>
      {isLocal && (
        <span className="text-[10px] text-muted-foreground">(You)</span>
      )}
    </div>
  );
});
