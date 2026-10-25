import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Sparkles, Tag, Edit3 } from 'lucide-react';

interface MatchStatusBadgeProps {
  status: 'matched' | 'weak' | 'missing' | string;
  size?: 'sm' | 'md';
}

export const MatchStatusBadge: React.FC<MatchStatusBadgeProps> = ({ status, size = 'md' }) => {
  const isSm = size === 'sm';
  const padding = isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  if (status === 'matched') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 ${padding}`}
      >
        <CheckCircle2 className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>Matched</span>
      </span>
    );
  }

  if (status === 'weak') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 ${padding}`}
      >
        <AlertTriangle className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>Weak Match</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 ${padding}`}
    >
      <XCircle className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>Missing</span>
    </span>
  );
};

interface SourceBadgeProps {
  source: 'explicit' | 'synonym' | 'manual' | 'resume_extracted' | string;
  evidence?: string;
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({ source, evidence }) => {
  if (source === 'explicit') {
    return (
      <span
        title={evidence ? `Matched exact term: "${evidence}"` : 'Exact term mention in document'}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/15 text-blue-300 border border-blue-500/20"
      >
        <Tag className="w-3 h-3" />
        <span>explicit</span>
        {evidence && <span className="text-blue-400/60 font-mono">({evidence})</span>}
      </span>
    );
  }

  if (source === 'synonym') {
    return (
      <span
        title={evidence ? `Matched via synonym/alias: "${evidence}"` : 'Normalized from known synonym'}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/20"
      >
        <Sparkles className="w-3 h-3" />
        <span>synonym</span>
        {evidence && <span className="text-purple-400/60 font-mono">({evidence})</span>}
      </span>
    );
  }

  if (source === 'resume_extracted') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
        <Sparkles className="w-3 h-3" />
        <span>resume extracted</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-700/40 text-slate-300 border border-slate-600/30">
      <Edit3 className="w-3 h-3" />
      <span>manual entry</span>
    </span>
  );
};
