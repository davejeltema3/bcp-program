interface ProgressBarProps {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = (current / total) * 100;

  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-slate-900 z-50">
      <div
        className="h-full bg-blue-500 progress-bar"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
