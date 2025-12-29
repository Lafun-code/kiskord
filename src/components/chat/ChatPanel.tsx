import React, { useEffect, useRef, useState } from "react";
import { useChat } from "../../hooks/useChat";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Send, MessageSquare } from "lucide-react";
import { cn } from "../../lib/utils";

interface ChatPanelProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatPanel({ roomId, isOpen, onClose }: ChatPanelProps) {
  const { messages, sendMessage, typingUsers, setTyping } = useChat(roomId);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    await sendMessage(inputValue);
    setInputValue("");
    setTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setTyping(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-background/95 backdrop-blur border-l border-border flex flex-col shadow-xl z-50 animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h2 className="font-semibold">Chat</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ✕
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm mt-10">
            No messages yet. Say hello!
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex flex-col max-w-[85%]",
              msg.isOwn ? "ml-auto items-end" : "mr-auto items-start"
            )}
          >
            <div className="flex items-baseline gap-2 mb-1">
              {!msg.isOwn && (
                <span className="text-xs font-medium text-muted-foreground">
                  {msg.senderName}
                </span>
              )}
            </div>
            <div
              className={cn(
                "px-3 py-2 rounded-lg text-sm break-words",
                msg.isOwn
                  ? "bg-primary text-primary-foreground rounded-br-none"
                  : "bg-secondary text-secondary-foreground rounded-bl-none"
              )}
            >
              {msg.content}
            </div>
            <span className="text-[10px] text-muted-foreground mt-1">
              {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {typingUsers.size > 0 && (
        <div className="px-4 py-1 text-xs text-muted-foreground italic">
          {Array.from(typingUsers).join(", ")} is typing...
        </div>
      )}

      <div className="p-4 border-t border-border flex gap-2">
        <Input
          placeholder="Type a message..."
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button size="icon" onClick={handleSend} disabled={!inputValue.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
