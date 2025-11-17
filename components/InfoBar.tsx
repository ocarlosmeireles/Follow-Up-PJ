import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ClockIcon, SunIcon, CloudIcon, ArrowPathIcon } from './icons';
import { PlayIcon, PauseIcon } from './icons'; // Ícones para o Pomodoro

// Tipos para os dados das APIs
type WeatherData = {
  temperature: number;
  weatherCode: number;
  city: string;
};

// Mapeamento de códigos de tempo do Open-Meteo para ícones
const getWeatherIcon = (code: number) => {
    switch (code) {
        case 0: return <SunIcon className="w-8 h-8 text-yellow-500" />; // Clear sky
        case 1:
        case 2:
        case 3: return <CloudIcon className="w-8 h-8 text-slate-400" />; // Mainly clear, partly cloudy, and overcast
        default: return <CloudIcon className="w-8 h-8 text-slate-400" />;
    }
};

// --- COMPONENTE POMODORO ---
const PomodoroTimer: React.FC = () => {
    const WORK_DURATION = 25 * 60;
    const SHORT_BREAK_DURATION = 5 * 60;
    const LONG_BREAK_DURATION = 15 * 60;

    const [mode, setMode] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
    const [secondsLeft, setSecondsLeft] = useState(WORK_DURATION);
    const [isActive, setIsActive] = useState(false);
    const [pomodoros, setPomodoros] = useState(0);

    const audioRef = useRef<HTMLAudioElement>(null);

    // Request notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        let interval: number | null = null;

        if (isActive && secondsLeft > 0) {
            interval = window.setInterval(() => {
                setSecondsLeft(prev => prev - 1);
            }, 1000);
        } else if (isActive && secondsLeft === 0) { // Check for isActive to prevent re-triggering
            audioRef.current?.play();
            setIsActive(false); // Pause the timer

            if (mode === 'work') {
                const newPomodoros = pomodoros + 1;
                setPomodoros(newPomodoros);
                const nextMode = newPomodoros % 4 === 0 ? 'longBreak' : 'shortBreak';
                setMode(nextMode);
                const nextDuration = nextMode === 'longBreak' ? LONG_BREAK_DURATION : SHORT_BREAK_DURATION;
                setSecondsLeft(nextDuration);
                
                if (Notification.permission === 'granted') {
                    new Notification('Faça uma pausa!', { body: `Descanse por ${nextDuration / 60} minutos.` });
                }
            } else { // It was a break
                setMode('work');
                setSecondsLeft(WORK_DURATION);
                if (Notification.permission === 'granted') {
                    new Notification('Hora de focar!', { body: `Iniciando ${WORK_DURATION / 60} minutos de trabalho.` });
                }
            }
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, secondsLeft, mode, pomodoros]);

    const toggleTimer = () => {
        setIsActive(!isActive);
    };

    const resetTimer = () => {
        setIsActive(false);
        setMode('work');
        setSecondsLeft(WORK_DURATION);
        setPomodoros(0);
    };

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
            progressBg: 'bg-blue-500',
        },
        shortBreak: {
            label: 'Pausa Curta',
            bg: 'bg-green-100 dark:bg-green-900/50',
            progressBg: 'bg-green-500',
        },
        longBreak: {
            label: 'Pausa Longa',
            bg: 'bg-emerald-100 dark:bg-emerald-900/50',
            progressBg: 'bg-emerald-500',
        },
    };

    return (
        <div className={`flex items-center gap-4 text-[var(--text-primary)] p-2 rounded-lg ${modeConfig[mode].bg}`}>
             <audio ref={audioRef} src="https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg" preload="auto"></audio>
            <div className="flex-grow">
                <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-xs uppercase">{modeConfig[mode].label}</span>
                     <span className="text-xs font-mono">{pomodoros}/4</span>
                </div>
                 <div className="w-full bg-slate-300/50 dark:bg-slate-700/50 rounded-full h-2 overflow-hidden">
                    <div className={`${modeConfig[mode].progressBg} h-2 rounded-full transition-all duration-500`} style={{ width: `${progressPercentage}%` }}></div>
                </div>
                <div className="font-bold text-lg leading-tight mt-1">{formatTime(secondsLeft)}</div>
            </div>
            <div className="flex flex-col gap-1">
                <button onClick={toggleTimer} className="p-2 rounded-full bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40">
                    {isActive ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                </button>
                <button onClick={resetTimer} className="p-2 rounded-full bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40">
                    <ArrowPathIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};


const InfoBar: React.FC = () => {
    const [time, setTime] = useState(new Date());
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Efeito para o relógio
    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    // Efeito para buscar dados das APIs
    useEffect(() => {
        // --- Buscar Clima ---
        const fetchWeather = () => {
            if (!navigator.geolocation) {
                setError('Geolocalização não é suportada pelo seu navegador.');
                return;
            }

            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
                    if (!weatherResponse.ok) throw new Error('Falha ao buscar previsão do tempo');
                    const weatherData = await weatherResponse.json();
                    
                    let cityName = 'Sua Localização';
                    try {
                        const geoResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        if (geoResponse.ok) {
                            const geoData = await geoResponse.json();
                            cityName = geoData.address.city || geoData.address.town || 'Sua Localização';
                        }
                    } catch (geoError) {
                        console.error('Reverse geocoding failed, using default name.', geoError);
                    }
                    
                    setWeather({
                        temperature: Math.round(weatherData.current_weather.temperature),
                        weatherCode: weatherData.current_weather.weathercode,
                        city: cityName,
                    });
                } catch (e) {
                    console.error('Weather fetch error:', e);
                    setError('Clima indisponível');
                }
            }, () => {
                setError('Permissão de localização negada.');
            });
        };
        
        fetchWeather();
    }, []);

    return (
        <div className="bg-[var(--background-secondary)] p-3 rounded-xl border border-[var(--border-primary)] shadow-sm grid grid-cols-1 md:grid-cols-3 items-center gap-4 text-sm mb-6 animated-item">
            {/* Relógio */}
            <div className="flex items-center gap-3 text-[var(--text-primary)]">
                <ClockIcon className="w-6 h-6 text-[var(--text-accent)]"/>
                <div>
                    <p className="font-bold text-lg leading-tight">{time.toLocaleTimeString('pt-BR')}</p>
                    <p className="text-xs text-[var(--text-secondary)] capitalize">{time.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}</p>
                </div>
            </div>

            {/* Pomodoro */}
            <PomodoroTimer />
            
            {/* Clima */}
            <div className="flex items-center justify-start md:justify-end gap-3 text-[var(--text-primary)]">
                {weather ? (
                    <>
                        {getWeatherIcon(weather.weatherCode)}
                        <div>
                            <p className="font-bold text-lg leading-tight">{weather.temperature}°C</p>
                            <p className="text-xs text-[var(--text-secondary)]">{weather.city}</p>
                        </div>
                    </>
                ) : (
                    <div className="text-xs text-[var(--text-secondary)]">{error || 'Carregando clima...'}</div>
                )}
            </div>
        </div>
    );
};

export default InfoBar;