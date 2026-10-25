import React from 'react';
import { Info } from 'lucide-react';

interface Props {
  className?: string;
  compact?: boolean;
}

export const ExplainabilityBanner: React.FC<Props> = ({ className = '', compact = false }) => {
  return (
    <div
      className={`rounded-xl border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-md p-4 text-indigo-200/90 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 mt-0.5 shrink-0">
          <Info className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
            Explainable AI Transparency Note
          </h4>
          <p className={`text-xs text-indigo-200/80 leading-relaxed ${compact ? 'mt-0.5 line-clamp-2' : 'mt-1'}`}>
            <span className="font-medium text-white">Skill-Alignment Indicator:</span> This score reflects how closely your stated skills and proficiencies match the job’s stated requirements using fuzzy inference. It is <em>not a hiring probability or outcome prediction</em>, and does not evaluate interview factors, soft skills, or competitive pool dynamics.
          </p>
        </div>
      </div>
    </div>
  );
};
