import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface MessageInputProps {
  onSend: (body: string) => void;
  isSending: boolean;
  disabled?: boolean;
}

export function MessageInput({ onSend, isSending, disabled }: MessageInputProps) {
  const [body, setBody] = useState("");

  const handleSubmit = () => {
    const trimmed = body.trim();
    if (!trimmed || isSending) return;
    onSend(trimmed);
    setBody("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t p-3 flex gap-2 items-end">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        className="min-h-[40px] max-h-[120px] resize-none"
        rows={1}
        disabled={disabled || isSending}
      />
      <Button
        size="icon"
        onClick={handleSubmit}
        disabled={!body.trim() || isSending || disabled}
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
