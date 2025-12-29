import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { Headphones, AlertCircle, Sparkles, Users, Lock, Zap, Github } from "lucide-react";

export function Lobby() {
  const [displayName, setDisplayName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const handleCreateRoom = async () => {
    if (!displayName.trim()) return;
    setIsJoining(true);
    setError(null);
    try {
      await signIn(displayName);
      const newRoomId = uuidv4();
      navigate(`/room/${newRoomId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create room. Please check your internet connection and Firebase configuration.";
      setError(errorMessage);
      setIsJoining(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!displayName.trim() || !roomId.trim()) return;
    setIsJoining(true);
    setError(null);
    try {
      await signIn(displayName);
      navigate(`/room/${roomId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to join room. Please check your internet connection and Firebase configuration.";
      setError(errorMessage);
      setIsJoining(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-8 animate-in fade-in duration-500 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10" />
      <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      
      <div className="flex flex-col items-center space-y-6 text-center relative z-10">
        <div className="relative">
          <div className="p-5 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-2xl shadow-purple-500/30">
            <Headphones className="h-14 w-14 text-white" />
          </div>
          <div className="absolute -top-2 -right-2 h-5 w-5 bg-green-500 rounded-full border-4 border-background animate-pulse" />
        </div>
        <div>
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Kiskord
          </h1>
          <p className="text-muted-foreground max-w-md mt-3 flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            P2P Voice Chat · No Sign-up · Crystal Clear Audio
          </p>
        </div>
        
        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/50 rounded-full text-xs text-muted-foreground border border-border/50">
            <Lock className="h-3 w-3 text-green-400" /> Private P2P
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/50 rounded-full text-xs text-muted-foreground border border-border/50">
            <Zap className="h-3 w-3 text-yellow-400" /> Low Latency
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/50 rounded-full text-xs text-muted-foreground border border-border/50">
            <Users className="h-3 w-3 text-blue-400" /> Multi-Party
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-4 bg-secondary/40 p-8 rounded-2xl border border-border/50 backdrop-blur-xl shadow-2xl relative z-10">
        {error && (
          <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Display Name
          </label>
          <Input
            placeholder="Enter your nickname"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={isJoining}
          />
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-muted" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Start
            </span>
          </div>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={handleCreateRoom}
          disabled={!displayName.trim() || isJoining}
        >
          {isJoining ? "Connecting..." : "Create New Room"}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-muted" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-secondary/40 px-2 text-muted-foreground">
              Or Join Existing
            </span>
          </div>
        </div>

        <div className="flex space-x-2">
          <Input
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            disabled={isJoining}
            className="font-mono"
          />
          <Button
            variant="secondary"
            onClick={handleJoinRoom}
            disabled={!displayName.trim() || !roomId.trim() || isJoining}
          >
            {isJoining ? "..." : "Join"}
          </Button>
        </div>
      </div>
      
      {/* Footer */}
      <div className="relative z-10 flex flex-col items-center gap-3 text-center">
        <a
          href="https://github.com/Lafun-code/kiskord"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all hover:scale-105"
        >
          <Github className="h-4 w-4" />
          Open Source on GitHub
        </a>
        <p className="text-xs text-muted-foreground/60">
          Made with 💜 · No data stored · End-to-end private
        </p>
      </div>
    </div>
  );
}
