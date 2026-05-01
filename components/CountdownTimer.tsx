'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  target: Date;
  label: string;
  onComplete?: () => void;
}

export default function CountdownTimer({ target, label, onComplete }: CountdownTimerProps) {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    const tick = () => {
      const total = Math.max(0, target.getTime() - Date.now());
      const seconds = Math.floor((total / 1000) % 60);
      const minutes = Math.floor((total / 1000 / 60) % 60);
      const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
      const days = Math.floor(total / (1000 * 60 * 60 * 24));
      setTime({ days, hours, minutes, seconds, total });

      if (total <= 0 && onComplete) {
        onComplete();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [target, onComplete]);

  if (time.total <= 0) return null;

  // Build compact time string: "2d 14h 32m 08s" or "14h 32m 08s" or "32m 08s"
  const parts: string[] = [];
  if (time.days > 0) parts.push(`${time.days}d`);
  if (time.hours > 0 || time.days > 0) parts.push(`${String(time.hours).padStart(2, '0')}h`);
  parts.push(`${String(time.minutes).padStart(2, '0')}m`);
  parts.push(`${String(time.seconds).padStart(2, '0')}s`);

  return (
    <div className="text-center">
      <span className="text-sm text-slate-400">{label} </span>
      <span className="text-green-400 font-mono font-bold text-lg tabular-nums">
        {parts.join(' ')}
      </span>
    </div>
  );
}
