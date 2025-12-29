import { Radio } from "lucide-react";

export function Header() {
  return (
    <header className="w-full py-4 px-6 border-b border-border bg-background/50 backdrop-blur-sm fixed top-0 left-0 z-50 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <Radio className="h-5 w-5 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
          VoiceChat
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <a
          href="https://github.com/trae-ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          GitHub
        </a>
      </div>
    </header>
  );
}
