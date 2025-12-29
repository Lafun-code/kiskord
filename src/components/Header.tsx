import { Headphones, Github, Sparkles } from "lucide-react";

export function Header() {
  return (
    <header className="w-full py-3 px-6 border-b border-border/50 bg-gradient-to-r from-background via-background to-background/95 backdrop-blur-xl fixed top-0 left-0 z-50 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Headphones className="h-5 w-5 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Kiskord
          </h1>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> P2P Voice Chat
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <a
          href="https://github.com/Lafun-code/kiskord"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all hover:scale-105"
        >
          <Github className="h-4 w-4" />
          <span className="hidden sm:inline">GitHub</span>
        </a>
      </div>
    </header>
  );
}
