"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Bot, User, Sparkles, RefreshCw, Cpu, Database, Award, ArrowRight } from "lucide-react";
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
  "🚀 Find top candidates with Machine Learning and rigorous Mathematics",
  "💻 Backend engineers experienced in Kotlin, Spring Boot, or Go",
  "📊 Candidates with Bayesian statistics, Poisson regression, or MCMC",
  "🎯 Compare top 3 candidates by project achievements and coursework",
];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ backendUrl }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-msg",
      sender: "assistant",
      text: `### 👋 Welcome to Antigravity Agentic Resume Copilot!

I am an autonomous recruitment assistant powered by a **5-Node LangGraph self-correcting agent**, **Google Gemini embeddings**, **Pinecone vector retrieval**, and **LangSmith real-time observability**.

Ask me any natural language recruiter query to discover, rank, and compare candidate profiles across 2,000+ placement records.`,
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
    setActiveStep("Extracting entities & routing (Groq)...");

    // Dynamic step animation for recruiter feedback
    const stepTimer1 = setTimeout(() => {
      setActiveStep("Querying Pinecone Vector Index (Gemini embeddings)...");
    }, 1200);

    const stepTimer2 = setTimeout(() => {
      setActiveStep("Grading document relevance & checking match quality...");
    }, 2800);

    const stepTimer3 = setTimeout(() => {
      setActiveStep("Synthesizing candidate ratings & comparative matrix...");
    }, 4500);

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
        text: `⚠️ **Error communicating with agent backend**: ${err.message}. If the backend is running on Render, please allow up to 40 seconds for the free instance to spin up.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setActiveStep("");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-125px)] max-w-7xl mx-auto w-full px-4 py-4">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {/* Bot Avatar */}
            {msg.sender === "assistant" && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shrink-0 shadow-md">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}

            <div
              className={`max-w-3xl rounded-2xl p-4.5 text-sm ${
                msg.sender === "user"
                  ? "bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-600/20"
                  : "glass-panel rounded-tl-none text-gray-200 border border-white/10"
              }`}
            >
              {/* Message Header info for Bot */}
              {msg.sender === "assistant" && msg.rewrites !== undefined && msg.rewrites > 0 && (
                <div className="mb-2 text-xs text-purple-400 bg-purple-950/40 px-2 py-1 rounded inline-flex items-center gap-1.5 border border-purple-500/20">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Self-Correcting Loop: Query rewritten {msg.rewrites} time(s) for higher recall</span>
                </div>
              )}

              {/* Markdown Body */}
              <div className="prose-custom">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.text}
                </ReactMarkdown>
              </div>

              {/* Candidate Cards Grid if present */}
              {msg.candidateCards && msg.candidateCards.length > 0 && (
                <div className="mt-5 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-4 h-4 text-indigo-400" />
                    <h5 className="font-semibold text-xs text-indigo-300 uppercase tracking-wider">
                      Matched Candidate Cards ({msg.candidateCards.length})
                    </h5>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {msg.candidateCards.map((candidate, idx) => (
                      <CandidateCard key={idx} candidate={candidate} />
                    ))}
                  </div>
                </div>
              )}

              <div className={`mt-2 text-[10px] ${msg.sender === "user" ? "text-indigo-200" : "text-gray-500"} text-right`}>
                {msg.timestamp}
              </div>
            </div>

            {/* User Avatar */}
            {msg.sender === "user" && (
              <div className="w-8 h-8 rounded-xl bg-gray-700 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-gray-300" />
              </div>
            )}
          </div>
        ))}

        {/* Loading / Agent Node Indicator */}
        {isLoading && (
          <div className="flex gap-3.5 items-start">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shrink-0 animate-pulse">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="glass-panel rounded-2xl rounded-tl-none p-4 text-xs text-indigo-300 flex items-center gap-3 border border-indigo-500/30">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              <div>
                <p className="font-semibold text-gray-200">LangGraph Agent Reasoning...</p>
                <p className="text-indigo-300/80 mt-0.5">{activeStep || "Processing..."}</p>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Filters */}
      <div className="pt-3 pb-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-xs text-gray-400 font-medium whitespace-nowrap flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-400" /> Quick Queries:
        </span>
        {SAMPLE_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            disabled={isLoading}
            className="text-xs whitespace-nowrap px-3 py-1.5 rounded-full glass-card hover:border-indigo-400 text-gray-300 hover:text-white transition cursor-pointer disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Bar */}
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
          placeholder="E.g., Find backend engineers with Go and Kubernetes, or compare top ML candidates..."
          disabled={isLoading}
          className="flex-1 bg-slate-900/90 border border-white/15 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl px-4 py-3.5 text-sm text-gray-100 placeholder-gray-500 outline-none transition backdrop-blur-md shadow-inner"
        />
        <button
          type="submit"
          disabled={isLoading || !inputQuery.trim()}
          className="px-5 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-medium text-sm transition flex items-center gap-1.5 shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <span>Send</span>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
