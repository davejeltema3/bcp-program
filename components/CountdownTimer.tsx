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

  const units = [
    { value: time.days, label: 'days' },
    { value: time.hours, label: 'hours' },
    { value: time.minutes, label: 'min' },
    { value: time.seconds, label: 'sec' },
  ];

  return (
    <div className="text-center">
      <div className="text-sm text-slate-400 mb-3">{label}</div>
      <div className="flex items-center justify-center gap-3">
        {units.map((unit, i) => (
          <div key={unit.label} className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div className="bg-slate-800 border border-slate-700 rounded-lg w-16 h-16 flex items-center justify-center">
                <span className="text-2xl font-bold text-white font-mono">
                  {String(unit.value).padStart(2, '0')}
                </span>
              </div>
              <span className="text-xs text-slate-500 mt-1">{unit.label}</span>
            </div>
            {i < units.length - 1 && (
              <span className="text-slate-600 text-xl font-bold mb-4">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
