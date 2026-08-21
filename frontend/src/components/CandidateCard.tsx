"use client";

import React from "react";
import { ExternalLink, FileText, Mail, Hash, Sparkles } from "lucide-react";

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
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    } else if (score >= 70) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    } else {
      return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="glass-card rounded-xl p-4 flex flex-col justify-between hover:border-blue-200 transition-all duration-200">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div>
            <h4 className="font-semibold text-base text-slate-900">
              {candidate.name || "Candidate"}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
              <span className="bg-white/55 px-1.5 py-0.5 rounded font-mono text-slate-700 border border-white/75">
                {candidate.candidate_id}
              </span>
              {candidate.roll_no && (
                <span className="flex items-center gap-0.5">
                  <Hash className="w-3 h-3" /> {candidate.roll_no}
                </span>
              )}
            </div>
          </div>

          <div className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${getScoreBadge()}`}>
            <Sparkles className="w-3 h-3" />
            <span>{score}% fit</span>
          </div>
        </div>

        {candidate.email && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3 truncate">
            <Mail className="w-3 h-3 shrink-0" />
            <span className="truncate">{candidate.email}</span>
          </div>
        )}

        {candidate.summary && (
          <p className="text-xs text-slate-600 line-clamp-3 mb-3 leading-relaxed bg-white/35 border border-white/70 rounded-lg p-2">
            {candidate.summary}
          </p>
        )}

        {candidate.matched_skills && candidate.matched_skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {candidate.matched_skills.slice(0, 5).map((skill, idx) => (
              <span
                key={idx}
                className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 border border-blue-400/15"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      <a
        href={candidate.resume_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium bg-slate-900/90 text-white rounded-lg hover:bg-slate-900 transition shadow-sm"
      >
        <FileText className="w-3.5 h-3.5" />
        <span>View resume</span>
        <ExternalLink className="w-3 h-3 opacity-80" />
      </a>
    </div>
  );
};
