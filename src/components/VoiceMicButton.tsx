import React from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface VoiceMicButtonProps {
  isListening: boolean;
  onToggle: () => void;
  audioLevel?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  tooltip?: string;
}

export const VoiceMicButton: React.FC<VoiceMicButtonProps> = ({
  isListening,
  onToggle,
  audioLevel = 0,
  className = '',
  size = 'md',
  tooltip
}) => {
  const sizeClasses = {
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-sm',
    lg: 'p-3 text-base'
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  // Generate 4 dynamic visualizer bar heights based on audioLevel
  const bar1 = Math.max(4, Math.min(18, Math.round(4 + audioLevel * 14)));
  const bar2 = Math.max(6, Math.min(22, Math.round(6 + audioLevel * 20)));
  const bar3 = Math.max(5, Math.min(19, Math.round(5 + audioLevel * 16)));
  const bar4 = Math.max(3, Math.min(14, Math.round(3 + audioLevel * 12)));

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        className={`rounded-xl transition-all relative flex items-center justify-center ${sizeClasses[size]} ${
          isListening
            ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-200 ring-2 ring-rose-300 ring-offset-1 animate-pulse'
            : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200'
        } ${className}`}
        title={
          tooltip || (isListening ? 'Listening (Click to stop)' : 'Click to speak with microphone')
        }
      >
        {isListening ? (
          <div className="flex items-center gap-1">
            <MicOff className={iconSizes[size]} />
            {/* Live Audio Frequency Bars */}
            <div className="flex items-center gap-0.5 h-4 px-0.5">
              <span
                className="w-0.5 bg-white rounded-full transition-all duration-75"
                style={{ height: `${bar1}px` }}
              />
              <span
                className="w-0.5 bg-white rounded-full transition-all duration-75"
                style={{ height: `${bar2}px` }}
              />
              <span
                className="w-0.5 bg-white rounded-full transition-all duration-75"
                style={{ height: `${bar3}px` }}
              />
              <span
                className="w-0.5 bg-white rounded-full transition-all duration-75"
                style={{ height: `${bar4}px` }}
              />
            </div>
          </div>
        ) : (
          <Mic className={iconSizes[size]} />
        )}
      </button>
    </div>
  );
};
