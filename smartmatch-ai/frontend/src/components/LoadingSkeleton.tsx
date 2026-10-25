import React from 'react';

export const CardSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => {
  return (
    <div className="glass-card rounded-2xl p-6 animate-pulse space-y-4">
      <div className="h-6 bg-slate-800/80 rounded-lg w-1/3" />
      <div className="h-4 bg-slate-800/50 rounded w-2/3" />
      <div className="space-y-2 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-10 bg-slate-800/40 rounded-xl w-full" />
        ))}
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC<{ cols?: number; rows?: number }> = ({
  cols = 4,
  rows = 5,
}) => {
  return (
    <div className="glass-card rounded-2xl p-4 overflow-hidden animate-pulse">
      <div className="flex gap-4 pb-4 border-b border-slate-800">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-800 rounded flex-1" />
        ))}
      </div>
      <div className="space-y-3 pt-4">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-8 bg-slate-850/60 rounded-lg flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const GaugeSkeleton: React.FC = () => {
  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center animate-pulse">
      <div className="w-40 h-24 bg-slate-800/50 rounded-t-full" />
      <div className="h-5 bg-slate-800/60 rounded w-24 mt-4" />
      <div className="h-3 bg-slate-800/40 rounded w-36 mt-2" />
    </div>
  );
};
