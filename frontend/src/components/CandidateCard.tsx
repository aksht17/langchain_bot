"use client";

import React from "react";
import { ExternalLink, Award, FileText, Mail, Hash, Sparkles } from "lucide-react";

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
}

export const CandidateCard: React.FC<CandidateCardProps> = ({ candidate }) => {
  const score = candidate.relevance_score || 75;

  const getScoreBadge = () => {
    if (score >= 85) {
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
    } else if (score >= 70) {
      return "bg-cyan-500/20 text-cyan-400 border-cyan-500/40";
    } else {
      return "bg-indigo-500/20 text-indigo-400 border-indigo-500/40";
    }
  };

  return (
    <div className="glass-card rounded-xl p-4 border border-white/10 flex flex-col justify-between hover:border-indigo-500/50 group transition-all duration-300">
      <div>
        {/* Header: Name & Match Score */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div>
            <h4 className="font-bold text-base text-gray-100 group-hover:text-indigo-300 transition-colors">
              {candidate.name || "Candidate"}
            </h4>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
              <span className="bg-white/5 px-1.5 py-0.5 rounded font-mono text-gray-300">
                {candidate.candidate_id}
              </span>
              {candidate.roll_no && (
                <span className="flex items-center gap-0.5">
                  <Hash className="w-3 h-3 opacity-60" /> {candidate.roll_no}
                </span>
              )}
            </div>
          </div>

          <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${getScoreBadge()}`}>
            <Sparkles className="w-3 h-3" />
            <span>{score}% Fit</span>
          </div>
        </div>

        {/* Email if available */}
        {candidate.email && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3 truncate">
            <Mail className="w-3 h-3 text-gray-500 shrink-0" />
            <span className="truncate">{candidate.email}</span>
          </div>
        )}

        {/* Summary Snippet */}
        {candidate.summary && (
          <p className="text-xs text-gray-300 line-clamp-3 mb-3 leading-relaxed bg-black/20 p-2 rounded-lg border border-white/5">
            {candidate.summary}
          </p>
        )}

        {/* Matched Skill Tags */}
        {candidate.matched_skills && candidate.matched_skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {candidate.matched_skills.slice(0, 5).map((skill, idx) => (
              <span
                key={idx}
                className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action: Direct Resume Link */}
      <a
        href={candidate.resume_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 hover:text-white rounded-lg border border-indigo-500/30 hover:border-indigo-500/60 transition shadow-sm"
      >
        <FileText className="w-3.5 h-3.5" />
        <span>View Verified Resume</span>
        <ExternalLink className="w-3 h-3 opacity-70 ml-0.5" />
      </a>
    </div>
  );
};
