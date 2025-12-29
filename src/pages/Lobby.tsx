import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { Mic, AlertCircle } from "lucide-react";

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
    <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="p-4 bg-primary/10 rounded-full ring-4 ring-primary/20">
          <Mic className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Kiskord Voice</h1>
        <p className="text-muted-foreground max-w-md">
          Simple, low-latency P2P voice chat. No sign-up required.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-4 bg-secondary/30 p-8 rounded-2xl border border-border backdrop-blur-sm">
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
            <span className="bg-background px-2 text-muted-foreground">
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
    </div>
  );
}
