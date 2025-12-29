import { Mic, MicOff, User } from "lucide-react";
import { cn } from "../lib/utils";
import { memo } from "react";

interface ParticipantCardProps {
  name: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isLocal?: boolean;
}

export const ParticipantCard = memo(function ParticipantCard({
  name,
  isMuted,
  isSpeaking,
  isLocal,
}: ParticipantCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center p-4 rounded-xl bg-secondary/50 border-2 transition-all duration-200",
        isSpeaking ? "border-primary shadow-[0_0_15px_rgba(37,99,235,0.3)]" : "border-transparent",
        "aspect-square min-w-[120px]"
      )}
    >
      <div className="relative">
        <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-3 text-secondary-foreground overflow-hidden">
          <User className="h-8 w-8" />
        </div>
        {isMuted && (
          <div className="absolute -bottom-1 -right-1 bg-destructive rounded-full p-1 border-2 border-background">
            <MicOff className="h-3 w-3 text-white" />
          </div>
        )}
        {!isMuted && isSpeaking && (
          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-background animate-pulse">
             <Mic className="h-3 w-3 text-white" />
          </div>
        )}
         {!isMuted && !isSpeaking && (
          <div className="absolute -bottom-1 -right-1 bg-secondary-foreground rounded-full p-1 border-2 border-background">
             <Mic className="h-3 w-3 text-secondary" />
          </div>
        )}
      </div>

      <span className="font-semibold text-sm truncate max-w-full">
        {name} {isLocal && "(You)"}
      </span>
    </div>
  );
});
