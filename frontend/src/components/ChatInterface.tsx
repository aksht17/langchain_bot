"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  Command,
  FileText,
  History,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { CandidateCard, CandidateCardData } from "./CandidateCard";

interface SearchResult {
  id: string;
  query: string;
  response: string;
  candidateCards: CandidateCardData[];
  rewrites: number;
  timestamp: string;
}

interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  candidateCount?: number;
  status: "complete" | "searching" | "error";
}

interface ChatInterfaceProps {
  backendUrl: string;
}

const SAMPLE_PROMPTS = [
  {
    label: "Machine learning",
    query: "Find strong candidates with Machine Learning and Mathematics experience",
    note: "Models, research & quantitative thinking",
  },
  {
    label: "Backend systems",
    query: "Find backend engineers with Kubernetes or Spring Boot experience",
    note: "APIs, infrastructure & distributed systems",
  },
  {
    label: "Statistical depth",
    query: "Find candidates experienced in Bayesian statistics or MCMC",
    note: "Research-minded analytical profiles",
  },
  {
    label: "High-impact builders",
    query: "Compare the strongest 3 applicants by project impact",
    note: "Outcome-driven project work",
  },
];

const SEARCH_STEPS = [
  "Understanding the brief",
  "Exploring profiles",
  "Evaluating evidence",
  "Building your shortlist",
];

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function CandidateDrawer({
  candidate,
  rank,
  onClose,
}: {
  candidate: CandidateCardData;
  rank: number;
  onClose: () => void;
}) {
  const score = Math.max(0, Math.min(100, Math.round(candidate.relevance_score ?? 75)));
  const initials = (candidate.name || "Candidate")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="candidate-drawer-backdrop fixed inset-0 z-50 flex justify-end bg-[#181613]/30 p-2 sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        aria-labelledby="candidate-drawer-title"
        aria-modal="true"
        className="candidate-drawer flex h-full w-full max-w-xl flex-col overflow-hidden rounded-[1.6rem] border border-white/75 bg-[#fbfaf7] shadow-[-24px_0_80px_rgba(47,40,31,0.2)]"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-[#e8e3da] px-5 py-4 sm:px-7">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#776f66]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ece8ff] text-[10px] text-[#404cc8]">{rank}</span>
            Candidate profile
          </div>
          <button
            aria-label="Close candidate profile"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7 sm:py-8">
          <div className="flex items-start gap-4">
            <div className="candidate-avatar candidate-avatar-lg" aria-hidden="true">
              {initials || "C"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="eyebrow-label">Resume match</span>
                <span className="score-chip">{score}% confidence</span>
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl leading-[1.03] tracking-[-0.04em] text-[#1b1916]" id="candidate-drawer-title">
                {candidate.name || "Candidate"}
              </h2>
              <p className="mt-2 font-mono text-xs text-[#777066]">{candidate.candidate_id || "Profile ID unavailable"}</p>
            </div>
          </div>

          <section className="drawer-section mt-8">
            <p className="eyebrow-label">Why they surfaced</p>
            <p className="mt-3 text-[15px] leading-7 text-[#514c45]">
              {candidate.summary || "This profile was surfaced for its relevance to your search brief."}
            </p>
          </section>

          {candidate.matched_skills && candidate.matched_skills.length > 0 && (
            <section className="drawer-section">
              <p className="eyebrow-label">Evidence in this profile</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {candidate.matched_skills.map((skill, index) => (
                  <span className="skill-chip" key={`${skill}-${index}`}>
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="drawer-section">
            <p className="eyebrow-label">Contact & record</p>
            <dl className="mt-3 divide-y divide-[#e9e4dc] rounded-2xl border border-[#e9e4dc] bg-white/60 px-4">
              <div className="flex items-center justify-between gap-5 py-3.5 text-sm">
                <dt className="text-[#81786e]">Email</dt>
                <dd className="max-w-[65%] truncate text-right font-medium text-[#302d28]">
                  {candidate.email || "Not included"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-5 py-3.5 text-sm">
                <dt className="text-[#81786e]">Roll number</dt>
                <dd className="font-medium text-[#302d28]">{candidate.roll_no || "Not included"}</dd>
              </div>
              <div className="flex items-center justify-between gap-5 py-3.5 text-sm">
                <dt className="text-[#81786e]">Profile ID</dt>
                <dd className="font-mono text-xs font-medium text-[#302d28]">{candidate.candidate_id || "—"}</dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="border-t border-[#e8e3da] bg-[#fbfaf7]/95 px-5 py-4 backdrop-blur sm:px-7">
          {candidate.resume_url?.trim() ? (
            <a
              className="primary-button flex w-full items-center justify-center gap-2"
              href={candidate.resume_url}
              rel="noopener noreferrer"
              target="_blank"
            >
              <FileText className="h-4 w-4" />
              Open full resume
              <ArrowUpRight className="h-4 w-4" />
            </a>
          ) : (
            <span className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e8e1d9] px-4 py-3 text-xs font-bold text-[#8f8172]">
              <FileText className="h-4 w-4" />
              Resume unavailable
            </span>
          )}
        </div>
      </aside>
    </div>
  );
}

function SearchProgress({ activeStep }: { activeStep: number }) {
  return (
    <div className="result-stage result-stage-loading" aria-live="polite">
      <div className="mx-auto max-w-lg text-center">
        <div className="search-orbit mx-auto mb-7 flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-[#ecebff] text-[#414cc7]">
          <Search className="h-5 w-5" />
        </div>
        <p className="eyebrow-label">Resume intelligence at work</p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-[-0.04em] text-[#211f1b] sm:text-4xl">
          Curating the right evidence.
        </h2>
        <div className="mt-8 grid gap-2 text-left">
          {SEARCH_STEPS.map((step, index) => {
            const isDone = index < activeStep;
            const isCurrent = index === activeStep;

            return (
              <div className="search-step" data-active={isCurrent || undefined} key={step}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#ded8cf] bg-[#fbfaf7] text-[#80776d]">
                  {isDone ? <Check className="h-3.5 w-3.5 text-[#18765d]" /> : isCurrent ? <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[#424cc8]" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                </span>
                <span>{step}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="skeleton-pin-grid mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div className="skeleton-pin" key={item} />
        ))}
      </div>
    </div>
  );
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ backendUrl }) => {
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [activeResult, setActiveResult] = useState<SearchResult | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<{ candidate: CandidateCardData; rank: number } | null>(null);
  const [sessionId] = useState(() => `session_${Math.random().toString(36).slice(2, 9)}`);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const searchSequence = useRef(0);

  const hasResults = Boolean(activeResult);
  const recentSearches = useMemo(() => history.slice(0, 5), [history]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedCandidate(null);
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const handleSendMessage = async (queryToSend?: string) => {
    const query = (queryToSend || inputQuery).trim();
    if (!query || isLoading) return;

    searchSequence.current += 1;
    const searchId = `search-${searchSequence.current}`;
    const now = new Date().toISOString();
    const historyItem: SearchHistoryItem = {
      id: searchId,
      query,
      timestamp: now,
      status: "searching",
    };

    setHistory((previous) => [historyItem, ...previous]);
    setInputQuery("");
    setError(null);
    setIsLoading(true);
    setActiveStep(0);

    const progressTimers = [
      window.setTimeout(() => setActiveStep(1), 800),
      window.setTimeout(() => setActiveStep(2), 1900),
      window.setTimeout(() => setActiveStep(3), 3300),
    ];

    try {
      const response = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, session_id: sessionId }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const candidateCards = Array.isArray(data.candidate_cards) ? data.candidate_cards : [];
      const result: SearchResult = {
        id: searchId,
        query,
        response: data.response || "No search summary was generated.",
        candidateCards,
        rewrites: Number(data.rewrites) || 0,
        timestamp: now,
      };

      setActiveResult(result);
      setHistory((previous) =>
        previous.map((item) =>
          item.id === searchId
            ? { ...item, candidateCount: candidateCards.length, status: "complete" }
            : item,
        ),
      );
    } catch {
      setError("We could not reach the resume search service. It may still be waking up—please try again in a moment.");
      setHistory((previous) =>
        previous.map((item) => (item.id === searchId ? { ...item, status: "error" } : item)),
      );
    } finally {
      progressTimers.forEach((timer) => window.clearTimeout(timer));
      setIsLoading(false);
      setActiveStep(0);
    }
  };

  const openSearch = (query: string) => {
    void handleSendMessage(query);
  };

  const clearWorkspace = () => {
    setActiveResult(null);
    setError(null);
    setInputQuery("");
    window.setTimeout(() => composerRef.current?.focus(), 0);
  };

  return (
    <section className="atlas-workspace w-full" aria-label="Talent search workspace">
      <aside className="history-rail hidden xl:flex" aria-label="This session">
        <div className="history-rail-intro">
          <div className="rail-icon"><History className="h-4 w-4" /></div>
          <div>
            <p className="eyebrow-label">This session</p>
            <p className="mt-1 text-sm leading-5 text-[#5e574e]">Your recent search thinking, all in one place.</p>
          </div>
        </div>

        <div className="mt-7 space-y-1.5">
          {recentSearches.length > 0 ? (
            recentSearches.map((item) => (
              <button
                className="history-item"
                data-current={activeResult?.id === item.id || undefined}
                disabled={isLoading || item.status === "searching"}
                key={item.id}
                onClick={() => openSearch(item.query)}
                type="button"
              >
                <span className="history-item-icon">
                  {item.status === "searching" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-xs font-medium text-[#37332d]">{item.query}</span>
                  <span className="mt-1 block text-[10px] text-[#8b8378]">
                    {item.status === "complete" ? `${item.candidateCount ?? 0} surfaced` : item.status === "error" ? "Retry available" : "Searching…"}
                  </span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-[#a0988c]" />
              </button>
            ))
          ) : (
            <div className="empty-history">
              <Clock3 className="h-4 w-4" />
              <p>Your searches will appear here for this session.</p>
            </div>
          )}
        </div>

        <div className="mt-auto rounded-2xl border border-[#e9e3d9] bg-[#fffdfa]/70 p-4">
          <div className="flex items-center gap-2 text-[#444ec2]"><Sparkles className="h-3.5 w-3.5" /><span className="text-[11px] font-semibold">A considered shortlist</span></div>
          <p className="mt-2 text-[11px] leading-5 text-[#746d63]">Search naturally. We’ll surface the strongest evidence from indexed resumes.</p>
        </div>
      </aside>

      <main className="atlas-main min-w-0">
        <div className={`search-composer-wrap ${hasResults ? "search-composer-compact" : "search-composer-hero"}`}>
          {!hasResults && !isLoading && (
            <div className="hero-copy">
              <p className="eyebrow-label text-[#464fc6]">AI candidate discovery</p>
              <h1>Find the people behind the right ideas.</h1>
              <p>Search the nuance—not just the keywords. Tell TalentLens about the team, the challenge, or the evidence that matters.</p>
            </div>
          )}

          {hasResults && !isLoading && activeResult && (
            <div className="active-query-bar">
              <div className="min-w-0">
                <p className="eyebrow-label">Current search</p>
                <p className="mt-1 truncate font-[family-name:var(--font-display)] text-xl tracking-[-0.03em] text-[#27231f]">{activeResult.query}</p>
              </div>
              <button className="text-button shrink-0" onClick={clearWorkspace} type="button">Start fresh</button>
            </div>
          )}

          <form
            className="search-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSendMessage();
            }}
          >
            <Search className="composer-search h-5 w-5" />
            <textarea
              aria-label="Describe the candidate you need"
              disabled={isLoading}
              onChange={(event) => setInputQuery(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  void handleSendMessage();
                }
              }}
              placeholder="Describe the candidate, skills, experience, or project impact you’re looking for…"
              ref={composerRef}
              rows={hasResults ? 1 : 2}
              value={inputQuery}
            />
            <button
              aria-label="Search resumes"
              className="composer-submit"
              disabled={isLoading || !inputQuery.trim()}
              type="submit"
            >
              {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </button>
            <div className="composer-footnote"><Command className="h-3 w-3" /> <span>Ctrl / ⌘ Enter to search</span></div>
          </form>

          {!hasResults && !isLoading && (
            <div className="prompt-collection" aria-label="Suggested searches">
              <p className="eyebrow-label">Start with an angle</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SAMPLE_PROMPTS.map((prompt, index) => (
                  <button
                    className="prompt-card"
                    disabled={isLoading}
                    key={prompt.label}
                    onClick={() => openSearch(prompt.query)}
                    type="button"
                  >
                    <span className="prompt-index">0{index + 1}</span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block text-sm font-semibold text-[#2f2b26]">{prompt.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-[#7c746a]">{prompt.note}</span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-[#727bdb]" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {isLoading && <SearchProgress activeStep={activeStep} />}

        {!isLoading && error && (
          <div className="result-stage error-state" role="alert">
            <div className="error-icon"><RefreshCw className="h-5 w-5" /></div>
            <div>
              <p className="eyebrow-label">Search paused</p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-[-0.04em] text-[#2a251f]">The index is taking a breath.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#665e54]">{error}</p>
              <button className="secondary-button mt-5" onClick={() => openSearch(history[0]?.query || inputQuery)} type="button">
                <RefreshCw className="h-3.5 w-3.5" /> Try that search again
              </button>
            </div>
          </div>
        )}

        {!isLoading && !error && activeResult && (
          <div className="results-layout">
            <section className="results-board" aria-label="Candidate matches">
              <div className="results-heading">
                <div>
                  <p className="eyebrow-label">Curated profiles</p>
                  <h2>{activeResult.candidateCards.length} {activeResult.candidateCards.length === 1 ? "candidate" : "candidates"} surfaced</h2>
                </div>
                <div className="result-meta">
                  {activeResult.rewrites > 0 && (
                    <span className="refinement-chip"><Sparkles className="h-3 w-3" /> Broadened ×{activeResult.rewrites}</span>
                  )}
                  <span className="result-time"><Clock3 className="h-3.5 w-3.5" /> {formatTime(activeResult.timestamp)}</span>
                </div>
              </div>

              {activeResult.candidateCards.length > 0 ? (
                <div className="candidate-pin-grid">
                  {activeResult.candidateCards.map((candidate, index) => (
                    <CandidateCard
                      candidate={candidate}
                      key={`${candidate.candidate_id}-${index}`}
                      onSelect={(profile) => setSelectedCandidate({ candidate: profile, rank: index + 1 })}
                      rank={index + 1}
                    />
                  ))}
                </div>
              ) : (
                <div className="no-matches">
                  <div className="no-matches-mark"><UserRound className="h-5 w-5" /></div>
                  <h3>No profiles surfaced for this brief.</h3>
                  <p>Try a broader skill cluster, a related role, or describe the problem the person should be able to solve.</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {SAMPLE_PROMPTS.slice(0, 3).map((prompt) => (
                      <button className="suggestion-chip" key={prompt.label} onClick={() => openSearch(prompt.query)} type="button">{prompt.label}</button>
                    ))}
                  </div>
                </div>
              )}

              <p className="ranking-note"><Sparkles className="h-3.5 w-3.5" /> Match confidence is a relevance cue from indexed resumes—not a hiring decision.</p>
            </section>

            <aside className="brief-panel" aria-label="AI hiring brief">
              <div className="brief-panel-heading">
                <div className="brief-icon"><MessageSquareText className="h-4 w-4" /></div>
                <div>
                  <p className="eyebrow-label">AI hiring brief</p>
                  <p className="mt-1 text-xs text-[#786f65]">What the search found</p>
                </div>
              </div>
              <div className="prose-custom brief-prose">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeResult.response}</ReactMarkdown>
              </div>
              <div className="brief-footer">
                <span>Searching your indexed resumes</span>
                <FileText className="h-3.5 w-3.5" />
              </div>
            </aside>
          </div>
        )}
      </main>

      <aside className="insight-rail hidden 2xl:flex" aria-label="Search guide">
        <div className="insight-rail-card">
          <p className="eyebrow-label">A sharper search</p>
          <h2>Ask for the proof, not only the title.</h2>
          <p>Try describing outcomes, tools, academic depth, or the kind of problem the candidate should have solved.</p>
          <div className="insight-prompt-list">
            <span>“people who have shipped…”</span>
            <span>“strong evidence of…”</span>
            <span>“compare the top candidates by…”</span>
          </div>
        </div>
        <div className="insight-status">
          <span className="status-dot" />
          <span>Searches read from the live resume index</span>
        </div>
      </aside>

      {selectedCandidate && (
        <CandidateDrawer
          candidate={selectedCandidate.candidate}
          onClose={() => setSelectedCandidate(null)}
          rank={selectedCandidate.rank}
        />
      )}
    </section>
  );
};
