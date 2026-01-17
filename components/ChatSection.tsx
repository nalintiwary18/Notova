"use client";
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {SendHorizontal,Square,Paperclip} from "lucide-react"

const send= <SendHorizontal className="text-xl " color={"white"} fill={"white"}/>
const loadingChat =<Square className="text-xl " color={"white"} fill={"white"}/>

interface Block {
  id: string;
  type: 'paragraph';
  content: string;
}

interface ChatSectionProps {
  setDocumentBlocks: React.Dispatch<React.SetStateAction<Block[]>>;
}

export default function Chat({ setDocumentBlocks }: ChatSectionProps) {
  const [file, setFile] = useState<File | null>(null);
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
    const systemInstruction = {
      role: "system",
      content: "Explain concepts step by step like a teacher.  Rules:\n" +
          "- Use paragraphs for normal explanatory text.\n" +
          "- Use h1 only for main titles or primary sections.\n" +
          "- Use h2 for subsections.\n" +
          "- Use h3 for minor sections or breakdowns.\n" +
          "- Use strong only for key terms or short emphasis (never entire sentences).\n" +
          "- Use emphasis sparingly for tone or nuance.\n" +
          "- Use unordered or ordered lists for grouped or sequential information.\n" +
          "- Use blockquotes only for callouts, notes, or important observations.\n" +
          "- Use inline code for short technical references, variables, or commands.\n" +
          "- Use code blocks only for executable or structured code.\n" +
          "- Use links only when they add clear value.\n" +
          "\n" +
          "Constraints:\n" +
          "- Do not invent new formatting types.\n" +
          "- Do not nest headings incorrectly.\n" +
          "- Do not overuse emphasis or strong text.\n" +
          "- Keep paragraphs concise and readable.\n" +
          "- Prefer clarity and hierarchy over decoration.\n"+
          "CRITICAL FORMATTING RULE:\n"+
          "- Tables are forbidden.\n"+
          "- Never use markdown tables or any tabular layout.\n"+
          "- If information would normally be presented as a table, rewrite it using headings, lists, or paragraphs instead."


  };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      let res: Response;

      if (file) {
        // Send with file using FormData
        const formData = new FormData();
        formData.append("file", file);
        formData.append("messages", JSON.stringify([...messages, userMessage]));

        res = await fetch("/api/chat", {
          method: "POST",
          body: formData,
        });

        // Clear file after sending
        setFile(null);
      } else {
        // Send without file using JSON
        res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [systemInstruction,...messages, userMessage] }),
        });
      }

      if (!res.ok || !res.body) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let assistantText = "";

// Read the stream (but don't show in chat)
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
      }

// Flush any remaining decoder buffer
      assistantText += new TextDecoder().decode();

// Add assistant response ONLY to document (not chat)
      const paragraphs = assistantText.split('\n\n').filter((p: string) => p.trim());
      const newBlocks = paragraphs.map((p: string, i: number) => ({
        id: `block-${Date.now()}-${i}`,
        type: 'paragraph' as const,
        content: p.trim()
      }));

      setDocumentBlocks(prev => [...prev, ...newBlocks]);

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
      <div className="flex-1 flex flex-col h-screen bg-neutral-900 text-neutral-100 scrollbar-hide border-r-2 rounded-2xl">
        {/* Messages */}
        <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-4 scr ml-30 mr-30"
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
                              ? "bg-neutral-800 text-white border-neutral-700"
                              : "bg-transparent text-neutral-100 border-0"
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

        <div className="bg-neutral-800 rounded-xl p-3 m-4 mb-8 md:p-4 flex flex-col">
        <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask Notovo"
            className="w-full resize-none bg-transparent text-neutral-100 placeholder:text-neutral-400 focus:outline-none mb-3"
        />

          <div className="flex items-center justify-between">
            {/* Paperclip Button */}
            <div className="flex items-center">
              <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
              />

              <label
                  htmlFor="file-upload"
                  className="cursor-pointer text-neutral-400 hover:text-neutral-200 transition-colors p-1"
              >
                <Paperclip />
              </label>

              {/* Show file name if selected */}
              {file && (
                  <span className="ml-2 text-sm text-blue-500">
                  {file.name}
                </span>
              )}
            </div>

            {/* Send Button */}
            <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className={`px-4 py-2 text-sm font-medium transition-colors rounded-full ${
                    loading
                        ? " bg-blue-600 text-white rounded-4xl opacity-20"
                        : " text-neutral-400 cursor-not-allowed rounded-4xl"
                }`}
            >
              {loading?loadingChat:send}
            </button>
          </div>
        </div>
      </div>
  );
}