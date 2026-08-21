"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Bot, User, Sparkles, RefreshCw, Award } from "lucide-react";
import { CandidateCard, CandidateCardData } from "./CandidateCard";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  candidateCards?: CandidateCardData[];
  rewrites?: number;
  timestamp: string;
}

interface ChatInterfaceProps {
  backendUrl: string;
}

const SAMPLE_PROMPTS = [
  "Find top candidates with Machine Learning and Mathematics",
  "Backend engineers with Kubernetes or Spring Boot",
  "Candidates with Bayesian statistics or MCMC",
  "Compare the strongest 3 applicants by project impact",
];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ backendUrl }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-msg",
      sender: "assistant",
      text: `### Welcome to Antigravity Resume Copilot

I help you search, rank, and compare candidate resumes using a simple recruiter workflow. Ask for skills, roles, experience, or project strength and I’ll surface the best matches.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<string>("");
  const [sessionId] = useState(() => `session_${Math.random().toString(36).substring(2, 9)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, activeStep]);

  const handleSendMessage = async (queryToSend?: string) => {
    const text = queryToSend || inputQuery;
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery("");
    setIsLoading(true);
    setActiveStep("Extracting requirements...");

    const stepTimer1 = setTimeout(() => setActiveStep("Searching candidate profiles..."), 1200);
    const stepTimer2 = setTimeout(() => setActiveStep("Checking relevance and fit..."), 2800);
    const stepTimer3 = setTimeout(() => setActiveStep("Preparing recommendation summary..."), 4500);

    try {
      const response = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text.trim(), session_id: sessionId }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        sender: "assistant",
        text: data.response || "No response generated.",
        candidateCards: data.candidate_cards || [],
        rewrites: data.rewrites || 0,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        sender: "assistant",
        text: `⚠️ The backend is unavailable right now. Please check the Render service and allow a few seconds for the instance to wake up.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setActiveStep("");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-122px)] max-w-6xl mx-auto w-full px-4 py-4">
      <div className="flex-1 overflow-y-auto pr-2 space-y-5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message-enter flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "assistant" && (
              <div className="w-8 h-8 rounded-2xl bg-slate-900/90 text-white flex items-center justify-center shrink-0 shadow-[0_6px_14px_rgba(15,23,42,0.14)]">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-3xl rounded-2xl p-4 text-sm ${
                msg.sender === "user"
                  ? "bg-blue-500/90 text-white rounded-tr-md shadow-[0_8px_18px_rgba(0,122,255,0.18)]"
                  : "glass-panel text-slate-700 rounded-tl-md"
              }`}
            >
              {msg.sender === "assistant" && msg.rewrites !== undefined && msg.rewrites > 0 && (
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-medium text-slate-600 px-2 py-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Refined search: {msg.rewrites}
                </div>
              )}

              <div className="prose-custom">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
              </div>

              {msg.candidateCards && msg.candidateCards.length > 0 && (
                <div className="mt-5 pt-4 border-t border-white/70">
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-4 h-4 text-blue-600" />
                    <h5 className="font-semibold text-[11px] uppercase tracking-[0.12em] text-slate-600">
                      Matches ({msg.candidateCards.length})
                    </h5>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {msg.candidateCards.map((candidate, idx) => (
                      <CandidateCard key={idx} candidate={candidate} />
                    ))}
                  </div>
                </div>
              )}

              <div className={`mt-2 text-[10px] ${msg.sender === "user" ? "text-blue-100" : "text-slate-400"} text-right`}>
                {msg.timestamp}
              </div>
            </div>

            {msg.sender === "user" && (
              <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-2xl bg-slate-900/90 text-white flex items-center justify-center shrink-0 animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="glass-panel rounded-2xl rounded-tl-md p-4 text-xs text-slate-600">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span className="font-medium text-slate-700">Searching resumes...</span>
              </div>
              <p className="mt-1 text-slate-500">{activeStep || "Processing..."}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="pt-3 pb-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-blue-600" /> Quick queries:
        </span>
        {SAMPLE_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            disabled={isLoading}
            className="text-[11px] whitespace-nowrap px-3 py-1.5 rounded-full border border-white/80 bg-white/45 text-slate-600 hover:border-blue-300 hover:text-blue-700 transition shadow-sm disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="mt-1 flex items-center gap-2 relative"
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Ask about skills, experience, projects, or candidate fit..."
          disabled={isLoading}
          className="flex-1 bg-white/55 backdrop-blur-xl border border-white/85 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-200/60 rounded-2xl px-4 py-3.5 text-sm text-slate-700 placeholder-slate-400 outline-none transition shadow-[0_8px_20px_rgba(15,23,42,0.06),inset_0_1px_rgba(255,255,255,0.85)]"
        />
        <button
          type="submit"
          disabled={isLoading || !inputQuery.trim()}
          className="px-5 py-3.5 bg-slate-900/90 text-white rounded-2xl font-medium text-sm transition shadow-[0_8px_18px_rgba(15,23,42,0.16)] hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
};
