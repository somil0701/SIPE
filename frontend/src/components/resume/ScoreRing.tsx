interface ScoreRingProps {
  score: number;
  label: string;
  size?: 'sm' | 'lg';
}

export function ScoreRing({ score, label, size = 'lg' }: ScoreRingProps) {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score || 0)));
  const radius = size === 'lg' ? 52 : 38;
  const stroke = size === 'lg' ? 10 : 8;
  const dimension = size === 'lg' ? 132 : 100;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalizedScore / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: dimension, height: dimension }}>
      <svg className="-rotate-90" width={dimension} height={dimension} viewBox={`0 0 ${dimension} ${dimension}`}>
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted"
        />
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary transition-all duration-500"
        />
      </svg>
      <div className="absolute text-center">
        <div className={size === 'lg' ? 'text-3xl font-bold' : 'text-2xl font-bold'}>{normalizedScore}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
