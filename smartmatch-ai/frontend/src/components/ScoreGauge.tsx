import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ScoreGaugeProps {
  score: number; // 0 to 100
  size?: number;
  label?: string;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  size = 220,
  label = 'Skill Alignment Score',
}) => {
  const clampedScore = Math.min(100, Math.max(0, score));

  // Gauge sections (semi-circle from 180 to 0 degrees)
  // Range 0-50: Low (#f43f5e / #e11d48)
  // Range 50-75: Moderate (#f59e0b / #d97706)
  // Range 75-100: High (#10b981 / #059669)
  const backgroundBands = [
    { name: 'Low (0-50)', value: 50, color: '#f43f5e33' },
    { name: 'Moderate (50-75)', value: 25, color: '#f59e0b33' },
    { name: 'High (75-100)', value: 25, color: '#10b98133' },
  ];

  // Active score arc
  const activeColor =
    clampedScore >= 75
      ? '#10b981'
      : clampedScore >= 50
      ? '#f59e0b'
      : '#f43f5e';

  const scoreData = [
    { name: 'Score', value: clampedScore, color: activeColor },
    { name: 'Remaining', value: 100 - clampedScore, color: 'transparent' },
  ];

  return (
    <div className="flex flex-col items-center justify-center relative p-3">
      <div style={{ width: size, height: size * 0.62 }} className="relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {/* Background color bands */}
            <Pie
              data={backgroundBands}
              cx="50%"
              cy="90%"
              startAngle={180}
              endAngle={0}
              innerRadius="72%"
              outerRadius="95%"
              dataKey="value"
              stroke="none"
              isAnimationActive={false}
            >
              {backgroundBands.map((entry, index) => (
                <Cell key={`bg-cell-${index}`} fill={entry.color} />
              ))}
            </Pie>

            {/* Foreground score progress */}
            <Pie
              data={scoreData}
              cx="50%"
              cy="90%"
              startAngle={180}
              endAngle={0}
              innerRadius="70%"
              outerRadius="97%"
              dataKey="value"
              stroke="none"
              animationDuration={1000}
              animationEasing="ease-out"
            >
              <Cell fill={activeColor} />
              <Cell fill="transparent" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center score readout */}
        <div className="absolute bottom-2 flex flex-col items-center text-center">
          <span className="text-3xl font-extrabold tracking-tight text-white font-mono drop-shadow-md">
            {clampedScore.toFixed(1)}
            <span className="text-base text-slate-400 font-sans font-normal ml-0.5">/100</span>
          </span>
          <span
            className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 border"
            style={{
              color: activeColor,
              borderColor: `${activeColor}40`,
              backgroundColor: `${activeColor}15`,
            }}
          >
            {clampedScore >= 75 ? 'Strong Alignment' : clampedScore >= 50 ? 'Moderate Alignment' : 'Substantial Gap'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400 font-medium">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500/60" /> 0-50 Low
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500/60" /> 50-75 Moderate
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500/60" /> 75-100 Strong
        </span>
      </div>

      {label && <p className="text-xs text-slate-400 mt-1 font-medium">{label}</p>}
    </div>
  );
};
