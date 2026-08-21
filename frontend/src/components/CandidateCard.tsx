"use client";

import React from "react";
import {
  BadgeCheck,
  Bookmark,
  Check,
  ExternalLink,
  FileText,
  Hash,
  Mail,
  Sparkles,
} from "lucide-react";

export interface CandidateCardData {
  candidate_id: string;
  name: string;
  email?: string;
  roll_no?: string;
  resume_url: string;
  relevance_score: number;
  matched_skills?: string[];
  summary?: string;
}

interface CandidateCardProps {
  candidate: CandidateCardData;
  rank?: number;
  onSelect?: (candidate: CandidateCardData) => void;
  isSelected?: boolean;
}

const MONOGRAM_PALETTES = [
  "bg-[#f5dfcd] text-[#9b4d25] ring-[#f8ece2]",
  "bg-[#dce9dc] text-[#356149] ring-[#edf4ec]",
  "bg-[#dfe8f7] text-[#365a89] ring-[#edf2fa]",
  "bg-[#eee1f3] text-[#764d81] ring-[#f7eef9]",
  "bg-[#f4e8bd] text-[#8a6518] ring-[#fbf5de]",
] as const;

const getMonogram = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getPalette = (seed: string) => {
  const hash = Array.from(seed).reduce((total, character) => {
    return (total * 31 + character.charCodeAt(0)) >>> 0;
  }, 0);

  return MONOGRAM_PALETTES[hash % MONOGRAM_PALETTES.length];
};

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  rank,
  onSelect,
  isSelected = false,
}) => {
  const displayName = candidate.name?.trim() || "Candidate";
  const scoreValue = candidate.relevance_score ?? 75;
  const score = Number.isFinite(scoreValue)
    ? Math.round(Math.min(100, Math.max(0, scoreValue)))
    : 75;
  const displayRank = Math.max(1, Math.floor(rank ?? 1));
  const rankLabel = String(displayRank).padStart(2, "0");
  const skills = candidate.matched_skills?.filter(Boolean) ?? [];
  const visibleSkills = skills.slice(0, 5);
  const remainingSkills = skills.length - visibleSkills.length;
  const hasResume = Boolean(candidate.resume_url?.trim());
  const confidenceTone =
    score >= 85
      ? "bg-[#e7f3e8] text-[#2f6b44] ring-[#cce6d1]"
      : score >= 70
        ? "bg-[#e8effa] text-[#315e96] ring-[#d5e2f7]"
        : "bg-[#f6ede2] text-[#8a5a2c] ring-[#ead8c1]";

  return (
    <article
      className={`group relative isolate flex h-full flex-col overflow-hidden rounded-[1.75rem] border bg-[#fffdfa] p-4 shadow-[0_14px_34px_rgba(87,63,40,0.09)] transition duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(87,63,40,0.14)] focus-within:ring-2 focus-within:ring-[#bf6e3c]/35 focus-within:ring-offset-2 ${
        isSelected
          ? "border-[#bf6e3c]/55 ring-1 ring-[#bf6e3c]/20"
          : "border-[#eadfd0] hover:border-[#d8b69b]"
      }`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-[#f7e9dc] blur-2xl transition duration-500 group-hover:scale-125"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-12 -left-10 h-28 w-28 rounded-full bg-[#eee6d5]/75 blur-2xl"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#eadfce] bg-[#fff9f1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#795c45]">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#32261e] font-mono text-[10px] tracking-normal text-[#fffaf3]">
            {rankLabel}
          </span>
          Rank
        </div>

        <div
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset ${confidenceTone}`}
          aria-label={`${score}% relevance confidence`}
        >
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          <span>{score}% confidence</span>
        </div>
      </div>

      <div className="relative mt-5 flex items-center gap-3.5">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.15rem] text-base font-black tracking-tight ring-4 shadow-sm ${getPalette(`${displayName}-${candidate.candidate_id}`)}`}
          aria-hidden="true"
        >
          {getMonogram(displayName)}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a1795c]">
            Curated candidate
          </p>
          <h4 className="mt-0.5 truncate font-serif text-xl font-bold leading-tight tracking-[-0.025em] text-[#2d241e]">
            {displayName}
          </h4>
        </div>
      </div>

      <div className="relative mt-4 rounded-2xl border border-[#efe4d7] bg-[#fffaf4]/80 p-3.5">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#906c50]">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Profile note
        </div>
        <p className="line-clamp-3 text-[13px] leading-5 text-[#64534a]">
          {candidate.summary?.trim() || "A concise candidate summary will appear here when it is available."}
        </p>
      </div>

      <section className="relative mt-4" aria-labelledby={`skills-${candidate.candidate_id}`}>
        <div className="flex items-center justify-between gap-3">
          <h5
            id={`skills-${candidate.candidate_id}`}
            className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#906c50]"
          >
            Signal skills
          </h5>
          {skills.length > 0 && (
            <span className="text-[10px] font-medium text-[#a27c5f]">{skills.length} matched</span>
          )}
        </div>
        {visibleSkills.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {visibleSkills.map((skill, index) => (
              <span
                key={`${skill}-${index}`}
                className="rounded-full border border-[#e7d7c8] bg-[#fffdf9] px-2.5 py-1 text-[10px] font-semibold text-[#604b3c] shadow-[0_1px_0_rgba(255,255,255,0.9)]"
              >
                {skill}
              </span>
            ))}
            {remainingSkills > 0 && (
              <span className="rounded-full bg-[#f2e6d9] px-2.5 py-1 text-[10px] font-bold text-[#875e42]">
                +{remainingSkills}
              </span>
            )}
          </div>
        ) : (
          <p className="mt-2 text-xs italic text-[#9a8270]">No matched skills recorded yet.</p>
        )}
      </section>

      <dl className="relative mt-4 grid gap-2 border-t border-dashed border-[#e7d9cb] pt-3 text-xs">
        <div className="flex min-w-0 items-center gap-2 text-[#705d51]">
          <Mail className="h-3.5 w-3.5 shrink-0 text-[#a17252]" aria-hidden="true" />
          <dt className="sr-only">Email</dt>
          <dd className="min-w-0 truncate">{candidate.email?.trim() || "Email not provided"}</dd>
        </div>
        <div className="flex min-w-0 items-center gap-2 text-[#705d51]">
          <Hash className="h-3.5 w-3.5 shrink-0 text-[#a17252]" aria-hidden="true" />
          <dt className="sr-only">Roll number</dt>
          <dd className="min-w-0 truncate">{candidate.roll_no?.trim() || `Profile ID · ${candidate.candidate_id}`}</dd>
        </div>
      </dl>

      <div className="relative mt-5 flex gap-2">
        {onSelect && (
          <button
            type="button"
            onClick={() => onSelect(candidate)}
            aria-label={`View ${displayName}'s profile details`}
            className={`inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bf6e3c] focus-visible:ring-offset-2 ${
              isSelected
                ? "border-[#476d53] bg-[#e8f1e9] text-[#315b3d] hover:bg-[#dcebdd]"
                : "border-[#dec5b1] bg-[#fffaf4] text-[#76533b] hover:border-[#b98561] hover:bg-[#f9eee4]"
            }`}
          >
            {isSelected ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />}
            <span>{isSelected ? "Viewing" : "Details"}</span>
          </button>
        )}

        {hasResume ? (
          <a
            href={candidate.resume_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${displayName}'s resume in a new tab`}
            className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#32261e] px-3 py-2.5 text-xs font-bold text-[#fffaf3] shadow-[0_7px_16px_rgba(50,38,30,0.16)] transition hover:bg-[#4a3528] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bf6e3c] focus-visible:ring-offset-2"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Open resume</span>
            <ExternalLink className="h-3 w-3 opacity-75" aria-hidden="true" />
          </a>
        ) : (
          <span
            className="inline-flex min-w-0 flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-xl bg-[#e8ded5] px-3 py-2.5 text-xs font-bold text-[#947d6b]"
            aria-disabled="true"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Resume unavailable</span>
          </span>
        )}
      </div>
    </article>
  );
};
