"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

export default function Chat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);


  useEffect(() => {
    // Auto scroll to bottom when messages change
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    } else if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (loading) return;
    if (!input.trim()) return;

    const userMessage: { role: "user" | "assistant"; content: string } = {
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let assistantText = "";

      // Append a placeholder assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      // Read the stream
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: assistantText,
            };
          }
          return updated;
        });
      }

      // Flush any remaining decoder buffer
      assistantText += new TextDecoder().decode();
      setMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: assistantText,
          };
        }
        return updated;
      });
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-neutral-900 text-neutral-100 scr">
      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-4 scr"
      >
        {messages.length === 0 && (
          <div className="text-sm text-neutral-400">Start the conversation…</div>
        )}
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm md:text-base shadow-sm border ${
                  isUser
                    ? "bg-blue-600 text-white border-blue-500"
                    : "bg-neutral-800 text-neutral-100 border-neutral-700"
                }`}
              >
                <ReactMarkdown>
                  {m.content}
                </ReactMarkdown>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-neutral-800 p-3 md:p-4">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Type a message (Shift+Enter for newline)"
            className="flex-1 resize-none rounded-xl bg-neutral-800 text-neutral-100 placeholder:text-neutral-400 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600/50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              loading || !input.trim()
                ? "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            {loading ? "Sending…" : "Send"}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-neutral-500">
          Press Enter to send, Shift+Enter for a new line
        </p>
      </div>
    </div>
  );
}
