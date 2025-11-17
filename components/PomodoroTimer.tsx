import React from 'react';
import { PlayIcon, PauseIcon, ArrowPathIcon } from './icons';

interface PomodoroTimerProps {
    mode: 'work' | 'shortBreak' | 'longBreak';
    secondsLeft: number;
    isActive: boolean;
    pomodoros: number;
    onToggle: () => void;
    onReset: () => void;
    audioRef: React.RefObject<HTMLAudioElement>;
}

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
    mode,
    secondsLeft,
    isActive,
    pomodoros,
    onToggle,
    onReset,
    audioRef,
}) => {
    const WORK_DURATION = 25 * 60;
    const SHORT_BREAK_DURATION = 5 * 60;
    const LONG_BREAK_DURATION = 15 * 60;

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const totalDuration = mode === 'work' ? WORK_DURATION : (mode === 'shortBreak' ? SHORT_BREAK_DURATION : LONG_BREAK_DURATION);
    const progressPercentage = (secondsLeft / totalDuration) * 100;
    
    const modeConfig = {
        work: {
            label: 'Foco',
            bg: 'bg-blue-100 dark:bg-blue-900/50',
            progressBg: 'bg-blue-500 dark:bg-blue-400',
        },
        shortBreak: {
            label: 'Pausa',
            bg: 'bg-green-100 dark:bg-green-900/50',
            progressBg: 'bg-green-500 dark:bg-green-400',
        },
        longBreak: {
            label: 'Descanso',
            bg: 'bg-emerald-100 dark:bg-emerald-900/50',
            progressBg: 'bg-emerald-500 dark:bg-emerald-400',
        },
    };

    return (
        <div className={`flex items-center gap-3 text-[var(--text-primary)] p-2 rounded-lg ${modeConfig[mode].bg} w-52`}>
             <audio ref={audioRef} src="https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg" preload="auto"></audio>
            <div className="flex-grow">
                <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-xs uppercase">{modeConfig[mode].label}</span>
                     <span className="text-xs font-mono">{pomodoros}/4</span>
                </div>
                 <div className="w-full bg-slate-300/50 dark:bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                    <div className={`${modeConfig[mode].progressBg} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${progressPercentage}%` }}></div>
                </div>
                <div className="font-bold text-lg leading-tight mt-1">{formatTime(secondsLeft)}</div>
            </div>
            <div className="flex flex-col gap-1">
                <button onClick={onToggle} className="p-1.5 rounded-full bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40">
                    {isActive ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                </button>
                <button onClick={onReset} className="p-1.5 rounded-full bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40">
                    <ArrowPathIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default PomodoroTimer;
